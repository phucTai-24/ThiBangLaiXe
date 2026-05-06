using MauiApp1.Models;

namespace MauiApp1.Services;

public sealed class PracticeSessionStore : IPracticeSessionStore
{
    private readonly Dictionary<string, PracticeSession> _sessions = new();

    public PracticeSession? CurrentSession { get; private set; }

    public void SetCurrentSession(PracticeSession session)
    {
        CurrentSession = session;
        _sessions[session.Id] = session;
    }

    public bool TryGetSession(string sessionId, out PracticeSession session)
    {
        return _sessions.TryGetValue(sessionId, out session!);
    }
}
