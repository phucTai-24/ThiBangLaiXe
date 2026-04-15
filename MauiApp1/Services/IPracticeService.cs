using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IPracticeService
{
    Task<List<PracticeTopic>> GetTopicsAsync();
    Task<PracticeSession> StartPracticeSessionAsync(int topicId, int questionCount, string note = "");
    Task<PracticeSession> GetPracticeSessionAsync(string sessionId);
    Task<PracticeAnswerSubmissionResult> SubmitAnswerAsync(string sessionId, string questionId, string answerId);
    Task<PracticeSessionResult> SubmitPracticeSessionAsync(string sessionId);
    Task<PracticeSessionResult> GetPracticeSessionResultAsync(string sessionId);
    Task<List<PracticeHistoryItem>> GetPracticeHistoryAsync();
}
