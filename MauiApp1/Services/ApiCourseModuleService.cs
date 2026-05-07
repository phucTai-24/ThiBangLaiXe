using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MauiApp1.Models.CourseModule;

namespace MauiApp1.Services;

public sealed class ApiCourseModuleService : ICourseModuleService
{
    private readonly HttpClient _httpClient;
    private readonly ITokenStore _tokenStore;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiCourseModuleService(HttpClient httpClient, ITokenStore tokenStore)
    {
        _httpClient = httpClient;
        _tokenStore = tokenStore;
    }

    public async Task<List<Course>> GetCoursesAsync(string? search = null, string? licenseType = null, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var endpoint = "api/v1/courses?page=1&pageSize=100";
        var wrapped = await GetAsync<ApiPagedEnvelope<CourseDto>>(endpoint, cancellationToken) ?? new ApiPagedEnvelope<CourseDto>();

        var query = wrapped.Data.Items.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => (x.TenKhoaHoc ?? string.Empty).Contains(search, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(licenseType))
            query = query.Where(x => string.Equals(x.LoaiBangLai, licenseType, StringComparison.OrdinalIgnoreCase));

        return query.Select(MapCourse).ToList();
    }

    public async Task<Course?> GetCourseByIdAsync(long courseId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var dto = await GetAsync<ApiDataEnvelope<CourseDto>>($"api/v1/courses/{courseId}", cancellationToken);
        return dto?.Data is null ? null : MapCourse(dto.Data);
    }

    public async Task<List<DrivingClass>> GetClassesByCourseIdAsync(long courseId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiDataEnvelope<List<ClassDto>>>($"api/v1/courses/{courseId}/classes", cancellationToken);
        return (wrapped?.Data ?? new List<ClassDto>()).Select(MapClass).ToList();
    }

    public async Task<List<DrivingClass>> GetOpenClassesAsync(CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var courses = await GetCoursesAsync(cancellationToken: cancellationToken);
        var result = new List<DrivingClass>();
        foreach (var course in courses)
        {
            var classes = await GetClassesByCourseIdAsync(course.Id, cancellationToken);
            result.AddRange(classes);
        }

        return result
            .Where(x => x.Status == ClassStatus.Open || x.AvailableSlots > 0)
            .OrderBy(x => x.StartDate)
            .ToList();
    }

    public async Task<DrivingClass?> GetClassByIdAsync(long classId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var classes = await GetOpenClassesAsync(cancellationToken);
        return classes.FirstOrDefault(x => x.Id == classId);
    }

    public async Task<List<StudySchedule>> GetMySchedulesAsync(CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiDataEnvelope<List<ScheduleDto>>>("api/students/me/schedules", cancellationToken);
        var items = wrapped?.Data ?? new List<ScheduleDto>();
        return items.Select(x => new StudySchedule
        {
            Id = x.Id,
            ClassId = x.ClassId,
            Date = x.Date,
            StartTime = x.StartTime ?? string.Empty,
            EndTime = x.EndTime ?? string.Empty,
            Title = x.Title ?? string.Empty,
            Content = x.Content ?? string.Empty,
            TeacherName = x.TeacherName,
            Location = x.Location ?? string.Empty,
            Status = x.Status ?? string.Empty
        }).ToList();
    }

    public async Task<StudentRegistration> CreateRegistrationAsync(CreateRegistrationRequest request, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var response = await _httpClient.PostAsJsonAsync("api/v1/course-registrations", new
        {
            courseId = request.CourseId,
            classId = request.ClassId,
            ghiChu = $"Đăng ký từ mobile - {request.FullName} - {request.PhoneNumber}"
        }, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(ExtractApiErrorMessage(body, "Tạo đăng ký thất bại."));
        }

        var wrapped = await response.Content.ReadFromJsonAsync<ApiDataEnvelope<RegistrationDto>>(JsonOptions, cancellationToken);
        if (wrapped?.Data is null) throw new InvalidOperationException("API trả về đăng ký rỗng.");

        return MapRegistration(wrapped.Data);
    }

    public async Task<StudentRegistration?> GetRegistrationByIdAsync(long registrationId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiPagedEnvelope<RegistrationDto>>("api/v1/my/course-registrations?page=1&pageSize=100", cancellationToken);
        var found = wrapped?.Data.Items.FirstOrDefault(x => x.RegistrationId == registrationId);
        return found is null ? null : MapRegistration(found);
    }

