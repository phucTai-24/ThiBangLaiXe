using MauiApp1.Models;

namespace MauiApp1.Services;

public class MockPracticeService : IPracticeService
{
    private readonly Dictionary<string, PracticeSession> _sessions = new();
    private readonly List<PracticeTopic> _topics =
    [
        new PracticeTopic
        {
            Id = 1,
            Name = "Luật giao thông",
            Description = "Ôn các câu nền tảng về tốc độ, làn đường, nhường đường và xử phạt.",
            QuestionCount = 120,
            AccentEmoji = "📘",
            AccentColor = "#7C5800",
            IsRecommended = true
        },
        new PracticeTopic
        {
            Id = 2,
            Name = "Biển báo giao thông",
            Description = "Nhận diện nhanh biển cấm, biển nguy hiểm, chỉ dẫn và hiệu lệnh.",
            QuestionCount = 86,
            AccentEmoji = "🚦",
            AccentColor = "#C62828",
            IsRecommended = true
        },
        new PracticeTopic
        {
            Id = 3,
            Name = "Sa hình và kỹ năng lái",
            Description = "Ôn mẹo xử lý tình huống, khoảng cách và thao tác thực tế.",
            QuestionCount = 54,
            AccentEmoji = "🛣️",
            AccentColor = "#1565C0"
        },
        new PracticeTopic
        {
            Id = 4,
            Name = "Câu điểm liệt",
            Description = "Tập trung nhóm câu bắt buộc không được sai trong bài thi.",
            QuestionCount = 20,
            AccentEmoji = "⚠️",
            AccentColor = "#8E24AA"
        }
    ];

    private readonly List<PracticeHistoryItem> _history =
    [
        new PracticeHistoryItem
        {
            SessionId = "practice-001",
            Topic = "Biển báo giao thông",
            TotalQuestions = 25,
            CorrectAnswers = 22,
            Score = 88,
            PracticedAt = DateTime.Now.AddDays(-1).AddHours(-2)
        },
        new PracticeHistoryItem
        {
            SessionId = "practice-002",
            Topic = "Luật giao thông",
            TotalQuestions = 20,
            CorrectAnswers = 17,
            Score = 85,
            PracticedAt = DateTime.Now.AddDays(-3)
        }
    ];

    public Task<List<PracticeTopic>> GetTopicsAsync()
    {
        return Task.FromResult(_topics.ToList());
    }

    public Task<PracticeSession> StartPracticeSessionAsync(int topicId, int questionCount, string note = "")
    {
        var topic = _topics.FirstOrDefault(x => x.Id == topicId) ?? _topics[0];

        var questions = GenerateQuestions(topic.Name, questionCount);
        var session = new PracticeSession
        {
            Id = $"practice-{DateTime.Now:yyyyMMddHHmmss}",
            TopicId = topic.Id,
            TopicName = topic.Name,
            TotalQuestions = questionCount,
            StartTime = DateTime.Now,
            Note = string.IsNullOrWhiteSpace(note) ? $"Ôn tập nhanh chủ đề {topic.Name}" : note,
            Questions = questions
        };

        _sessions[session.Id] = session;

        return Task.FromResult(session);
    }

    public Task<int> GetCriticalSummaryAsync()
    {
        var criticalTopic = _topics.FirstOrDefault(x => string.Equals(x.Name, "Câu điểm liệt", StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(criticalTopic?.QuestionCount ?? 0);
    }

    public async Task<string> StartCriticalPracticeAsync(int size = 10)
    {
        var criticalTopic = _topics.FirstOrDefault(x => string.Equals(x.Name, "Câu điểm liệt", StringComparison.OrdinalIgnoreCase)) ?? _topics[0];
        var session = await StartPracticeSessionAsync(criticalTopic.Id, size, "Ôn tập điểm liệt (mock)");
        return session.Id;
    }

    public Task<PracticeSession> GetPracticeSessionAsync(string sessionId)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            return Task.FromResult(session);
        }

        throw new InvalidOperationException("Không tìm thấy phiên ôn tập mock.");
    }

