using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MauiApp1.Models.Auth;
using MauiApp1.Models.Entitlements;

namespace MauiApp1.Services;

public sealed class ApiEntitlementService : IEntitlementService
{
    private readonly HttpClient _httpClient;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiEntitlementService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<EntitlementPackageItem>> GetPackagesAsync()
    {
        await AttachAuthHeaderAsync();

        var registeredCourseIds = await GetRegisteredCourseIdsAsync();

        var wrapped = await GetWithFallbackAsync<ApiResponse<CoursePagedListDto>>(
            "api/v1/courses?page=1&pageSize=100&status=DangMoDangKy",
            "api/v1/courses?page=1&pageSize=100");

        if (wrapped?.Data?.Items is { Count: > 0 } items)
        {
            return items.Select(x => new EntitlementPackageItem
            {
                Id = x.CourseId,
                Code = x.MaKhoaHoc,
                Name = x.TenKhoaHoc,
                Description = BuildCourseDescription(x),
                IsActive = string.Equals(x.TrangThai, "OPEN", StringComparison.OrdinalIgnoreCase)
                           || x.IsOpenForRegistration,
                IsRegistered = registeredCourseIds.Contains(x.CourseId)
            }).ToList();
        }

        return new List<EntitlementPackageItem>();
    }

    public async Task<List<EntitlementPackageItem>> GetMyRegisteredPackagesAsync()
    {
        await AttachAuthHeaderAsync();

        var wrapped = await GetWithFallbackAsync<ApiResponse<MyCourseRegistrationPagedListDto>>(
            "api/v1/my/course-registrations?page=1&pageSize=100");

        if (wrapped?.Data?.Items is not { Count: > 0 } items)
            return new List<EntitlementPackageItem>();

        return items
            .Where(x => x.CourseId > 0)
            .Select(x => new EntitlementPackageItem
            {
                Id = x.CourseId,
                Code = string.Empty,
                Name = string.IsNullOrWhiteSpace(x.TenKhoaHoc) ? $"Khóa học #{x.CourseId}" : x.TenKhoaHoc,
                Description = $"{x.LoaiBangLai} • Học phí {x.HocPhi:N0}đ • Trạng thái: {x.TrangThai}",
                IsActive = true,
                IsRegistered = true
            })
            .GroupBy(x => x.Id)
            .Select(g => g.First())
            .ToList();
    }

    public async Task<CourseDetailItem?> GetCourseDetailAsync(long courseId)
    {
        await AttachAuthHeaderAsync();

        var wrapped = await GetWithFallbackAsync<ApiResponse<CourseDetailDto>>($"api/v1/courses/{courseId}");
        var dto = wrapped?.Data;
        if (dto is null)
            return null;

        return new CourseDetailItem
        {
            CourseId = dto.CourseId,
            MaKhoaHoc = dto.MaKhoaHoc,
            TenKhoaHoc = dto.TenKhoaHoc,
            LoaiBangLai = dto.LoaiBangLai,
            MoTa = dto.MoTa,
            HocPhi = dto.HocPhi,
            SoBuoiHoc = dto.SoBuoiHoc,
            SoLuongToiDa = dto.SoLuongToiDa,
            SoLuongHienTai = dto.SoLuongHienTai,
            NgayBatDau = dto.NgayBatDau,
            NgayKetThuc = dto.NgayKetThuc,
            TrangThai = dto.TrangThai,
            HinhAnh = dto.HinhAnh,
            GiaoVienChinh = dto.GiaoVienChinh is null
                ? null
                : new CourseTeacherItem
                {
                    TeacherId = dto.GiaoVienChinh.TeacherId,
                    HoTen = dto.GiaoVienChinh.HoTen,
                    SoDienThoai = dto.GiaoVienChinh.SoDienThoai
                },
            LichHocMau = dto.LichHocMau.Select(x => new CourseScheduleItem
            {
                ThuTrongTuan = x.ThuTrongTuan,
                GioBatDau = x.GioBatDau,
                GioKetThuc = x.GioKetThuc,
                DiaDiem = x.DiaDiem
            }).ToList()
        };
    }

    private async Task<HashSet<long>> GetRegisteredCourseIdsAsync()
    {
        try
        {
            var wrapped = await GetWithFallbackAsync<ApiResponse<MyCourseRegistrationPagedListDto>>(
                "api/v1/my/course-registrations?page=1&pageSize=100");

            return wrapped?.Data?.Items is { Count: > 0 } items
                ? items.Where(x => x.CourseId > 0).Select(x => x.CourseId).ToHashSet()
                : new HashSet<long>();
        }
        catch
        {
            return new HashSet<long>();
        }
    }

