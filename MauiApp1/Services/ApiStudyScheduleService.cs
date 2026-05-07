using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Globalization;
using MauiApp1.Models;
using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public sealed class ApiStudyScheduleService : IStudyScheduleService
{
    private readonly HttpClient _httpClient;
    private readonly SemaphoreSlim _adminScheduleCacheLock = new(1, 1);
    private List<AdminScheduleViewDto>? _cachedAdminSchedules;
    private DateTime _adminScheduleCacheTimeUtc = DateTime.MinValue;
    private static readonly TimeSpan AdminScheduleCacheDuration = TimeSpan.FromSeconds(60);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiStudyScheduleService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<StudyScheduleOverview> GetOverviewAsync()
    {
        await AttachAuthHeaderAsync();

        var adminSchedules = await GetAdminSchedulesAsync();
        if (adminSchedules.Count > 0)
        {
            var today = DateTime.Today;
            var ordered = adminSchedules
                .OrderBy(x => x.StudyDate)
                .ThenBy(x => x.StartTime)
                .ToList();
            var next = ordered.FirstOrDefault(x => x.StudyDate.Date >= today) ?? ordered.Last();
            var todayCount = ordered.Count(x => x.StudyDate.Date == today);
            var upcomingCount = ordered.Count(x => x.StudyDate.Date >= today);
            var classCount = ordered.Select(x => x.ClassId).Distinct().Count();

            return new StudyScheduleOverview
            {
                CourseName = classCount <= 1
                    ? $"Lớp {next.ClassName}"
                    : $"{classCount} lớp đang có lịch học",
                ProgressText = $"Tổng {ordered.Count} buổi • {upcomingCount} buổi sắp tới",
                NextSessionText = $"Buổi gần nhất: {next.StudyDate:dd/MM/yyyy} • {FormatTimeRange(next.StartTime, next.EndTime)} • {DisplayOrFallback(next.Room, "Chưa có phòng")}",
                AttendanceText = todayCount > 0 ? $"Hôm nay có {todayCount} buổi học" : "Hôm nay chưa có buổi học",
                ExamReminderText = "Dữ liệu lịch học theo lớp học của học viên"
            };
        }

        var studentDashboard = await GetWithFallbackAsync<StudentDashboardDemoDto>("api/dashboard/student");
        if (studentDashboard is not null)
        {
            var nextText = studentDashboard.NextSession is null
                ? "Chưa có buổi học sắp tới"
                : $"Buổi gần nhất: {studentDashboard.NextSession.Date:dd/MM/yyyy} • {studentDashboard.NextSession.Time} • {studentDashboard.NextSession.Location}";

            var examText = studentDashboard.UpcomingExam is null
                ? "Chưa có lịch thi sắp tới"
                : $"Kỳ thi: {studentDashboard.UpcomingExam.Name} • {studentDashboard.UpcomingExam.Date:dd/MM/yyyy}";

            return new StudyScheduleOverview
            {
                CourseName = string.IsNullOrWhiteSpace(studentDashboard.CourseName) ? "Chưa có khóa học" : studentDashboard.CourseName,
                ProgressText = $"Đã học {studentDashboard.CompletedSessions}/{studentDashboard.TotalSessions} buổi • Tiến độ {studentDashboard.StudyProgress}%",
                NextSessionText = nextText,
                AttendanceText = $"Điểm danh trung bình {studentDashboard.AttendanceRate:F1}%",
                ExamReminderText = examText
            };
        }

        var fallbackOverview = await GetWithFallbackAsync<ApiResponse<DashboardOverviewV1Dto>>("api/v1/dashboard/overview");
        if (fallbackOverview?.Data is not null)
        {
            var x = fallbackOverview.Data;
            return new StudyScheduleOverview
            {
                CourseName = "Tổng quan học tập",
                ProgressText = $"Số phiên: {x.TotalSessions} • Tỷ lệ đậu: {x.PassRate:0.#}%",
                NextSessionText = "BE chưa có API buổi học theo học viên (classes/sessions).",
                AttendanceText = $"Điểm trung bình mô phỏng: {x.AverageScore:0.#}",
                ExamReminderText = $"Tỷ lệ trượt điểm liệt: {x.CriticalFailRate:0.#}%"
            };
        }

        return new StudyScheduleOverview
        {
            CourseName = "Chưa có dữ liệu lịch học",
            ProgressText = "Không lấy được dữ liệu từ API.",
            NextSessionText = "Hiện BE chưa mở endpoint lịch học theo học viên.",
            AttendanceText = "--",
            ExamReminderText = "--"
        };
    }

    public async Task<List<StudyScheduleItem>> GetUpcomingScheduleAsync()
    {
        await AttachAuthHeaderAsync();

        var adminSchedules = await GetAdminSchedulesAsync();
        if (adminSchedules.Count > 0)
        {
            var today = DateTime.Today;
            var ordered = adminSchedules
                .Where(x => x.StudyDate.Date >= today)
                .OrderBy(x => x.StudyDate)
                .ThenBy(x => x.StartTime)
                .Take(20)
                .ToList();

            if (ordered.Count == 0)
            {
                ordered = adminSchedules
                    .OrderByDescending(x => x.StudyDate)
                    .ThenByDescending(x => x.StartTime)
                    .Take(10)
                    .OrderBy(x => x.StudyDate)
                    .ThenBy(x => x.StartTime)
                    .ToList();
            }

            var nextId = ordered.FirstOrDefault(x => x.StudyDate.Date >= today)?.Id;

            return ordered
                .Select(x => MapAdminScheduleItem(x, today, nextId == x.Id))
                .ToList();
        }

        var studentDashboard = await GetWithFallbackAsync<StudentDashboardDemoDto>("api/dashboard/student");
        if (studentDashboard?.NextSession is not null)
        {
            var next = studentDashboard.NextSession;
            return
            [
                new StudyScheduleItem
                {
                    Id = "dashboard-next",
                    DayBadgeText = "Sắp tới",
                    DayBadgeColor = "#8A4B00",
                    DayBadgeBackground = "#FFE8C2",
                    DateText = next.Date.ToString("dd/MM/yyyy"),
                    WeekdayText = next.Date.ToString("dddd", new System.Globalization.CultureInfo("vi-VN")),
                    TimeRange = next.Time,
                    Location = next.Location,
                    InstructorName = "Giảng viên theo hệ thống",
                    CourseName = studentDashboard.CourseName,
                    SessionTitle = "Buổi học sắp tới",
                    Description = "Dữ liệu từ API dashboard student",
                    Status = "Sắp diễn ra",
                    StatusColor = "#7C5800",
                    StatusBackground = "#FFF3DC",
                    AccentEmoji = "📅",
                    CardBackground = "#FFF9EE",
                    CardStroke = "#F2C879",
                    IsNextUp = true,
                    IsToday = next.Date.Date == DateTime.Now.Date
                }
            ];
        }

        return new List<StudyScheduleItem>();
    }

    private async Task<List<AdminScheduleViewDto>> GetAdminSchedulesAsync()
    {
        if (_cachedAdminSchedules is not null && DateTime.UtcNow - _adminScheduleCacheTimeUtc < AdminScheduleCacheDuration)
            return _cachedAdminSchedules;

        await _adminScheduleCacheLock.WaitAsync();
        try
        {
            if (_cachedAdminSchedules is not null && DateTime.UtcNow - _adminScheduleCacheTimeUtc < AdminScheduleCacheDuration)
                return _cachedAdminSchedules;

            var registrations = await GetMyClassRegistrationsAsync();
            if (registrations.Count == 0)
                return new List<AdminScheduleViewDto>();

            var mapped = new List<AdminScheduleViewDto>();
            foreach (var registration in registrations)
            {
                var schedulesResponse = await _httpClient.GetAsync($"api/v1/admin/schedules?classId={registration.ClassId}");
                if (!schedulesResponse.IsSuccessStatusCode)
                    continue;

                var schedulesBody = await schedulesResponse.Content.ReadAsStringAsync();
                var schedules = DeserializeApiData<List<AdminScheduleDto>>(schedulesBody) ?? new List<AdminScheduleDto>();
                foreach (var schedule in schedules)
                {
                    var studyDate = ParseDate(schedule.StudyDate);
                    if (studyDate == DateTime.MinValue)
                        continue;

                    mapped.Add(new AdminScheduleViewDto
                    {
                        Id = schedule.Id,
                        ClassId = schedule.ClassId,
                        ClassName = DisplayOrFallback(registration.ClassName, $"#{schedule.ClassId}"),
                        CourseName = DisplayOrFallback(registration.CourseName, "Khóa học của tôi"),
                        Name = DisplayOrFallback(schedule.Name, "Buổi học"),
                        StudyDate = studyDate,
                        StartTime = ParseTime(schedule.StartTime),
                        EndTime = ParseTime(schedule.EndTime),
                        Content = schedule.Content ?? string.Empty,
                        Room = schedule.Room ?? string.Empty,
                        TeacherName = "Giảng viên"
                    });
                }
            }

            _cachedAdminSchedules = mapped;
            _adminScheduleCacheTimeUtc = DateTime.UtcNow;
            return mapped;
        }
        catch
        {
            return new List<AdminScheduleViewDto>();
        }
        finally
        {
            _adminScheduleCacheLock.Release();
        }
    }

    private async Task<List<MyClassRegistrationDto>> GetMyClassRegistrationsAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("api/v1/my/course-registrations?page=1&pageSize=100");
            if (!response.IsSuccessStatusCode)
                return new List<MyClassRegistrationDto>();

            var body = await response.Content.ReadAsStringAsync();
            var wrapped = DeserializeApiData<PagedDataDto<MyCourseRegistrationDto>>(body);
            var items = wrapped?.Items ?? new List<MyCourseRegistrationDto>();

            return items
                .Where(x => x.ClassId.HasValue)
                .OrderByDescending(IsActiveRegistration)
                .ThenByDescending(x => x.RegistrationDate)
                .GroupBy(x => x.ClassId!.Value)
                .Select(x => x.First())
                .Select(x => new MyClassRegistrationDto
                {
                    ClassId = x.ClassId!.Value,
                    ClassName = x.ClassName ?? string.Empty,
                    CourseName = x.CourseName ?? string.Empty,
                    Status = x.Status ?? string.Empty
                })
                .ToList();
        }
        catch
        {
            return new List<MyClassRegistrationDto>();
        }
    }

    private static bool IsActiveRegistration(MyCourseRegistrationDto registration)
    {
        var status = registration.Status ?? string.Empty;
        return status.Contains("duyet", StringComparison.OrdinalIgnoreCase)
            || status.Contains("dang", StringComparison.OrdinalIgnoreCase)
            || status.Contains("hoc", StringComparison.OrdinalIgnoreCase)
            || status.Contains("confirmed", StringComparison.OrdinalIgnoreCase)
            || status.Contains("approved", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<Dictionary<long, AdminClassDto>> GetAdminClassesAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("api/v1/admin/classes");
            if (!response.IsSuccessStatusCode)
                return new Dictionary<long, AdminClassDto>();

            var body = await response.Content.ReadAsStringAsync();
            var classes = DeserializeApiData<List<AdminClassDto>>(body) ?? new List<AdminClassDto>();
            return classes
                .GroupBy(x => x.Id)
                .ToDictionary(x => x.Key, x => x.First());
        }
        catch
        {
            return new Dictionary<long, AdminClassDto>();
        }
    }

    private static StudyScheduleItem MapAdminScheduleItem(AdminScheduleViewDto schedule, DateTime today, bool isFirst)
    {
        var isToday = schedule.StudyDate.Date == today;
        var isPast = schedule.StudyDate.Date < today;
        var isNext = !isPast && isFirst;

        return new StudyScheduleItem
        {
            Id = schedule.Id.ToString(CultureInfo.InvariantCulture),
            DayBadgeText = isToday ? "Hôm nay" : isPast ? "Đã qua" : isNext ? "Sắp tới" : "Theo lịch",
            DayBadgeColor = isToday ? "#8A4B00" : isPast ? "#5C5C5C" : "#0F6B5B",
            DayBadgeBackground = isToday ? "#FFE8C2" : isPast ? "#ECECEC" : "#DFF8F2",
            DateText = schedule.StudyDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
            WeekdayText = schedule.StudyDate.ToString("dddd", new CultureInfo("vi-VN")),
            TimeRange = FormatTimeRange(schedule.StartTime, schedule.EndTime),
            Location = DisplayOrFallback(schedule.Room, "Chưa có phòng học"),
            InstructorName = schedule.TeacherName,
            CourseName = $"{schedule.CourseName} • Lớp {schedule.ClassName}",
            SessionTitle = schedule.Name,
            Description = schedule.Content,
            Status = isPast ? "Đã qua" : isToday ? "Hôm nay" : "Sắp diễn ra",
            StatusColor = isPast ? "#5C5C5C" : isToday ? "#7C5800" : "#0F6B5B",
            StatusBackground = isPast ? "#ECECEC" : isToday ? "#FFF3DC" : "#DFF8F2",
            AccentEmoji = isPast ? "✅" : isToday ? "🔥" : "📅",
            CardBackground = isToday ? "#FFF9EE" : "#FFFFFF",
            CardStroke = isToday ? "#F2C879" : "#14D5C4AB",
            IsNextUp = isNext,
            IsToday = isToday
        };
    }

    private static T? DeserializeApiData<T>(string body) where T : class
    {
        if (string.IsNullOrWhiteSpace(body))
            return default;

        try
        {
            var wrapped = JsonSerializer.Deserialize<ApiResponse<T>>(body, JsonOptions);
            if (wrapped?.Data is not null)
                return wrapped.Data;
        }
        catch
        {
            // ignore and try raw data shape
        }

        try
        {
            return JsonSerializer.Deserialize<T>(body, JsonOptions);
        }
        catch
        {
            return default;
        }
    }

    private static DateTime ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return DateTime.MinValue;

        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsed)
            ? parsed.Date
            : DateTime.MinValue;
    }

    private static TimeSpan ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return TimeSpan.Zero;

        return TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : TimeSpan.Zero;
    }

    private static string FormatTimeRange(TimeSpan startTime, TimeSpan endTime)
    {
        return $"{startTime:hh\\:mm} - {endTime:hh\\:mm}";
    }

    private static string DisplayOrFallback(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
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

                try
                {
                    var wrapped = JsonSerializer.Deserialize<T>(content, JsonOptions);
                    if (wrapped is not null)
                        return wrapped;
                }
                catch
                {
                    // ignore and try next parser
                }

                try
                {
                    var wrappedResponse = JsonSerializer.Deserialize<ApiResponse<T>>(content, JsonOptions);
                    if (wrappedResponse?.Data is not null)
                        return wrappedResponse.Data;
                }
                catch
                {
                    // ignore and try next endpoint
                }
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
        if (!string.IsNullOrWhiteSpace(token))
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    private sealed class DashboardOverviewV1Dto
    {
        public int TotalSessions { get; set; }
        public decimal PassRate { get; set; }
        public decimal AverageScore { get; set; }
        public decimal CriticalFailRate { get; set; }
    }

    private sealed class StudentDashboardDemoDto
    {
        [JsonPropertyName("ten_khoa_hoc")]
        public string CourseName { get; set; } = string.Empty;

        [JsonPropertyName("tien_do_hoc")]
        public int StudyProgress { get; set; }

        [JsonPropertyName("so_buoi_da_hoc")]
        public int CompletedSessions { get; set; }

        [JsonPropertyName("tong_so_buoi")]
        public int TotalSessions { get; set; }

        [JsonPropertyName("ty_le_diem_danh")]
        public decimal AttendanceRate { get; set; }

        [JsonPropertyName("buoi_hoc_tiep_theo")]
        public StudentNextSessionDto? NextSession { get; set; }

        [JsonPropertyName("ky_thi_sap_toi")]
        public StudentUpcomingExamDto? UpcomingExam { get; set; }
    }

    private sealed class StudentNextSessionDto
    {
        [JsonPropertyName("ngay")]
        public DateTime Date { get; set; }

        [JsonPropertyName("gio")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("dia_diem")]
        public string Location { get; set; } = string.Empty;
    }

    private sealed class StudentUpcomingExamDto
    {
        [JsonPropertyName("ten_ky_thi")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("ngay_thi")]
        public DateTime Date { get; set; }
    }

    private sealed class AdminScheduleDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("lop_hoc_id")]
        public long ClassId { get; set; }

        [JsonPropertyName("ten_buoi")]
        public string? Name { get; set; }

        [JsonPropertyName("ngay_hoc")]
        public string? StudyDate { get; set; }

        [JsonPropertyName("gio_bat_dau")]
        public string? StartTime { get; set; }

        [JsonPropertyName("gio_ket_thuc")]
        public string? EndTime { get; set; }

        [JsonPropertyName("noi_dung")]
        public string? Content { get; set; }

        [JsonPropertyName("phong_hoc")]
        public string? Room { get; set; }
    }

    private sealed class AdminClassDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("ten_lop")]
        public string? Name { get; set; }

        [JsonPropertyName("ma_lop")]
        public string? Code { get; set; }

        [JsonPropertyName("khoa_hoc")]
        public AdminCourseDto? Course { get; set; }

        [JsonPropertyName("giao_vien")]
        public AdminTeacherDto? Teacher { get; set; }

        public string CourseName => Course?.Name ?? string.Empty;
        public string TeacherName => Teacher?.Name ?? string.Empty;
    }

    private sealed class AdminCourseDto
    {
        [JsonPropertyName("ten_khoa_hoc")]
        public string? Name { get; set; }
    }

    private sealed class AdminTeacherDto
    {
        [JsonPropertyName("ho_ten")]
        public string? Name { get; set; }
    }

    private sealed class PagedDataDto<T>
    {
        public List<T> Items { get; set; } = new();
    }

    private sealed class MyCourseRegistrationDto
    {
        public long RegistrationId { get; set; }

        public long CourseId { get; set; }

        [JsonPropertyName("tenKhoaHoc")]
        public string? CourseName { get; set; }

        public DateTime RegistrationDate { get; set; }

        [JsonPropertyName("ngayDangKy")]
        public DateTime NgayDangKy
        {
            get => RegistrationDate;
            set => RegistrationDate = value;
        }

        [JsonPropertyName("trangThai")]
        public string? Status { get; set; }

        public long? ClassId { get; set; }

        [JsonPropertyName("tenLop")]
        public string? ClassName { get; set; }
    }

    private sealed class MyClassRegistrationDto
    {
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string CourseName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    private sealed class AdminScheduleViewDto
    {
        public long Id { get; set; }
        public long ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string CourseName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime StudyDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
    }
}