    public async Task<StudentRegistration?> FindMyRegistrationAsync(long courseId, long classId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiPagedEnvelope<RegistrationDto>>("api/v1/my/course-registrations?page=1&pageSize=100", cancellationToken);
        var found = wrapped?.Data.Items
            .OrderByDescending(x => x.NgayDangKy)
            .FirstOrDefault(x => x.CourseId == courseId && (x.ClassId ?? 0) == classId);
        return found is null ? null : MapRegistration(found);
    }

    public async Task<StudentRegistration?> FindMyRegistrationByCourseAsync(long courseId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiPagedEnvelope<RegistrationDto>>("api/v1/my/course-registrations?page=1&pageSize=100", cancellationToken);
        var found = wrapped?.Data.Items
            .OrderByDescending(x => ParseRegistrationStatus(x.TrangThai) == RegistrationStatus.Confirmed)
            .ThenByDescending(x => x.NgayDangKy)
            .FirstOrDefault(x => x.CourseId == courseId);
        return found is null ? null : MapRegistration(found);
    }

    public async Task<List<StudentRegistration>> GetMyRegistrationsAsync(CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiPagedEnvelope<RegistrationDto>>("api/v1/my/course-registrations?page=1&pageSize=100", cancellationToken);
        return (wrapped?.Data.Items ?? new List<RegistrationDto>())
            .OrderByDescending(x => x.NgayDangKy)
            .Select(MapRegistration)
            .ToList();
    }

