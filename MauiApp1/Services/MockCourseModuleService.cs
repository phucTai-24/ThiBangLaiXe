using MauiApp1.Models.CourseModule;

namespace MauiApp1.Services;

public sealed class MockCourseModuleService : ICourseModuleService
{
    private readonly List<Course> _courses;
    private readonly List<DrivingClass> _classes;
    private readonly List<StudySchedule> _schedules;
    private readonly List<StudentRegistration> _registrations;
    private readonly List<Payment> _payments;

    public MockCourseModuleService()
    {
        _courses = BuildCourses();
        _classes = BuildClasses();
        _schedules = BuildSchedules();
        _registrations = new List<StudentRegistration>();
        _payments = new List<Payment>();
    }

    public Task<List<Course>> GetCoursesAsync(string? search = null, string? licenseType = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var query = _courses.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => x.Name.Contains(search, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(licenseType))
            query = query.Where(x => string.Equals(x.LicenseType, licenseType, StringComparison.OrdinalIgnoreCase));

        return Task.FromResult(query.ToList());
    }

    public Task<Course?> GetCourseByIdAsync(long courseId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_courses.FirstOrDefault(x => x.Id == courseId));
    }

    public Task<List<DrivingClass>> GetClassesByCourseIdAsync(long courseId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_classes.Where(x => x.CourseId == courseId).OrderBy(x => x.StartDate).ToList());
    }

    public Task<List<DrivingClass>> GetOpenClassesAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_classes.Where(x => x.Status == ClassStatus.Open).OrderBy(x => x.StartDate).ToList());
    }

    public Task<DrivingClass?> GetClassByIdAsync(long classId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_classes.FirstOrDefault(x => x.Id == classId));
    }

    public Task<List<StudySchedule>> GetMySchedulesAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_schedules.OrderBy(x => x.Date).ThenBy(x => x.StartTime).ToList());
    }

    public Task<StudentRegistration> CreateRegistrationAsync(CreateRegistrationRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var selectedClass = _classes.FirstOrDefault(x => x.Id == request.ClassId);
        if (selectedClass is null)
            throw new InvalidOperationException("Lớp học không tồn tại.");

        if (selectedClass.AvailableSlots <= 0 || selectedClass.Status == ClassStatus.Full)
            throw new InvalidOperationException("Lớp học đã hết chỗ.");

        var registration = new StudentRegistration
        {
            Id = _registrations.Count + 1001,
            StudentId = 1,
            CourseId = request.CourseId,
            ClassId = request.ClassId,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            Email = request.Email,
            IdentityNumber = request.IdentityNumber,
            Address = request.Address,
            RegistrationStatus = RegistrationStatus.PendingPayment,
            PaymentStatus = PaymentStatus.Unpaid,
            TotalAmount = _courses.FirstOrDefault(x => x.Id == request.CourseId)?.TuitionFee ?? 0,
            CreatedAt = DateTime.Now
        };

        _registrations.Add(registration);

        selectedClass.CurrentStudents += 1;
        selectedClass.AvailableSlots = Math.Max(0, selectedClass.MaxStudents - selectedClass.CurrentStudents);
        selectedClass.Status = selectedClass.AvailableSlots == 0 ? ClassStatus.Full : selectedClass.Status;

        return Task.FromResult(registration);
    }

    public Task<StudentRegistration?> GetRegistrationByIdAsync(long registrationId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_registrations.FirstOrDefault(x => x.Id == registrationId));
    }

    public Task<StudentRegistration?> FindMyRegistrationAsync(long courseId, long classId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var found = _registrations
            .Where(x => x.CourseId == courseId && x.ClassId == classId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();
        return Task.FromResult(found);
    }

    public Task<StudentRegistration?> FindMyRegistrationByCourseAsync(long courseId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var found = _registrations
            .Where(x => x.CourseId == courseId)
            .OrderByDescending(x => x.RegistrationStatus == RegistrationStatus.Confirmed)
            .ThenByDescending(x => x.CreatedAt)
            .FirstOrDefault();
        return Task.FromResult(found);
    }

    public Task<List<StudentRegistration>> GetMyRegistrationsAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_registrations.OrderByDescending(x => x.CreatedAt).ToList());
    }

    public Task<Payment> CreateVnPayPaymentUrlAsync(long registrationId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var registration = _registrations.FirstOrDefault(x => x.Id == registrationId)
            ?? throw new InvalidOperationException("Không tìm thấy phiếu đăng ký.");

        var payment = new Payment
        {
            Id = _payments.Count + 5001,
            RegistrationId = registrationId,
            Amount = registration.TotalAmount,
            Method = "VNPAY",
            TransactionCode = $"VNP{DateTime.Now:yyyyMMddHHmmss}",
            Status = PaymentStatus.Pending,
            PaymentUrl = "https://sandbox.vnpayment.vn/mock-payment-url",
            CreatedAt = DateTime.Now
        };

        _payments.Add(payment);
        return Task.FromResult(payment);
    }

    public Task<Payment> GetPaymentStatusAsync(long paymentId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var payment = _payments.FirstOrDefault(x => x.Id == paymentId)
            ?? throw new InvalidOperationException("Không tìm thấy giao dịch.");

        if (payment.Status == PaymentStatus.Pending)
        {
            payment.Status = PaymentStatus.Paid;
            payment.PaidAt = DateTime.Now;

            var registration = _registrations.FirstOrDefault(x => x.Id == payment.RegistrationId);
            if (registration is not null)
            {
                registration.PaymentStatus = PaymentStatus.Paid;
                registration.RegistrationStatus = RegistrationStatus.Confirmed;
            }
        }

        return Task.FromResult(payment);
    }

    public Task<List<Payment>> GetMyPaymentsAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_payments.OrderByDescending(x => x.CreatedAt).ToList());
    }

    private static List<Course> BuildCourses() =>
    [
        new Course
        {
            Id = 1,
            Name = "Khóa học B2 tiêu chuẩn",
            LicenseType = "B2",
            Description = "Khóa học B2 trọn gói lý thuyết + thực hành.",
            TuitionFee = 12500000,
            Duration = "3 tháng",
            TotalSessions = 24,
            Status = CourseStatus.Open,
            ThumbnailUrl = null,
            Content = "Lý thuyết luật giao thông, mô phỏng, thực hành sa hình.",
            Conditions = "Đủ 18 tuổi, sức khỏe phù hợp.",
            RequiredDocuments = "CCCD photo, ảnh 3x4, giấy khám sức khỏe."
        },
        new Course
        {
            Id = 2,
            Name = "Khóa học C nâng cao",
            LicenseType = "C",
            Description = "Đào tạo lái xe tải hạng C chuyên sâu.",
            TuitionFee = 15500000,
            Duration = "4.5 tháng",
            TotalSessions = 32,
            Status = CourseStatus.Open,
            Content = "Lý thuyết nâng cao, thực hành đường trường xe tải.",
            Conditions = "Đủ 21 tuổi.",
            RequiredDocuments = "CCCD, ảnh, giấy khám sức khỏe."
        }
    ];

    private static List<DrivingClass> BuildClasses() =>
    [
        new DrivingClass
        {
            Id = 101,
            CourseId = 1,
            ClassCode = "B2-0501",
            Name = "Lớp B2 sáng T2-T4-T6",
            StartDate = DateTime.Today.AddDays(7),
            EndDate = DateTime.Today.AddMonths(3),
            ScheduleText = "Thứ 2-4-6 (07:30-10:30)",
            Location = "Sân tập Quận 9",
            TeacherName = "Nguyễn Văn A",
            MaxStudents = 30,
            CurrentStudents = 22,
            AvailableSlots = 8,
            Status = ClassStatus.Open
        },
        new DrivingClass
        {
            Id = 102,
            CourseId = 2,
            ClassCode = "C-0601",
            Name = "Lớp C tối T3-T5",
            StartDate = DateTime.Today.AddDays(14),
            EndDate = DateTime.Today.AddMonths(5),
            ScheduleText = "Thứ 3-5 (18:30-21:00)",
            Location = "Sân tập Thủ Đức",
            TeacherName = "Trần Văn B",
            MaxStudents = 25,
            CurrentStudents = 25,
            AvailableSlots = 0,
            Status = ClassStatus.Full
        }
    ];

    private static List<StudySchedule> BuildSchedules() =>
    [
        new StudySchedule
        {
            Id = 1,
            ClassId = 101,
            Date = DateTime.Today.AddDays(8),
            StartTime = "07:30",
            EndTime = "10:30",
            Title = "Buổi 1 - Luật giao thông đường bộ",
            Content = "Giới thiệu tổng quan, biển báo cơ bản.",
            TeacherName = "Nguyễn Văn A",
            Location = "Phòng LT-01",
            Status = "Upcoming"
        }
    ];
}

