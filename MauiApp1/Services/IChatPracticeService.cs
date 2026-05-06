using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IChatPracticeService
{
    Task<PracticeSession> CreateSessionAsync(PracticeRequest request, CancellationToken cancellationToken = default);
    Task<List<PracticeQuestionItem>> GetQuestionsByTopicAsync(string topic, CancellationToken cancellationToken = default);
    Task<List<PracticeQuestionItem>> GetWrongQuestionsAsync(string topic, CancellationToken cancellationToken = default);
}
