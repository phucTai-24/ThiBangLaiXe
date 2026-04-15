namespace MauiApp1.Models;

public class Exam
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string LicenseType { get; set; } = "A1"; // A1, A2, B1, B2, etc.
    public List<Question> Questions { get; set; } = new();
    public int TotalQuestions => Questions.Count;
    public int AnsweredQuestions => Questions.Count(q => !string.IsNullOrEmpty(q.SelectedAnswerId));
    public int TimeLimit { get; set; } = 1200; // Giây (20 phút)
    public int TimeRemaining { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public bool IsCompleted { get; set; }
    
    public int CorrectAnswers => Questions.Count(q => 
        !string.IsNullOrEmpty(q.SelectedAnswerId) && 
        q.Answers.Any(a => a.Id == q.SelectedAnswerId && a.IsCorrect));
    
    public int WrongAnswers => Questions.Count(q => 
        !string.IsNullOrEmpty(q.SelectedAnswerId) && 
        q.Answers.Any(a => a.Id == q.SelectedAnswerId && !a.IsCorrect));
    
    public bool IsPassed => CorrectAnswers >= (TotalQuestions * 0.8) && 
                           !Questions.Any(q => q.IsCritical && 
                                             !string.IsNullOrEmpty(q.SelectedAnswerId) && 
                                             q.Answers.Any(a => a.Id == q.SelectedAnswerId && !a.IsCorrect));
}
