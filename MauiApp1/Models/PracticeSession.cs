namespace MauiApp1.Models;

public class PracticeSession
{
    public string Id { get; set; } = string.Empty;
    public int TopicId { get; set; }
    public string TopicName { get; set; } = string.Empty;
    public string Status { get; set; } = "DANG_LAM";
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public int Score { get; set; }
    public string Note { get; set; } = string.Empty;
    public List<PracticeQuestionItem> Questions { get; set; } = new();
}
