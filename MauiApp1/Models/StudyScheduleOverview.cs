namespace MauiApp1.Models;

public sealed class StudyScheduleOverview
{
    public string CourseName { get; set; } = string.Empty;
    public string ProgressText { get; set; } = string.Empty;
    public string NextSessionText { get; set; } = string.Empty;
    public string AttendanceText { get; set; } = string.Empty;
    public string ExamReminderText { get; set; } = string.Empty;
}
