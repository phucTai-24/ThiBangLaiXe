namespace MauiApp1.Models;

public class PracticeSessionResult
{
    public string SessionId { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public int Score { get; set; }
    public string ResultText { get; set; } = string.Empty;
    public string DurationText { get; set; } = "00:00";
}
