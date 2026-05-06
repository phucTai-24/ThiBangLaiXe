using System.Text.Json;
using MauiApp1.Models;

namespace MauiApp1.Services;

public sealed class PracticeSessionStore : IPracticeSessionStore
{
    private const string PreferenceKey = "AI_PRACTICE_SESSION";
    private const int MaxStoredQuestions = 50;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
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

    public Task SaveAsync(PracticeSession session)
    {
        if (session == null)
            return Task.CompletedTask;

        try
        {
            var persistModel = new PersistedPracticeSession
            {
                Id = session.Id,
                CreatedAt = session.CreatedAt,
                Questions = session.Questions
                    .Take(MaxStoredQuestions)
                    .Select(q => new PersistedPracticeQuestion
                    {
                        Id = q.Id,
                        Number = q.Number,
                        Text = q.Text,
                        Category = q.Category,
                        IsCritical = q.IsCritical,
                        ImageUrl = q.ImageUrl,
                        Explanation = q.Explanation,
                        SelectedAnswerId = q.SelectedAnswerId,
                        IsAnswered = q.IsAnswered,
                        IsCorrectlyAnswered = q.IsCorrectlyAnswered,
                        Answers = q.Answers.Select(a => new PersistedPracticeAnswer
                        {
                            Id = a.Id,
                            Label = a.Label,
                            Text = a.Text,
                            IsCorrectAnswer = a.IsCorrectAnswer,
                            IsSelected = a.IsSelected,
                            IsRevealed = a.IsRevealed
                        }).ToList()
                    })
                    .ToList()
            };

            var json = JsonSerializer.Serialize(persistModel, JsonOptions);
            Preferences.Set(PreferenceKey, json);
        }
        catch
        {
            // Ignore serialization/persistence failures by design.
        }

        return Task.CompletedTask;
    }

    public Task<PracticeSession?> LoadAsync()
    {
        try
        {
            var json = Preferences.Get(PreferenceKey, string.Empty);
            if (string.IsNullOrWhiteSpace(json))
                return Task.FromResult<PracticeSession?>(null);

            var persisted = JsonSerializer.Deserialize<PersistedPracticeSession>(json, JsonOptions);
            if (persisted == null || string.IsNullOrWhiteSpace(persisted.Id))
                return Task.FromResult<PracticeSession?>(null);

            var session = new PracticeSession
            {
                Id = persisted.Id,
                CreatedAt = persisted.CreatedAt,
                Questions = (persisted.Questions ?? new List<PersistedPracticeQuestion>())
                    .Take(MaxStoredQuestions)
                    .Select(q => new PracticeQuestionItem
                    {
                        Id = q.Id,
                        Number = q.Number,
                        Text = q.Text,
                        Category = q.Category,
                        IsCritical = q.IsCritical,
                        ImageUrl = q.ImageUrl,
                        Explanation = q.Explanation,
                        SelectedAnswerId = q.SelectedAnswerId,
                        IsAnswered = q.IsAnswered,
                        IsCorrectlyAnswered = q.IsCorrectlyAnswered,
                        Answers = (q.Answers ?? new List<PersistedPracticeAnswer>())
                            .Select(a => new PracticeAnswerOption
                            {
                                Id = a.Id,
                                Label = a.Label,
                                Text = a.Text,
                                IsCorrectAnswer = a.IsCorrectAnswer,
                                IsSelected = a.IsSelected,
                                IsRevealed = a.IsRevealed
                            })
                            .ToList()
                    })
                    .ToList()
            };

            session.TotalQuestions = session.Questions.Count;
            CurrentSession = session;
            _sessions[session.Id] = session;

            return Task.FromResult<PracticeSession?>(session);
        }
        catch
        {
            return Task.FromResult<PracticeSession?>(null);
        }
    }

    public Task ClearAsync()
    {
        try
        {
            Preferences.Remove(PreferenceKey);
        }
        catch
        {
            // Ignore clear failures by design.
        }

        if (CurrentSession != null)
            _sessions.Remove(CurrentSession.Id);

        CurrentSession = null;
        return Task.CompletedTask;
    }

    private sealed class PersistedPracticeSession
    {
        public string Id { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<PersistedPracticeQuestion> Questions { get; set; } = new();
    }

    private sealed class PersistedPracticeQuestion
    {
        public string Id { get; set; } = string.Empty;
        public int Number { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public bool IsCritical { get; set; }
        public string? ImageUrl { get; set; }
        public string Explanation { get; set; } = string.Empty;
        public string? SelectedAnswerId { get; set; }
        public bool IsAnswered { get; set; }
        public bool IsCorrectlyAnswered { get; set; }
        public List<PersistedPracticeAnswer> Answers { get; set; } = new();
    }

    private sealed class PersistedPracticeAnswer
    {
        public string Id { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public bool IsCorrectAnswer { get; set; }
        public bool IsSelected { get; set; }
        public bool IsRevealed { get; set; }
    }
}
