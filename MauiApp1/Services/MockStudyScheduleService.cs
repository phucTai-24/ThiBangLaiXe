using MauiApp1.Models;

namespace MauiApp1.Services;

public sealed class MockStudyScheduleService : IStudyScheduleService
{
    public Task<StudyScheduleOverview> GetOverviewAsync()
    {
        return Task.FromResult(new StudyScheduleOverview
        {
            CourseName = "Khóa B2 - Tháng 4/2026",
            ProgressText = "12/30 buổi đã hoàn thành • Tiến độ 40%",
            NextSessionText = "Buổi gần nhất vào Thứ tư, 17/04 • 08:00 - 10:30",
            AttendanceText = "Điểm danh hiện tại 91.7% • 1 buổi vắng có phép",
            ExamReminderText = "Kỳ thi sát hạch dự kiến ngày 15/05/2026"
        });
    }

    public Task<List<StudyScheduleItem>> GetUpcomingScheduleAsync()
    {
        var items = new List<StudyScheduleItem>
        {
            new()
            {
                Id = "session-001",
                DayBadgeText = "Hôm nay",
                DayBadgeColor = "#8A4B00",
                DayBadgeBackground = "#FFE8C2",
                DateText = "17/04/2026",
                WeekdayText = "Thứ tư",
                TimeRange = "08:00 - 10:30",
                Location = "Sân tập số 1",
                InstructorName = "Thầy Nguyễn Văn Thầy",
                CourseName = "Lớp B2-04-2026",
                SessionTitle = "Buổi 13 - Ghép xe ngang và đề-pa lên dốc",
                Description = "Mang theo thẻ học viên và có mặt trước 15 phút để điểm danh đầu giờ.",
                Status = "Sắp diễn ra",
                StatusColor = "#7C5800",
                StatusBackground = "#FFF3DC",
                AccentEmoji = "🚗",
                CardBackground = "#FFF9EE",
                CardStroke = "#F2C879",
                IsNextUp = true,
                IsToday = true
            },
            new()
            {
                Id = "session-002",
                DayBadgeText = "Ngày mai",
                DayBadgeColor = "#166534",
                DayBadgeBackground = "#E8F6EA",
                DateText = "19/04/2026",
                WeekdayText = "Thứ sáu",
                TimeRange = "13:30 - 16:00",
                Location = "Phòng lý thuyết A2",
                InstructorName = "Cô Trần Thị Hương",
                CourseName = "Lớp B2-04-2026",
                SessionTitle = "Ôn luật giao thông và câu điểm liệt",
                Description = "Kiểm tra nhanh 20 câu trọng tâm trước khi vào phần luyện đề mô phỏng.",
                Status = "Đã xác nhận",
                StatusColor = "#166534",
                StatusBackground = "#E8F6EA",
                AccentEmoji = "📘",
                CardBackground = "#FFFFFF",
                CardStroke = "#14D5C4AB"
            },
            new()
            {
                Id = "session-003",
                DayBadgeText = "3 ngày nữa",
                DayBadgeColor = "#005295",
                DayBadgeBackground = "#EAF4FF",
                DateText = "22/04/2026",
                WeekdayText = "Thứ hai",
                TimeRange = "07:30 - 10:00",
                Location = "Sân sa hình số 2",
                InstructorName = "Thầy Phạm Quốc Việt",
                CourseName = "Lớp B2-04-2026",
                SessionTitle = "Sa hình tổng hợp và xử lý tình huống",
                Description = "Buổi thực hành kéo dài, ưu tiên đúng tác phong và thao tác an toàn.",
                Status = "Thực hành",
                StatusColor = "#005295",
                StatusBackground = "#EAF4FF",
                AccentEmoji = "🛣️",
                CardBackground = "#FFFFFF",
                CardStroke = "#14D5C4AB"
            },
            new()
            {
                Id = "session-004",
                DayBadgeText = "Tuần sau",
                DayBadgeColor = "#8E24AA",
                DayBadgeBackground = "#F6E8FB",
                DateText = "25/04/2026",
                WeekdayText = "Thứ năm",
                TimeRange = "18:00 - 19:30",
                Location = "Online qua Zoom",
                InstructorName = "Cô Lê Minh Anh",
                CourseName = "Lớp B2-04-2026",
                SessionTitle = "Giải đáp hồ sơ, lịch thi và lưu ý trước sát hạch",
                Description = "Phiên trao đổi ngắn giúp học viên nắm giấy tờ, thời gian và quy trình thi.",
                Status = "Nhắc lịch",
                StatusColor = "#8E24AA",
                StatusBackground = "#F6E8FB",
                AccentEmoji = "🗂️",
                CardBackground = "#FFFFFF",
                CardStroke = "#14D5C4AB"
            }
        };

        return Task.FromResult(items);
    }
}
