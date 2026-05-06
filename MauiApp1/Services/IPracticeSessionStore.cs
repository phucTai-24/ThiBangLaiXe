using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IPracticeSessionStore
{
    PracticeSession? CurrentSession { get; }
    void SetCurrentSession(PracticeSession session);
    bool TryGetSession(string sessionId, out PracticeSession session);
    Task SaveAsync(PracticeSession session);
    Task<PracticeSession?> LoadAsync();
    Task ClearAsync();
}
