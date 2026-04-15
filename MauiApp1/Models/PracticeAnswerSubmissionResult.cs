namespace MauiApp1.Models;

public class PracticeAnswerSubmissionResult
{
    public bool IsCorrect { get; set; }
    public string CorrectAnswerId { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
}