    public async Task<Payment> CreateVnPayPaymentUrlAsync(long registrationId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var response = await _httpClient.PostAsJsonAsync("api/v1/payments/vnpay/create-order", new { registrationId }, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(ExtractApiErrorMessage(body, "Tạo URL thanh toán thất bại."));
        }

        var wrapped = await response.Content.ReadFromJsonAsync<ApiDataEnvelope<VnPayCreateOrderDto>>(JsonOptions, cancellationToken);
        if (wrapped?.Data is null) throw new InvalidOperationException("API trả về payment rỗng.");

        return new Payment
        {
            Id = wrapped.Data.ReceiptId,
            RegistrationId = registrationId,
            Amount = wrapped.Data.Amount,
            Method = "VNPAY",
            TransactionCode = wrapped.Data.TransactionRef ?? string.Empty,
            Status = ParsePaymentStatus(wrapped.Data.PaymentStatus),
            PaymentUrl = wrapped.Data.OrderUrl ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<Payment> GetPaymentStatusAsync(long paymentId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        var wrapped = await GetAsync<ApiDataEnvelope<PaymentDto>>($"api/v1/payments/vnpay/receipts/{paymentId}/status", cancellationToken);
        if (wrapped?.Data is null) throw new InvalidOperationException("Không lấy được trạng thái thanh toán.");
        return MapPayment(wrapped.Data);
    }

    public async Task<List<Payment>> GetMyPaymentsAsync(CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync(cancellationToken);
        return new List<Payment>();
    }

    private async Task<T?> GetAsync<T>(string endpoint, CancellationToken cancellationToken) where T : class
    {
        var response = await _httpClient.GetAsync(endpoint, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(content)) return null;
        return JsonSerializer.Deserialize<T>(content, JsonOptions);
    }

    private async Task AttachAuthHeaderAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var token = await _tokenStore.GetAccessTokenAsync();
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đã hết hạn.");

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static string ExtractApiErrorMessage(string responseBody, string fallback)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
            return fallback;

        try
        {
            var envelope = JsonSerializer.Deserialize<ApiErrorEnvelope>(responseBody, JsonOptions);
            var code = envelope?.Errors?.FirstOrDefault()?.Code;
            var detail = envelope?.Errors?.FirstOrDefault()?.Detail;

            if (string.Equals(code, "COURSE_ALREADY_REGISTERED", StringComparison.OrdinalIgnoreCase))
                return "Bạn đã đăng ký khóa học này rồi. Vui lòng vào mục thanh toán hoặc lịch sử đăng ký để tiếp tục.";

            if (string.Equals(code, "REGISTRATION_NOT_APPROVED", StringComparison.OrdinalIgnoreCase))
                return "Đăng ký của bạn chưa được duyệt. Vui lòng chờ trung tâm duyệt rồi mới thanh toán VNPAY.";

            if (!string.IsNullOrWhiteSpace(detail))
                return detail;

            if (!string.IsNullOrWhiteSpace(envelope?.Message))
                return envelope.Message!;

            return fallback;
        }
        catch
        {
            return fallback;
        }
    }

    private static Course MapCourse(CourseDto x) => new()
    {
        Id = x.CourseId,
        Name = x.TenKhoaHoc ?? string.Empty,
        LicenseType = x.LoaiBangLai ?? string.Empty,
        Description = x.MoTaNgan ?? string.Empty,
        TuitionFee = x.HocPhi,
        Duration = x.NgayBatDau.HasValue && x.NgayKetThuc.HasValue
            ? $"{(x.NgayKetThuc.Value.ToDateTime(TimeOnly.MinValue) - x.NgayBatDau.Value.ToDateTime(TimeOnly.MinValue)).Days} ngày"
            : string.Empty,
        TotalSessions = x.SoBuoiHoc,
        ThumbnailUrl = x.HinhAnh,
        Content = string.Empty,
        Conditions = string.Empty,
        RequiredDocuments = string.Empty,
        Status = ParseCourseStatus(x.TrangThai)
    };

    private static DrivingClass MapClass(ClassDto x) => new()
    {
        Id = x.ClassId,
        CourseId = 0,
        ClassCode = x.MaLop ?? string.Empty,
        Name = x.TenLop ?? string.Empty,
        StartDate = x.NgayBatDau?.ToDateTime(TimeOnly.MinValue) ?? DateTime.Today,
        EndDate = x.NgayKetThuc?.ToDateTime(TimeOnly.MinValue),
        ScheduleText = string.Join("; ", x.LichHoc.Select(s => $"T{s.ThuTrongTuan} {s.GioBatDau}-{s.GioKetThuc}")),
        Location = x.LichHoc.FirstOrDefault()?.DiaDiem ?? string.Empty,
        TeacherName = x.GiaoVien?.HoTen,
        MaxStudents = x.SiSoToiDa,
        CurrentStudents = x.SoLuongHienTai,
        AvailableSlots = Math.Max(0, x.SiSoToiDa - x.SoLuongHienTai),
        Status = ParseClassStatus(x.TrangThai)
    };

    private static StudentRegistration MapRegistration(RegistrationDto x) => new()
    {
        Id = x.RegistrationId,
        StudentId = x.StudentId,
        CourseId = x.CourseId,
        ClassId = x.ClassId ?? 0,
        FullName = string.Empty,
        PhoneNumber = string.Empty,
        Email = string.Empty,
        IdentityNumber = string.Empty,
        Address = string.Empty,
        RegistrationStatus = ParseRegistrationStatus(x.TrangThai),
        PaymentStatus = ParsePaymentStatus(x.PaymentStatus),
        TotalAmount = x.HocPhi,
        CreatedAt = x.NgayDangKy
    };

    private static Payment MapPayment(PaymentDto x) => new()
    {
        Id = x.Id,
        RegistrationId = x.RegistrationId,
        Amount = x.Amount,
        Method = x.Method ?? "VNPAY",
        TransactionCode = x.TransactionCode ?? string.Empty,
        Status = ParsePaymentStatus(x.Status),
        PaymentUrl = x.PaymentUrl ?? string.Empty,
        PaidAt = x.PaidAt,
        CreatedAt = x.CreatedAt
    };

    private static CourseStatus ParseCourseStatus(string? value) => (value ?? string.Empty).ToLowerInvariant() switch
    {
        "dangmodangky" or "open" => CourseStatus.Open,
        "daketthuc" or "closed" => CourseStatus.Closed,
        "full" => CourseStatus.Full,
        _ => CourseStatus.Upcoming
    };

    private static ClassStatus ParseClassStatus(string? value) => (value ?? string.Empty).ToLowerInvariant() switch
    {
        "dangmodangky" or "open" => ClassStatus.Open,
        "full" => ClassStatus.Full,
        "closed" => ClassStatus.Closed,
        "started" => ClassStatus.Started,
        "finished" => ClassStatus.Finished,
        _ => ClassStatus.Open
    };

    private static RegistrationStatus ParseRegistrationStatus(string? value) => NormalizeStatus(value) switch
    {
        "daduyet" or "duyet" or "approved" or "confirmed" or "xacnhan" or "daxacnhan" or "dangkythanhcong" => RegistrationStatus.Confirmed,
        "dahuy" or "huy" or "cancelled" or "canceled" or "rejected" or "tuchoi" => RegistrationStatus.Cancelled,
        _ => RegistrationStatus.PendingPayment
    };

    private static string NormalizeStatus(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return string.Concat(normalized.Where(char.IsLetterOrDigit));
    }

    private static PaymentStatus ParsePaymentStatus(string? value) => Enum.TryParse<PaymentStatus>(value, true, out var v) ? v : PaymentStatus.Unpaid;

    private sealed class ApiDataEnvelope<T>
    {
        public T? Data { get; set; }
    }

    private sealed class ApiListEnvelope<T>
    {
        public List<T> Data { get; set; } = new();
    }

    private sealed class ApiPagedEnvelope<T>
    {
        public PagedData<T> Data { get; set; } = new();
    }

    private sealed class PagedData<T>
    {
        public List<T> Items { get; set; } = new();
    }

    private sealed class ApiErrorEnvelope
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public List<ApiErrorItem>? Errors { get; set; }
    }

