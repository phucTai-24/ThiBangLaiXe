using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MauiApp1.Models;
using MauiApp1.Models.Auth;
using MauiApp1.Models.Exams;

namespace MauiApp1.Services;

public sealed class ApiPracticeService : IPracticeService
{
    private readonly HttpClient _httpClient;
    private readonly Dictionary<string, PracticeSession> _sessionCache = new();
    private readonly Dictionary<string, PracticeSessionResult> _resultCache = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiPracticeService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<PracticeTopic>> GetTopicsAsync()
    {
        await AttachAuthHeaderAsync();

        var topicV1Data = await GetWithFallbackAsync<ApiResponse<PagedResponse<TopicV1Dto>>>(
            "api/v1/question-topics?page=1&pageSize=100",
            "api/question-topics?page=1&size=100");

        if (topicV1Data?.Data?.Items is { Count: > 0 } v1Items)
        {
            return v1Items
                .OrderByDescending(x => x.QuestionCount)
                .Select((x, idx) => ToPracticeTopic(x.Id, x.Name, x.Description, x.QuestionCount, idx))
                .ToList();
        }

        var topicDemoItems = await GetWithFallbackAsync<List<TopicDemoDto>>("api/question-topics");
        if (topicDemoItems is { Count: > 0 })
        {
            return topicDemoItems
                .OrderByDescending(x => x.QuestionCount)
                .Select((x, idx) => ToPracticeTopic(x.TopicId, x.Name, string.Empty, x.QuestionCount, idx))
                .ToList();
        }

        return new List<PracticeTopic>();
    }

    public async Task<PracticeSession> StartPracticeSessionAsync(int topicId, int questionCount, string note = "")
    {
        await AttachAuthHeaderAsync();

        var payload = new StartPracticeRequestDto
        {
            TopicId = topicId,
            QuestionCount = questionCount,
            Note = note
        };

        var started = await PostWithFallbackAsync<StartPracticeResponseDto>(
            payload,
            "api/practice-sessions/start",
            "api/v1/practice-sessions/start");

        if (started is null)
            throw new InvalidOperationException("Không thể bắt đầu phiên ôn tập từ API.");

        var sessionId = started.PracticeSessionId.ToString();
        var session = new PracticeSession
        {
            Id = sessionId,
            TopicId = topicId,
            TopicName = "Ôn tập lý thuyết",
            Status = started.Status,
            StartTime = started.StartedAt,
            TotalQuestions = started.TotalQuestions,
            Note = note
        };

        session.Questions = await LoadQuestionsAsync(sessionId);
        if (session.Questions.Count > 0)
            session.TopicName = session.Questions[0].Category;

        _sessionCache[session.Id] = session;
        return session;
    }

    public async Task<int> GetCriticalSummaryAsync()
    {
        await AttachAuthHeaderAsync();

        var summary = await GetWithFallbackAsync<CriticalSummaryDto>(
            "api/v1/critical-questions/summary");

        return summary?.TotalCriticalQuestions ?? 0;
    }

    public async Task<string> StartCriticalPracticeAsync(int size = 10)
    {
        await AttachAuthHeaderAsync();

        try
        {
            var payload = new StartCriticalPracticeRequestDto
            {
                Size = size
            };

            const string endpoint = "api/v1/critical-questions/start-practice";
            var response = await _httpClient.PostAsJsonAsync(endpoint, payload);
            var content = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"[Practice][Critical][Start] POST {endpoint} -> {(int)response.StatusCode} {response.StatusCode}");
            Console.WriteLine($"[Practice][Critical][Start] Response: {content}");

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Không thể bắt đầu phiên ôn tập. HTTP {(int)response.StatusCode}");
            }

