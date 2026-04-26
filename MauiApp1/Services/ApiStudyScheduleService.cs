using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using MauiApp1.Models;
using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public sealed class ApiStudyScheduleService : IStudyScheduleService
{
    private readonly HttpClient _httpClient;

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
}