    private sealed class ApiErrorItem
    {
        public string? Code { get; set; }
        public string? Detail { get; set; }
    }

    private sealed class CourseDto
    {
        public long CourseId { get; set; }
        public string? MaKhoaHoc { get; set; }
        public string? TenKhoaHoc { get; set; }
        public string? LoaiBangLai { get; set; }
        public string? MoTaNgan { get; set; }
        public decimal HocPhi { get; set; }
        public int SoBuoiHoc { get; set; }
        public DateOnly? NgayBatDau { get; set; }
        public DateOnly? NgayKetThuc { get; set; }
        public string? TrangThai { get; set; }
        public string? HinhAnh { get; set; }
    }

    private sealed class ClassDto
    {
        public long ClassId { get; set; }
        public string? MaLop { get; set; }
        public string? TenLop { get; set; }
        public int SiSoToiDa { get; set; }
        public int SoLuongHienTai { get; set; }
        public DateOnly? NgayBatDau { get; set; }
        public DateOnly? NgayKetThuc { get; set; }
        public string? TrangThai { get; set; }
        public TeacherDto? GiaoVien { get; set; }
        public List<ScheduleItemDto> LichHoc { get; set; } = new();
    }

    private sealed class TeacherDto
    {
        public long TeacherId { get; set; }
        public string? HoTen { get; set; }
    }

    private sealed class ScheduleItemDto
    {
        public int ThuTrongTuan { get; set; }
        public string GioBatDau { get; set; } = string.Empty;
        public string GioKetThuc { get; set; } = string.Empty;
        public string? DiaDiem { get; set; }
    }

    private sealed class ScheduleDto
    {
        public long Id { get; set; }
        public long ClassId { get; set; }
        public DateTime Date { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? TeacherName { get; set; }
        public string? Location { get; set; }
        public string? Status { get; set; }
    }

    private sealed class RegistrationDto
    {
        public long RegistrationId { get; set; }
        public long StudentId { get; set; }
        public long CourseId { get; set; }
        public long? ClassId { get; set; }
        public string? TenKhoaHoc { get; set; }
        public string? LoaiBangLai { get; set; }
        public decimal HocPhi { get; set; }
        public DateTime NgayDangKy { get; set; }
        public string? TrangThai { get; set; }
        public string? PaymentStatus { get; set; }
    }

    private sealed class PaymentDto
    {
        public long Id { get; set; }
        public long RegistrationId { get; set; }
        public decimal Amount { get; set; }
        public string? Method { get; set; }
        public string? TransactionCode { get; set; }
        public string? Status { get; set; }
        public string? PaymentUrl { get; set; }
        public DateTime? PaidAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    private sealed class VnPayCreateOrderDto
    {
        public long ReceiptId { get; set; }
        public string? TransactionRef { get; set; }
        public decimal Amount { get; set; }
        public string? OrderUrl { get; set; }
        public string? PaymentStatus { get; set; }
    }
}

