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
    private static readonly Dictionary<string, PracticeSession> SessionCache = new();
    private static readonly Dictionary<string, PracticeSessionResult> ResultCache = new();
    private const string FilteredSessionPrefix = "filtered-";
    private const string CriticalTopicCode = "CD_LIET";
    private const string TrafficSignsTopicCode = "CD_BH";
    private const string SituationalTopicCode = "CD_SH";

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
                .Select((x, idx) => ToPracticeTopic(x.Id, x.Code, x.Name, x.Description, x.QuestionCount, idx))
                .ToList();
        }

        var topicDemoItems = await GetWithFallbackAsync<List<TopicDemoDto>>("api/question-topics");
        if (topicDemoItems is { Count: > 0 })
        {
            return topicDemoItems
                .OrderByDescending(x => x.QuestionCount)
                .Select((x, idx) => ToPracticeTopic(x.TopicId, string.Empty, x.Name, string.Empty, x.QuestionCount, idx))
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

        SessionCache[session.Id] = session;
        return session;
    }

    public async Task<PracticeQuestionGroupCounts> GetPracticeQuestionGroupCountsAsync(string? topicCode = null)
    {
        await AttachAuthHeaderAsync();

        var questions = await LoadPracticeQuestionsWithAnswersAsync(topicCode, includeCorrectAnswer: true);
        return new PracticeQuestionGroupCounts
        {
            Theory = questions.Count(IsTheoryQuestion),
            TrafficSigns = questions.Count(IsTrafficSignQuestion),
            Situational = questions.Count(IsSituationalQuestion)
        };
    }

    public async Task<PracticeSession> StartFilteredPracticeSessionAsync(string groupCode, int questionCount, string? topicCode = null, string note = "")
    {
        await AttachAuthHeaderAsync();

        var effectiveTopicCode = string.IsNullOrWhiteSpace(topicCode)
            ? ResolvePracticeGroupTopicCode(groupCode)
            : topicCode;

        var questions = await LoadPracticeQuestionsWithAnswersAsync(effectiveTopicCode, includeCorrectAnswer: true);
        var normalizedGroupCode = groupCode.Trim().ToLowerInvariant();
        var filtered = questions
            .Where(x => ResolvePracticeGroupPredicate(normalizedGroupCode)(x))
            .OrderBy(x => x.Id)
            .Take(Math.Max(1, questionCount))
            .ToList();

        if (filtered.Count == 0 && normalizedGroupCode == "critical")
        {
            var allQuestions = await LoadPracticeQuestionsWithAnswersAsync(null, includeCorrectAnswer: true);
            filtered = allQuestions
                .Where(IsCriticalQuestion)
                .OrderBy(x => x.Id)
                .Take(Math.Max(1, questionCount))
                .ToList();
        }

        if (filtered.Count == 0)
            throw new InvalidOperationException("Không có câu hỏi phù hợp để bắt đầu ôn tập.");

        var topicName = ResolvePracticeGroupName(groupCode);

        var session = new PracticeSession
        {
            Id = $"{FilteredSessionPrefix}{groupCode}-{Guid.NewGuid():N}",
            TopicId = 0,
            TopicName = topicName,
            Status = "DANG_LAM",
            StartTime = DateTime.Now,
            TotalQuestions = filtered.Count,
            Note = note,
            Questions = filtered.Select((x, idx) => ToPracticeQuestionItem(x, idx + 1)).ToList()
        };

        SessionCache[session.Id] = session;
        return session;
    }

    public async Task<int> GetCriticalSummaryAsync()
    {
        await AttachAuthHeaderAsync();

        // Số câu điểm liệt phải lấy theo cờ la_cau_diem_liet/isCritical.
        // CD_LIET chỉ là chủ đề điểm liệt, không bao phủ hết các câu điểm liệt nằm ở chủ đề khác.
        var paged = await GetWithFallbackAsync<PagedResponse<CriticalQuestionListItemDto>>(
            "api/v1/questions/with-answers?page=1&pageSize=1&isCritical=true&status=approved",
            $"api/v1/questions/with-answers?page=1&pageSize=1&topicCode={CriticalTopicCode}");

        if (paged?.TotalCount > 0)
        {
            Console.WriteLine($"[Practice][Critical][Summary] TotalCount={paged.TotalCount} by isCritical=true.");
            return paged.TotalCount;
        }

        var criticalQuestions = await GetWithFallbackAsync<List<CriticalQuestionDto>>(
            "api/v1/critical-questions");

        return criticalQuestions?.Count ?? 0;
    }

    public async Task<string> StartCriticalPracticeAsync(int size = 10)
    {
        await AttachAuthHeaderAsync();

        try
        {
            size = size == 20 ? 20 : 10;

            var payload = new StartCriticalPracticeRequestDto
            {
                Size = size
            };

            // Ưu tiên endpoint mới nếu backend đã bổ sung.
            var response = await _httpClient.PostAsJsonAsync("api/v1/critical-questions/start-practice", payload);
            var content = await response.Content.ReadAsStringAsync();

            Console.WriteLine($"[Practice][Critical][Start] POST api/v1/critical-questions/start-practice -> {(int)response.StatusCode} {response.StatusCode}");
            if (response.IsSuccessStatusCode)
            {
                var sessionId = ExtractCriticalSessionId(content);
                if (!string.IsNullOrWhiteSpace(sessionId))
                    return sessionId;
            }

            // Fallback production: dùng wrong-questions/start-practice (đang có controller thật).
            var wrongPayload = new StartWrongPracticeRequestDto
            {
                Size = size
            };

            var wrongResponse = await _httpClient.PostAsJsonAsync("api/v1/wrong-questions/start-practice", wrongPayload);
            var wrongContent = await wrongResponse.Content.ReadAsStringAsync();

            Console.WriteLine($"[Practice][Critical][Fallback] POST api/v1/wrong-questions/start-practice -> {(int)wrongResponse.StatusCode} {wrongResponse.StatusCode}");

            if (!wrongResponse.IsSuccessStatusCode)
            {
                var errorMessage = ExtractErrorDetail(wrongContent) ?? $"Không thể bắt đầu phiên ôn tập. HTTP {(int)wrongResponse.StatusCode}";
                throw new InvalidOperationException(errorMessage);
            }

            var fallbackSessionId = ExtractCriticalSessionId(wrongContent) ?? ExtractWrongPracticeSessionId(wrongContent);
            if (string.IsNullOrWhiteSpace(fallbackSessionId))
                throw new InvalidOperationException("API start-practice không trả sessionId hợp lệ.");

            return fallbackSessionId;
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

        if (SessionCache.TryGetValue(sessionId, out var cachedSession) && cachedSession.Questions.Count > 0)
            return cachedSession;

        if (sessionId.StartsWith(FilteredSessionPrefix, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Không tìm thấy phiên ôn tập biển báo/sa hình trong bộ nhớ ứng dụng.");

        var questions = await LoadQuestionsAsync(sessionId);
        if (!SessionCache.TryGetValue(sessionId, out var session))
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
        SessionCache[sessionId] = session;

        return session;
    }

    public Task SaveLocalPracticeSessionAsync(PracticeSession session)
    {
        if (string.IsNullOrWhiteSpace(session.Id))
            session.Id = $"local-{Guid.NewGuid():N}";

        session.CreatedAt = session.CreatedAt == default ? DateTime.Now : session.CreatedAt;
        session.StartTime = session.StartTime == default ? session.CreatedAt : session.StartTime;
        session.TotalQuestions = session.Questions.Count;
        SessionCache[session.Id] = session;
        return Task.CompletedTask;
    }

    public async Task<PracticeAnswerSubmissionResult> SubmitAnswerAsync(string sessionId, string questionId, string answerId)
    {
        await AttachAuthHeaderAsync();

        if (IsLocalPracticeSession(sessionId))
            return SubmitFilteredSessionAnswer(sessionId, questionId, answerId);

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

        if (SessionCache.TryGetValue(sessionId, out var session))
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

        if (IsLocalPracticeSession(sessionId))
        {
            if (!SessionCache.TryGetValue(sessionId, out var bankSession))
                throw new InvalidOperationException("Không tìm thấy phiên ôn tập.");

            bankSession.Status = "HOAN_THANH";
            bankSession.EndTime = DateTime.Now;
            bankSession.CorrectAnswers = bankSession.Questions.Count(x => x.IsCorrectlyAnswered);
            bankSession.WrongAnswers = Math.Max(0, bankSession.TotalQuestions - bankSession.CorrectAnswers);
            bankSession.Score = bankSession.TotalQuestions > 0
                ? (int)Math.Round(bankSession.CorrectAnswers * 100.0 / bankSession.TotalQuestions)
                : 0;

            var filteredResult = new PracticeSessionResult
            {
                SessionId = sessionId,
                TopicName = bankSession.TopicName,
                TotalQuestions = bankSession.TotalQuestions,
                CorrectAnswers = bankSession.CorrectAnswers,
                WrongAnswers = bankSession.WrongAnswers,
                Score = bankSession.Score,
                ResultText = bankSession.Score >= 80 ? "Ôn tập đạt" : "Cần ôn thêm",
                DurationText = bankSession.EndTime.HasValue ? (bankSession.EndTime.Value - bankSession.StartTime).ToString(@"mm\:ss") : "--:--"
            };

            ResultCache[sessionId] = filteredResult;
            return filteredResult;
        }

        var submitted = await PostWithFallbackAsync<SubmitPracticeSessionResponseDto>(
            null,
            $"api/practice-sessions/{sessionId}/submit",
            $"api/v1/practice-sessions/{sessionId}/submit");

        if (submitted is null)
            throw new InvalidOperationException("Nộp phiên ôn tập thất bại.");

        var result = new PracticeSessionResult
        {
            SessionId = sessionId,
            TopicName = SessionCache.TryGetValue(sessionId, out var cached) ? cached.TopicName : "Ôn tập lý thuyết",
            TotalQuestions = submitted.CorrectAnswers + submitted.WrongAnswers,
            CorrectAnswers = submitted.CorrectAnswers,
            WrongAnswers = submitted.WrongAnswers,
            Score = submitted.Score,
            ResultText = string.Equals(submitted.Result, "DAT", StringComparison.OrdinalIgnoreCase) ? "Ôn tập đạt" : "Cần ôn thêm",
            DurationText = ParseDurationText(submitted.Duration)
        };

        if (SessionCache.TryGetValue(sessionId, out var session))
        {
            session.Status = "HOAN_THANH";
            session.EndTime = DateTime.Now;
            session.CorrectAnswers = result.CorrectAnswers;
            session.WrongAnswers = result.WrongAnswers;
            session.Score = result.Score;
        }

        ResultCache[sessionId] = result;
        return result;
    }

    public async Task<PracticeSessionResult> GetPracticeSessionResultAsync(string sessionId)
    {
        if (ResultCache.TryGetValue(sessionId, out var cachedResult))
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

        if (SessionCache.TryGetValue(sessionId, out var session))
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

    private static bool IsLocalPracticeSession(string sessionId)
    {
        return sessionId.StartsWith(FilteredSessionPrefix, StringComparison.OrdinalIgnoreCase)
            || sessionId.StartsWith("ai-chat-", StringComparison.OrdinalIgnoreCase)
            || sessionId.StartsWith("local-", StringComparison.OrdinalIgnoreCase);
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

            return questions.OrderBy(x => x.Number).Select(ToPracticeQuestionItem).ToList();
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

    private async Task<List<QuestionWithAnswersDto>> LoadPracticeQuestionsWithAnswersAsync(string? topicCode, bool includeCorrectAnswer)
    {
        var topicFilter = string.IsNullOrWhiteSpace(topicCode)
            ? string.Empty
            : $"&topicCode={Uri.EscapeDataString(topicCode)}";

        var firstPage = await GetWithFallbackAsync<PagedResponse<QuestionWithAnswersDto>>(
            $"api/v1/questions/with-answers?page=1&pageSize=1&status=approved&includeCorrectAnswer={includeCorrectAnswer.ToString().ToLowerInvariant()}&includeExplanation=true{topicFilter}");

        var total = Math.Max(firstPage?.TotalCount ?? 0, 1);
        var pageSize = Math.Min(Math.Max(total, 100), 500);
        var paged = await GetWithFallbackAsync<PagedResponse<QuestionWithAnswersDto>>(
            $"api/v1/questions/with-answers?page=1&pageSize={pageSize}&status=approved&includeCorrectAnswer={includeCorrectAnswer.ToString().ToLowerInvariant()}&includeExplanation=true{topicFilter}");

        if (paged?.Items is { Count: > 0 })
            return paged.Items;

        return new List<QuestionWithAnswersDto>();
    }

    private static bool IsTheoryQuestion(QuestionWithAnswersDto question) => !IsTrafficSignQuestion(question) && !IsSituationalQuestion(question);

    private static bool IsCriticalQuestion(QuestionWithAnswersDto question) => question.IsCritical || IsCriticalTopicCode(question.TopicCode);

    private static bool IsImageQuestion(QuestionWithAnswersDto question) => !string.IsNullOrWhiteSpace(question.ImageUrl);

    private static bool IsTrafficSignQuestion(QuestionWithAnswersDto question)
    {
        return question.TopicId == 5
            || IsTrafficSignTopicCode(question.TopicCode)
            || IsTrafficSignTopic(question.TopicCode)
            || IsTrafficSignTopic(question.TopicName);
    }

    private static bool IsSituationalQuestion(QuestionWithAnswersDto question)
    {
        return question.TopicId == 6
            || IsSituationalTopicCode(question.TopicCode)
            || IsSaHinhTopic(question.TopicCode)
            || IsSaHinhTopic(question.TopicName);
    }

    private static Func<QuestionWithAnswersDto, bool> ResolvePracticeGroupPredicate(string groupCode)
    {
        return groupCode.Trim().ToLowerInvariant() switch
        {
            "critical" => IsCriticalQuestion,
            "traffic-signs" => IsTrafficSignQuestion,
            "situational" => IsSituationalQuestion,
            _ => IsTheoryQuestion
        };
    }

    private static string ResolvePracticeGroupName(string groupCode)
    {
        return groupCode.Trim().ToLowerInvariant() switch
        {
            "critical" => "Ôn tập điểm liệt",
            "traffic-signs" => "Ôn tập biển báo",
            "situational" => "Ôn tập sa hình",
            _ => "Ôn tập lý thuyết"
        };
    }

    private static string? ResolvePracticeGroupTopicCode(string groupCode)
    {
        return groupCode.Trim().ToLowerInvariant() switch
        {
            "critical" => CriticalTopicCode,
            "traffic-signs" => TrafficSignsTopicCode,
            "situational" => SituationalTopicCode,
            _ => null
        };
    }

    private static bool IsTrafficSignTopicCode(string? value)
    {
        return string.Equals(value?.Trim(), TrafficSignsTopicCode, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsCriticalTopicCode(string? value)
    {
        return string.Equals(value?.Trim(), CriticalTopicCode, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSituationalTopicCode(string? value)
    {
        return string.Equals(value?.Trim(), SituationalTopicCode, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsTrafficSignTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeClassificationText(value);
        return normalized.Contains("bien bao", StringComparison.Ordinal)
            || normalized.Contains("bien_bao", StringComparison.Ordinal)
            || normalized.Contains("bien-bao", StringComparison.Ordinal)
            || normalized.Contains("bao hieu", StringComparison.Ordinal)
            || normalized.Contains("traffic sign", StringComparison.Ordinal)
            || normalized.Contains("traffic-sign", StringComparison.Ordinal)
            || normalized.Contains("traffic_sign", StringComparison.Ordinal);
    }

    private static bool IsSituationalTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeClassificationText(value);
        return normalized.Contains("sa hinh", StringComparison.Ordinal)
            || normalized.Contains("sa_hinh", StringComparison.Ordinal)
            || normalized.Contains("sa-hinh", StringComparison.Ordinal)
            || normalized.Contains("tinh huong", StringComparison.Ordinal)
            || normalized.Contains("xu ly tinh huong", StringComparison.Ordinal)
            || normalized.Contains("situation", StringComparison.Ordinal)
            || normalized.Contains("situational", StringComparison.Ordinal);
    }

    private static bool IsSaHinhTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeClassificationText(value);
        return normalized.Contains("sa hinh", StringComparison.Ordinal)
            || normalized.Contains("sa_hinh", StringComparison.Ordinal)
            || normalized.Contains("sa-hinh", StringComparison.Ordinal);
    }

    private static string NormalizeClassificationText(string value)
    {
        return RemoveVietnameseDiacritics(value).Trim().ToLowerInvariant();
    }

    private static string RemoveVietnameseDiacritics(string value)
    {
        var normalized = value.Normalize(System.Text.NormalizationForm.FormD);
        var builder = new System.Text.StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character);
            if (category != System.Globalization.UnicodeCategory.NonSpacingMark)
                builder.Append(character == 'đ' ? 'd' : character == 'Đ' ? 'D' : character);
        }

        return builder.ToString().Normalize(System.Text.NormalizationForm.FormC);
    }

    private static PracticeQuestionItem ToPracticeQuestionItem(PracticeQuestionDto question)
    {
        return new PracticeQuestionItem
        {
            Id = question.QuestionId.ToString(),
            Number = question.Number,
            Text = question.Content,
            Category = "Ôn tập lý thuyết",
            IsCritical = question.IsCritical,
            ImageUrl = NormalizeAssetUrl(question.ImageUrl),
            Explanation = question.Explanation,
            Answers = question.Answers.Select((a, idx) => new PracticeAnswerOption
            {
                Id = a.AnswerId.ToString(),
                Label = ((char)('A' + idx)).ToString(),
                Text = a.Content,
                IsCorrectAnswer = false,
                IsSelected = false,
                IsRevealed = false
            }).ToList()
        };
    }

    private static PracticeQuestionItem ToPracticeQuestionItem(QuestionWithAnswersDto question, int number)
    {
        return new PracticeQuestionItem
        {
            Id = question.Id.ToString(),
            Number = number,
            Text = question.Content,
            Category = question.TopicName,
            IsCritical = question.IsCritical,
            ImageUrl = NormalizeAssetUrl(question.ImageUrl),
            Explanation = question.Explanation,
            Answers = question.Answers.OrderBy(x => x.Order).Select((a, idx) => new PracticeAnswerOption
            {
                Id = a.AnswerId.ToString(),
                Label = ((char)('A' + idx)).ToString(),
                Text = a.Content,
                IsCorrectAnswer = a.IsCorrect == true,
                IsSelected = false,
                IsRevealed = false
            }).ToList()
        };
    }

    private PracticeAnswerSubmissionResult SubmitFilteredSessionAnswer(string sessionId, string questionId, string answerId)
    {
        if (!SessionCache.TryGetValue(sessionId, out var session))
            throw new InvalidOperationException("Không tìm thấy phiên ôn tập.");

        var question = session.Questions.FirstOrDefault(x => x.Id == questionId)
            ?? throw new InvalidOperationException("Không tìm thấy câu hỏi.");

        var selected = question.Answers.FirstOrDefault(x => x.Id == answerId)
            ?? throw new InvalidOperationException("Không tìm thấy đáp án.");

        question.SelectedAnswerId = answerId;
        question.IsAnswered = true;
        question.IsCorrectlyAnswered = selected.IsCorrectAnswer;

        foreach (var answer in question.Answers)
        {
            answer.IsSelected = answer.Id == answerId;
            answer.IsRevealed = true;
        }

        return new PracticeAnswerSubmissionResult
        {
            IsCorrect = selected.IsCorrectAnswer,
            CorrectAnswerId = question.Answers.FirstOrDefault(x => x.IsCorrectAnswer)?.Id ?? string.Empty,
            Explanation = question.Explanation
        };
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

    private static string? NormalizeAssetUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            Console.WriteLine("[Practice][Image] original=<empty> normalized=<null> extension=<none>");
            return null;
        }

        var trimmed = imageUrl.Trim();

        if (trimmed.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("[Practice][Image] original=data-image normalized=data-image extension=data");
            return trimmed;
        }

        var candidate = trimmed.Replace('\\', '/');
        if (IsRelativeAssetPath(candidate))
        {
            if (!Uri.TryCreate(ApiEndpoints.GetBaseUrl(), UriKind.Absolute, out var baseUri))
            {
                Console.WriteLine($"[Practice][Image] original={trimmed} normalized=<null> extension=<unknown> reason=invalid-base-url");
                return null;
            }

            candidate = new Uri(baseUri, NormalizeRelativeAssetPath(candidate)).ToString();
        }
        else if (IsMissingSchemeAbsoluteUrl(candidate))
        {
            candidate = $"http://{candidate}";
        }

        var escapedCandidate = Uri.EscapeUriString(candidate);
        var normalizedUrl = NormalizeLoopbackUrlForDevice(escapedCandidate);

        return ValidateAndLogAssetUrl(trimmed, normalizedUrl);
    }

    private static string? ValidateAndLogAssetUrl(string originalUrl, string normalizedUrl)
    {
        if (!Uri.TryCreate(normalizedUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            Console.WriteLine($"[Practice][Image] original={originalUrl} normalized=<null> extension=<unknown> reason=invalid-absolute-uri");
            return null;
        }

        var extension = GetImageExtension(uri);
        var isSupported = IsSupportedImageExtension(extension);
        Console.WriteLine($"[Practice][Image] original={originalUrl} normalized={uri.AbsoluteUri} extension={extension ?? "<none>"} supported={isSupported}");
        return uri.AbsoluteUri;
    }

    private static bool IsRelativeAssetPath(string value)
    {
        var normalized = value.TrimStart();
        return normalized.StartsWith("/assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("./assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("../assets", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeRelativeAssetPath(string value)
    {
        var normalized = value.Trim();
        while (normalized.StartsWith("../", StringComparison.Ordinal))
            normalized = normalized[3..];

        if (normalized.StartsWith("./", StringComparison.Ordinal))
            normalized = normalized[2..];

        return normalized.TrimStart('/');
    }

    private static bool IsMissingSchemeAbsoluteUrl(string value)
    {
        if (value.StartsWith("//", StringComparison.Ordinal))
            return true;

        var firstSlashIndex = value.IndexOf('/');
        var hostPart = firstSlashIndex >= 0 ? value[..firstSlashIndex] : value;

        return hostPart.Contains('.', StringComparison.Ordinal)
            || hostPart.Contains(':', StringComparison.Ordinal)
            || hostPart.Equals("localhost", StringComparison.OrdinalIgnoreCase);
    }

    private static string? GetImageExtension(Uri uri)
    {
        var extension = Path.GetExtension(uri.AbsolutePath);
        return string.IsNullOrWhiteSpace(extension) ? null : extension.ToLowerInvariant();
    }

    private static bool IsSupportedImageExtension(string? extension)
    {
        return extension is null
            or ".jpg"
            or ".jpeg"
            or ".png"
            or ".gif"
            or ".bmp"
            or ".webp";
    }

    private static string NormalizeLoopbackUrlForDevice(string url)
    {
        if (DeviceInfo.Platform != DevicePlatform.Android)
            return url;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return url;

        var isLoopbackHost = string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)
            || string.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase)
            || string.Equals(uri.Host, "::1", StringComparison.OrdinalIgnoreCase);

        if (!isLoopbackHost)
            return url;

        var builder = new UriBuilder(uri)
        {
            Host = "10.0.2.2"
        };

        return builder.Uri.ToString();
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

    private static string? ExtractWrongPracticeSessionId(string content)
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

            if (TryReadSessionId(target, "practiceSessionId", out var camelId))
                return camelId;

            if (TryReadSessionId(target, "practice_session_id", out var snakeId))
                return snakeId;

            return null;
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractErrorDetail(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return null;

        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;

            if (root.TryGetProperty("errors", out var errors)
                && errors.ValueKind == JsonValueKind.Array
                && errors.GetArrayLength() > 0)
            {
                var first = errors[0];
                if (first.TryGetProperty("detail", out var detail) && detail.ValueKind == JsonValueKind.String)
                    return detail.GetString();
            }

            if (root.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
                return message.GetString();
        }
        catch
        {
            // ignore
        }

        return null;
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

    private static PracticeTopic ToPracticeTopic(long id, string? code, string name, string? description, int questionCount, int index)
    {
        var accents = new[] { "📘", "🚦", "🛣️", "⚠️", "📙", "🧠" };
        var colors = new[] { "#7C5800", "#C62828", "#1565C0", "#8E24AA", "#2E7D32", "#455A64" };

        return new PracticeTopic
        {
            Id = (int)id,
            Code = code ?? string.Empty,
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

    private sealed class CriticalQuestionListItemDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }
    }

    private sealed class CriticalQuestionDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }
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

    private sealed class StartWrongPracticeRequestDto
    {
        [JsonPropertyName("size")]
        public int Size { get; set; } = 10;
    }

    private sealed class TopicV1Dto
    {
        public long Id { get; set; }
        public string Code { get; set; } = string.Empty;
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

        [JsonPropertyName("giai_thich")]
        public string Explanation { get; set; } = string.Empty;

        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }

        [JsonPropertyName("image_url")]
        public string? ImageUrlSnake
        {
            get => ImageUrl;
            set => ImageUrl = value;
        }

        [JsonPropertyName("answers")]
        public List<PracticeAnswerDto> Answers { get; set; } = new();
    }

    private sealed class QuestionWithAnswersDto
    {
        public long Id { get; set; }
        public long TopicId { get; set; }
        public string TopicCode { get; set; } = string.Empty;
        public string TopicName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string QuestionType { get; set; } = string.Empty;
        public string? Level { get; set; }
        public bool IsCritical { get; set; }
        public string Status { get; set; } = string.Empty;
        [JsonPropertyName("giai_thich")]
        public string Explanation { get; set; } = string.Empty;

        [JsonPropertyName("explanation")]
        public string ExplanationCamel
        {
            get => Explanation;
            set => Explanation = value;
        }

        [JsonPropertyName("giai_thich_dap_an")]
        public string ExplanationSnake
        {
            get => Explanation;
            set => Explanation = value;
        }

        public string? ImageUrl { get; set; }
        public List<QuestionWithAnswerOptionDto> Answers { get; set; } = new();
    }

    private sealed class QuestionWithAnswerOptionDto
    {
        public long AnswerId { get; set; }
        public string Content { get; set; } = string.Empty;
        public int Order { get; set; }
        public bool? IsCorrect { get; set; }
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