    public async Task RegisterPackageAsync(long packageId)
    {
        await AttachAuthHeaderAsync();

        var payload = new CreateCourseRegistrationRequestDto
        {
            CourseId = packageId,
            GhiChu = "Đăng ký từ ứng dụng mobile"
        };

        var response = await _httpClient.PostAsJsonAsync("api/v1/course-registrations", payload);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            var message = ExtractApiErrorMessage(body)
                ?? $"Đăng ký khóa học thất bại ({(int)response.StatusCode}).";

            throw new InvalidOperationException(message);
        }
    }

    private static string? ExtractApiErrorMessage(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return null;

        try
        {
            var error = JsonSerializer.Deserialize<ApiResponse<object>>(body, JsonOptions);
            return error?.Errors?.FirstOrDefault()?.Detail
                ?? error?.Message
                ?? body;
        }
        catch
        {
            return body;
        }
    }

    private async Task<T?> GetWithFallbackAsync<T>(params string[] endpoints) where T : class
    {
        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);
                if (!response.IsSuccessStatusCode)
                    continue;

                var content = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrWhiteSpace(content))
                    continue;

                var parsed = JsonSerializer.Deserialize<T>(content, JsonOptions);
                if (parsed is not null)
                    return parsed;
            }
            catch
            {
                // ignore and try next endpoint
            }
        }

        return default;
    }

    private async Task AttachAuthHeaderAsync()
    {
        var token = await SecureStorage.Default.GetAsync("access_token");
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đã hết hạn.");

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static string BuildCourseDescription(CourseListItemDto x)
    {
        var hocPhi = $"{x.HocPhi:N0}đ";
        var lichHoc = string.IsNullOrWhiteSpace(x.LichHocTomTat) ? "Chưa có lịch học" : x.LichHocTomTat;
        return $"{x.LoaiBangLai} • {hocPhi} • {lichHoc}";
    }

    private sealed class CoursePagedListDto
    {
        public List<CourseListItemDto> Items { get; set; } = new();
    }

    private sealed class CourseListItemDto
    {
        public long CourseId { get; set; }
        public string MaKhoaHoc { get; set; } = string.Empty;
        public string TenKhoaHoc { get; set; } = string.Empty;
        public string LoaiBangLai { get; set; } = string.Empty;
        public decimal HocPhi { get; set; }
        public string? LichHocTomTat { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public bool IsOpenForRegistration { get; set; }
    }

    private sealed class CourseDetailDto
    {
        public long CourseId { get; set; }
        public string MaKhoaHoc { get; set; } = string.Empty;
        public string TenKhoaHoc { get; set; } = string.Empty;
        public string LoaiBangLai { get; set; } = string.Empty;
        public string? MoTa { get; set; }
        public decimal HocPhi { get; set; }
        public int SoBuoiHoc { get; set; }
        public int SoLuongToiDa { get; set; }
        public int SoLuongHienTai { get; set; }
        public DateTime? NgayBatDau { get; set; }
        public DateTime? NgayKetThuc { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public CourseTeacherDto? GiaoVienChinh { get; set; }
        public List<CourseScheduleDto> LichHocMau { get; set; } = new();
        public string? HinhAnh { get; set; }
    }

    private sealed class CourseTeacherDto
    {
        public long TeacherId { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string? SoDienThoai { get; set; }
    }

    private sealed class CourseScheduleDto
    {
        public int ThuTrongTuan { get; set; }
        public string GioBatDau { get; set; } = string.Empty;
        public string GioKetThuc { get; set; } = string.Empty;
        public string? DiaDiem { get; set; }
    }

    private sealed class CreateCourseRegistrationRequestDto
    {
        public long CourseId { get; set; }
        public string? GhiChu { get; set; }
    }

    private sealed class MyCourseRegistrationPagedListDto
    {
        public List<MyCourseRegistrationDto> Items { get; set; } = new();
    }

    private sealed class MyCourseRegistrationDto
    {
        public long CourseId { get; set; }
        public string TenKhoaHoc { get; set; } = string.Empty;
        public string LoaiBangLai { get; set; } = string.Empty;
        public decimal HocPhi { get; set; }
        public string TrangThai { get; set; } = string.Empty;
    }
}

