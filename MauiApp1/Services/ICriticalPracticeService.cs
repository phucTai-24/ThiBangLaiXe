using MauiApp1.Models;

namespace MauiApp1.Services;

public interface ICriticalPracticeService
{
    Task<List<CriticalPracticeQuestion>> GetCriticalQuestionsAsync(int pageNumber = 1, int pageSize = 0, CancellationToken cancellationToken = default);
}
