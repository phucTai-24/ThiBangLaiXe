namespace MauiApp1.Models;

public class PracticeHistoryItem
{
    public string SessionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public int Score { get; set; }
    public DateTime PracticedAt { get; set; }

    public string PracticedAtText => PracticedAt.ToString("dd/MM/yyyy • HH:mm");
}