            var sessionId = ExtractCriticalSessionId(content);
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                throw new InvalidOperationException("API start-practice không trả sessionId hợp lệ.");
            }

            Console.WriteLine($"[Practice][Critical][Start] SessionId: {sessionId}");
            return sessionId;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Practice][Critical][Start][Error] {ex.Message}");
            throw new InvalidOperationException("Không thể bắt đầu phiên ôn tập", ex);
        }
    }

    public async Task<PracticeSession> GetPracticeSessionAsync(string sessionId)
    {
        await AttachAuthHeaderAsync();

        if (_sessionCache.TryGetValue(sessionId, out var cachedSession) && cachedSession.Questions.Count > 0)
            return cachedSession;

        var questions = await LoadQuestionsAsync(sessionId);
        if (!_sessionCache.TryGetValue(sessionId, out var session))
        {
            session = new PracticeSession
            {
                Id = sessionId,
                Status = "DANG_LAM",
                StartTime = DateTime.Now,
                TotalQuestions = questions.Count,
                TopicName = questions.FirstOrDefault()?.Category ?? "Ôn tập lý thuyết"
            };
        }

        session.Questions = questions;
        session.TotalQuestions = questions.Count;
        _sessionCache[sessionId] = session;

        return session;
    }

    public async Task<PracticeAnswerSubmissionResult> SubmitAnswerAsync(string sessionId, string questionId, string answerId)
    {
        await AttachAuthHeaderAsync();

        if (!long.TryParse(questionId, out var qid) || !long.TryParse(answerId, out var aid))
            throw new InvalidOperationException("Dữ liệu câu hỏi/đáp án không hợp lệ.");

        var payload = new SubmitPracticeAnswerRequestDto
        {
            QuestionId = qid,
            AnswerId = aid
        };

        var result = await PostWithFallbackAsync<SubmitPracticeAnswerResponseDto>(
            payload,
            $"api/practice-sessions/{sessionId}/answers",
            $"api/v1/practice-sessions/{sessionId}/answers");

        if (result is null)
            throw new InvalidOperationException("Nộp đáp án thất bại.");

        if (_sessionCache.TryGetValue(sessionId, out var session))
        {
            var question = session.Questions.FirstOrDefault(x => x.Id == questionId);
            if (question != null)
            {
                question.SelectedAnswerId = answerId;
                question.IsAnswered = true;
                question.IsCorrectlyAnswered = result.IsCorrect;

                foreach (var answer in question.Answers)
                {
                    answer.IsSelected = answer.Id == answerId;
                    answer.IsRevealed = true;
                    answer.IsCorrectAnswer = answer.Id == result.CorrectAnswerId;
                }
            }
        }

        return new PracticeAnswerSubmissionResult
        {
            IsCorrect = result.IsCorrect,
            CorrectAnswerId = result.CorrectAnswerId,
            Explanation = result.Explanation
        };
    }

    public async Task<PracticeSessionResult> SubmitPracticeSessionAsync(string sessionId)
    {
        await AttachAuthHeaderAsync();

        var submitted = await PostWithFallbackAsync<SubmitPracticeSessionResponseDto>(
            null,
            $"api/practice-sessions/{sessionId}/submit",
            $"api/v1/practice-sessions/{sessionId}/submit");

        if (submitted is null)
            throw new InvalidOperationException("Nộp phiên ôn tập thất bại.");

        var result = new PracticeSessionResult
        {
            SessionId = sessionId,
            TopicName = _sessionCache.TryGetValue(sessionId, out var cached) ? cached.TopicName : "Ôn tập lý thuyết",
            TotalQuestions = submitted.CorrectAnswers + submitted.WrongAnswers,
            CorrectAnswers = submitted.CorrectAnswers,
            WrongAnswers = submitted.WrongAnswers,
            Score = submitted.Score,
            ResultText = string.Equals(submitted.Result, "DAT", StringComparison.OrdinalIgnoreCase) ? "Ôn tập đạt" : "Cần ôn thêm",
            DurationText = ParseDurationText(submitted.Duration)
        };

        if (_sessionCache.TryGetValue(sessionId, out var session))
        {
            session.Status = "HOAN_THANH";
            session.EndTime = DateTime.Now;
            session.CorrectAnswers = result.CorrectAnswers;
            session.WrongAnswers = result.WrongAnswers;
            session.Score = result.Score;
        }

        _resultCache[sessionId] = result;
        return result;
    }

    public async Task<PracticeSessionResult> GetPracticeSessionResultAsync(string sessionId)
    {
        if (_resultCache.TryGetValue(sessionId, out var cachedResult))
            return cachedResult;

        var history = await GetPracticeHistoryAsync();
        var bySession = history.FirstOrDefault(x => x.SessionId == sessionId);
        if (bySession != null)
        {
            return new PracticeSessionResult
            {
                SessionId = bySession.SessionId,
                TopicName = bySession.Topic,
                TotalQuestions = bySession.TotalQuestions,
                CorrectAnswers = bySession.CorrectAnswers,
                WrongAnswers = Math.Max(0, bySession.TotalQuestions - bySession.CorrectAnswers),
                Score = bySession.Score,
                ResultText = bySession.Score >= 80 ? "Ôn tập đạt" : "Cần ôn thêm",
                DurationText = "--:--"
            };
        }

        if (_sessionCache.TryGetValue(sessionId, out var session))
        {
            return new PracticeSessionResult
            {
                SessionId = sessionId,
                TopicName = session.TopicName,
                TotalQuestions = session.TotalQuestions,
                CorrectAnswers = session.CorrectAnswers,
                WrongAnswers = session.WrongAnswers,
                Score = session.Score,
                ResultText = session.Score >= 80 ? "Ôn tập đạt" : "Cần ôn thêm",
                DurationText = "--:--"
            };
        }

        throw new InvalidOperationException("Không tìm thấy kết quả phiên ôn tập.");
    }

    public async Task<List<PracticeHistoryItem>> GetPracticeHistoryAsync()
    {
        await AttachAuthHeaderAsync();

        var historyItems = await GetWithFallbackAsync<List<PracticeHistoryDto>>(
            "api/practice-sessions/my-history",
            "api/v1/practice-sessions/my-history");

        return historyItems?.OrderByDescending(x => x.PracticedAt).Select(x => new PracticeHistoryItem
        {
            SessionId = x.PracticeSessionId.ToString(),
            Topic = x.Topic,
            TotalQuestions = x.TotalQuestions,
            CorrectAnswers = x.CorrectAnswers,
            Score = x.Score,
            PracticedAt = x.PracticedAt
        }).ToList() ?? new List<PracticeHistoryItem>();
    }

    private async Task<List<PracticeQuestionItem>> LoadQuestionsAsync(string sessionId)
    {
        try
        {
            var endpoints = new[]
            {
                $"api/practice-sessions/{sessionId}/questions",
                $"api/v1/practice-sessions/{sessionId}/questions"
            };

            List<PracticeQuestionDto>? questions = null;

            foreach (var endpoint in endpoints)
            {
                HttpResponseMessage? response = null;
                string content = string.Empty;

                try
                {
                    response = await _httpClient.GetAsync(endpoint);
                    content = await response.Content.ReadAsStringAsync();

                    Console.WriteLine($"[Practice][Questions] GET {endpoint} -> {(int)response.StatusCode} {response.StatusCode}");
                    Console.WriteLine($"[Practice][Questions] Response: {content}");

                    if (!response.IsSuccessStatusCode)
                    {
                        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                            throw new UnauthorizedAccessException("Phiên đăng nhập đã hết hạn hoặc không hợp lệ.");

                        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                            continue;

                        continue;
                    }

                    questions = ParseApiOrRawFromContent<List<PracticeQuestionDto>>(content);
                    if (questions is { Count: > 0 })
                        break;
                }
                catch (UnauthorizedAccessException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Practice][Questions][Error] endpoint={endpoint} message={ex.Message}");
                }
            }

            if (questions == null)
            {
                throw new InvalidOperationException("Không tải được câu hỏi");
            }

            if (questions.Count == 0)
            {
                Console.WriteLine($"[Practice][Questions] sessionId={sessionId} trả về danh sách rỗng.");
            }

            return questions.OrderBy(x => x.Number).Select(x => new PracticeQuestionItem
            {
                Id = x.QuestionId.ToString(),
                Number = x.Number,
                Text = x.Content,
                Category = "Ôn tập lý thuyết",
                IsCritical = x.IsCritical,
                Answers = x.Answers.Select((a, idx) => new PracticeAnswerOption
                {
                    Id = a.AnswerId.ToString(),
                    Label = ((char)('A' + idx)).ToString(),
                    Text = a.Content,
                    IsCorrectAnswer = false,
                    IsSelected = false,
                    IsRevealed = false
                }).ToList()
            }).ToList();
        }
        catch (UnauthorizedAccessException)
        {
            Console.WriteLine("[Practice][Questions][Unauthorized] Missing/invalid token while loading questions.");
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Practice][Questions][Fatal] sessionId={sessionId} error={ex.Message}");
            throw new InvalidOperationException("Không tải được câu hỏi", ex);
        }
    }

    private async Task<T?> GetWithFallbackAsync<T>(params string[] endpoints) where T : class
    {
        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);
                if (!response.IsSuccessStatusCode)
                    continue;

                return await ParseApiOrRawAsync<T>(response);
            }
            catch
            {
                // thử endpoint tiếp theo
            }
        }

        return default;
    }

    private async Task<T?> PostWithFallbackAsync<T>(object? payload, params string[] endpoints) where T : class
    {
        foreach (var endpoint in endpoints)
        {
            try
            {
                HttpResponseMessage response;
                if (payload == null)
                    response = await _httpClient.PostAsync(endpoint, null);
                else
                    response = await _httpClient.PostAsJsonAsync(endpoint, payload);

                if (!response.IsSuccessStatusCode)
                    continue;

                return await ParseApiOrRawAsync<T>(response);
            }
            catch
            {
                // thử endpoint tiếp theo
            }
        }

        return default;
    }

    private static async Task<T?> ParseApiOrRawAsync<T>(HttpResponseMessage response) where T : class
    {
        var content = await response.Content.ReadAsStringAsync();
        return ParseApiOrRawFromContent<T>(content);
    }

    private async Task AttachAuthHeaderAsync()
    {
        var token = await SecureStorage.Default.GetAsync("access_token");
        if (string.IsNullOrWhiteSpace(token))
        {
            Console.WriteLine("[Auth] access_token is missing in SecureStorage.");
            _httpClient.DefaultRequestHeaders.Authorization = null;
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đã hết hạn.");
        }

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static T? ParseApiOrRawFromContent<T>(string content) where T : class
    {
        if (string.IsNullOrWhiteSpace(content))
            return default;

        try
        {
            var wrapped = JsonSerializer.Deserialize<ApiResponse<T>>(content, JsonOptions);
            if (wrapped is { Data: not null })
                return wrapped.Data;
        }
        catch
        {
            // fallback raw
        }

        try
        {
            return JsonSerializer.Deserialize<T>(content, JsonOptions);
        }
        catch
        {
            return default;
        }
    }

    private static string? ExtractCriticalSessionId(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return null;

        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            var target = root;

            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("data", out var dataElement))
                target = dataElement;

            if (target.ValueKind != JsonValueKind.Object)
                return null;

            if (TryReadSessionId(target, "sessionId", out var camelId))
                return camelId;

            if (TryReadSessionId(target, "session_id", out var snakeId))
                return snakeId;

            if (TryReadSessionId(target, "practiceSessionId", out var practiceCamelId))
                return practiceCamelId;

            if (TryReadSessionId(target, "practice_session_id", out var practiceSnakeId))
                return practiceSnakeId;

            return null;
        }
        catch
        {
            return null;
        }
    }

    private static bool TryReadSessionId(JsonElement element, string propertyName, out string? sessionId)
    {
        sessionId = null;

        if (!element.TryGetProperty(propertyName, out var idElement))
            return false;

        if (idElement.ValueKind == JsonValueKind.Number && idElement.TryGetInt64(out var numberId))
        {
            sessionId = numberId.ToString();
            return true;
        }

        if (idElement.ValueKind == JsonValueKind.String)
        {
            var value = idElement.GetString();
            if (!string.IsNullOrWhiteSpace(value))
            {
                sessionId = value;
                return true;
            }
        }

        return false;
    }

    private static string ParseDurationText(string duration)
    {
        if (TimeSpan.TryParse(duration, out var span))
            return span.ToString(@"mm\:ss");

        return "--:--";
    }

    private static PracticeTopic ToPracticeTopic(long id, string name, string? description, int questionCount, int index)
    {
        var accents = new[] { "📘", "🚦", "🛣️", "⚠️", "📙", "🧠" };
        var colors = new[] { "#7C5800", "#C62828", "#1565C0", "#8E24AA", "#2E7D32", "#455A64" };

        return new PracticeTopic
        {
            Id = (int)id,
            Name = name,
            Description = string.IsNullOrWhiteSpace(description) ? "Ôn tập theo chủ đề từ hệ thống." : description,
            QuestionCount = questionCount,
            AccentEmoji = accents[index % accents.Length],
            AccentColor = colors[index % colors.Length],
            IsRecommended = index == 0
        };
    }

    private sealed class CriticalSummaryDto
    {
        [JsonPropertyName("totalCriticalQuestions")]
        public int TotalCriticalQuestions { get; set; }

        [JsonPropertyName("totalPracticeSessions")]
        public int TotalPracticeSessions { get; set; }

        [JsonPropertyName("latestPracticeAt")]
        public DateTime? LatestPracticeAt { get; set; }
    }

    private sealed class StartCriticalPracticeRequestDto
    {
        [JsonPropertyName("size")]
        public int Size { get; set; } = 10;
    }

    private sealed class CriticalPracticeSessionDto
    {
        [JsonPropertyName("sessionId")]
        public long SessionId { get; set; }

        [JsonPropertyName("totalQuestions")]
        public int TotalQuestions { get; set; }

        [JsonPropertyName("startedAt")]
        public DateTime StartedAt { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("questionIds")]
        public List<long> QuestionIds { get; set; } = new();
    }

    private sealed class TopicV1Dto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int QuestionCount { get; set; }
    }

    private sealed class TopicDemoDto
    {
        [JsonPropertyName("topic_id")]
        public long TopicId { get; set; }

        [JsonPropertyName("ten_chu_de")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("so_cau_hoi")]
        public int QuestionCount { get; set; }
    }

    private sealed class StartPracticeRequestDto
    {
        [JsonPropertyName("topic_id")]
        public int TopicId { get; set; }

        [JsonPropertyName("so_cau_hoi")]
        public int QuestionCount { get; set; }

        [JsonPropertyName("ghi_chu")]
        public string Note { get; set; } = string.Empty;
    }

    private sealed class StartPracticeResponseDto
    {
        [JsonPropertyName("practice_session_id")]
        public long PracticeSessionId { get; set; }

        [JsonPropertyName("trang_thai")]
        public string Status { get; set; } = "DANG_LAM";

        [JsonPropertyName("thoi_gian_bat_dau")]
        public DateTime StartedAt { get; set; }

        [JsonPropertyName("so_cau_hoi")]
        public int TotalQuestions { get; set; }
    }

    private sealed class PracticeQuestionDto
    {
        [JsonPropertyName("stt")]
        public int Number { get; set; }

        [JsonPropertyName("question_id")]
        public long QuestionId { get; set; }

        [JsonPropertyName("noi_dung")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("la_cau_diem_liet")]
        public bool IsCritical { get; set; }

        [JsonPropertyName("answers")]
        public List<PracticeAnswerDto> Answers { get; set; } = new();
    }

    private sealed class PracticeAnswerDto
    {
        [JsonPropertyName("answer_id")]
        public long AnswerId { get; set; }

        [JsonPropertyName("noi_dung")]
        public string Content { get; set; } = string.Empty;
    }

    private sealed class SubmitPracticeAnswerRequestDto
    {
        [JsonPropertyName("question_id")]
        public long QuestionId { get; set; }

        [JsonPropertyName("answer_id")]
        public long AnswerId { get; set; }
    }

    private sealed class SubmitPracticeAnswerResponseDto
    {
        [JsonPropertyName("la_dung")]
        public bool IsCorrect { get; set; }

        [JsonPropertyName("dap_an_dung_id")]
        public long CorrectAnswerIdRaw { get; set; }

        [JsonPropertyName("giai_thich")]
        public string Explanation { get; set; } = string.Empty;

        [JsonIgnore]
        public string CorrectAnswerId => CorrectAnswerIdRaw.ToString();
    }

    private sealed class SubmitPracticeSessionResponseDto
    {
        [JsonPropertyName("so_cau_dung")]
        public int CorrectAnswers { get; set; }

        [JsonPropertyName("so_cau_sai")]
        public int WrongAnswers { get; set; }

        [JsonPropertyName("diem")]
        public int Score { get; set; }

        [JsonPropertyName("thoi_gian_lam_bai")]
        public string Duration { get; set; } = "00:00:00";

        [JsonPropertyName("ket_qua")]
        public string Result { get; set; } = string.Empty;
    }

    private sealed class PracticeHistoryDto
    {
        [JsonPropertyName("practice_session_id")]
        public long PracticeSessionId { get; set; }

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("so_cau")]
        public int TotalQuestions { get; set; }

        [JsonPropertyName("so_dung")]
        public int CorrectAnswers { get; set; }

        [JsonPropertyName("diem")]
        public int Score { get; set; }

        [JsonPropertyName("ngay_on_tap")]
        public DateTime PracticedAt { get; set; }
    }
}