    public Task<PracticeAnswerSubmissionResult> SubmitAnswerAsync(string sessionId, string questionId, string answerId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session))
        {
            throw new InvalidOperationException("Không tìm thấy phiên ôn tập mock.");
        }

        var question = session.Questions.FirstOrDefault(x => x.Id == questionId)
                       ?? throw new InvalidOperationException("Không tìm thấy câu hỏi.");

        var correctAnswer = question.Answers.First(x => x.IsCorrectAnswer);

        question.SelectedAnswerId = answerId;
        question.IsAnswered = true;
        question.IsCorrectlyAnswered = correctAnswer.Id == answerId;

        foreach (var answer in question.Answers)
        {
            answer.IsSelected = answer.Id == answerId;
            answer.IsRevealed = true;
        }

        return Task.FromResult(new PracticeAnswerSubmissionResult
        {
            IsCorrect = question.IsCorrectlyAnswered,
            CorrectAnswerId = correctAnswer.Id,
            Explanation = question.Explanation
        });
    }

    public Task<PracticeSessionResult> SubmitPracticeSessionAsync(string sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session))
        {
            throw new InvalidOperationException("Không tìm thấy phiên ôn tập mock.");
        }

        session.EndTime = DateTime.Now;
        session.Status = "HOAN_THANH";
        session.CorrectAnswers = session.Questions.Count(x => x.IsCorrectlyAnswered);
        session.WrongAnswers = session.Questions.Count(x => x.IsAnswered) - session.CorrectAnswers;
        session.Score = session.TotalQuestions == 0
            ? 0
            : (int)Math.Round((double)session.CorrectAnswers / session.TotalQuestions * 100);

        if (_history.All(x => x.SessionId != session.Id))
        {
            _history.Insert(0, new PracticeHistoryItem
            {
                SessionId = session.Id,
                Topic = session.TopicName,
                TotalQuestions = session.TotalQuestions,
                CorrectAnswers = session.CorrectAnswers,
                Score = session.Score,
                PracticedAt = session.EndTime ?? DateTime.Now
            });
        }

        return Task.FromResult(BuildSessionResult(session));
    }

    public async Task<PracticeSessionResult> GetPracticeSessionResultAsync(string sessionId)
    {
        var session = await GetPracticeSessionAsync(sessionId);
        return BuildSessionResult(session);
    }

    public Task<List<PracticeHistoryItem>> GetPracticeHistoryAsync()
    {
        return Task.FromResult(_history.OrderByDescending(x => x.PracticedAt).ToList());
    }

    private List<PracticeQuestionItem> GenerateQuestions(string topicName, int questionCount)
    {
        var result = new List<PracticeQuestionItem>();

        for (var i = 1; i <= questionCount; i++)
        {
            result.Add(new PracticeQuestionItem
            {
                Id = $"{topicName}-{i}",
                Number = i,
                Text = $"[{topicName}] Câu ôn tập mẫu số {i}: chọn phương án đúng nhất theo tình huống mô phỏng.",
                Category = topicName,
                IsCritical = topicName == "Câu điểm liệt" && i % 3 == 0,
                Explanation = $"Giải thích mock cho câu {i} của chủ đề {topicName}. Luồng này đang mô phỏng theo endpoint submit answer trong Demo.docx.",
                Answers =
                [
                    new PracticeAnswerOption { Id = $"{i}-A", Label = "A", Text = "Phương án A", IsCorrectAnswer = false },
                    new PracticeAnswerOption { Id = $"{i}-B", Label = "B", Text = "Phương án B", IsCorrectAnswer = true },
                    new PracticeAnswerOption { Id = $"{i}-C", Label = "C", Text = "Phương án C", IsCorrectAnswer = false },
                    new PracticeAnswerOption { Id = $"{i}-D", Label = "D", Text = "Phương án D", IsCorrectAnswer = false }
                ]
            });
        }

        return result;
    }

    private static PracticeSessionResult BuildSessionResult(PracticeSession session)
    {
        var duration = (session.EndTime ?? DateTime.Now) - session.StartTime;

        return new PracticeSessionResult
        {
            SessionId = session.Id,
            TopicName = session.TopicName,
            TotalQuestions = session.TotalQuestions,
            CorrectAnswers = session.CorrectAnswers,
            WrongAnswers = session.WrongAnswers,
            Score = session.Score,
            ResultText = session.Score >= 80 ? "Ôn tập tốt" : "Cần ôn thêm",
            DurationText = duration.ToString(@"mm\:ss")
        };
    }
}
