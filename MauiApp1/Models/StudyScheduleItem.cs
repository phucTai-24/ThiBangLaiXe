namespace MauiApp1.Models;

public sealed class StudyScheduleItem
{
    public string Id { get; set; } = string.Empty;
    public string DayBadgeText { get; set; } = string.Empty;
    public string DayBadgeColor { get; set; } = "#7C5800";
    public string DayBadgeBackground { get; set; } = "#FFF3DC";
    public string DateText { get; set; } = string.Empty;
    public string WeekdayText { get; set; } = string.Empty;
    public string TimeRange { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public string SessionTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusColor { get; set; } = "#7C5800";
    public string StatusBackground { get; set; } = "#FFF3DC";
    public string AccentEmoji { get; set; } = "📅";
    public string CardBackground { get; set; } = "#FFFFFF";
    public string CardStroke { get; set; } = "#14D5C4AB";
    public bool IsNextUp { get; set; }
    public bool IsToday { get; set; }
}
