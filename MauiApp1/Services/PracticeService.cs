using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MauiApp1.Models;
using MauiApp1.Models.Auth;
using MauiApp1.Models.Exams;

namespace MauiApp1.Services;

public sealed class PracticeService : IChatPracticeService
{
    private const string GeneratedSessionPrefix = "ai-chat-";
    private const string CriticalTopicCode = "CD_LIET";
    private const string TrafficSignsTopicCode = "CD_BH";
    private const string SimulationTopicCode = "CD_SH";
    private const string RulesTopicCode = "CD_QTGT";
    private const string CultureTopicCode = "CD_VH";
    private const string TechnicalTopicCode = "CD_KT";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly IPracticeService _practiceService;

    public PracticeService(HttpClient httpClient, IPracticeService practiceService)
    {
        _httpClient = httpClient;
        _practiceService = practiceService;
    }

    public async Task<PracticeSession> CreateSessionAsync(PracticeRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedTopics = ResolveRequestedTopics(request.Topic);
        var normalizedSource = string.Equals(request.Source, "wrong", StringComparison.OrdinalIgnoreCase) ? "wrong" : "random";
        var questionCount = request.QuestionCount is >= 1 and <= 100 ? request.QuestionCount : PracticeRequest.DefaultQuestionCount;

        var questions = normalizedSource == "wrong"
            ? await GetWrongQuestionsAsync(string.Join(",", normalizedTopics), cancellationToken)
            : await GetQuestionsByTopicAsync(string.Join(",", normalizedTopics), cancellationToken);

        if (normalizedSource == "wrong" && questions.Count == 0)
            questions = await GetQuestionsByTopicAsync(string.Join(",", normalizedTopics), cancellationToken);

        var selectedQuestions = questions
            .OrderBy(_ => Random.Shared.Next())
            .Take(questionCount)
            .Select((question, index) => CloneQuestionForSession(question, index + 1))
            .ToList();

        if (selectedQuestions.Count == 0)
            throw new InvalidOperationException("Không tìm thấy câu hỏi phù hợp để tạo phiên ôn tập.");

        var now = DateTime.Now;
        var session = new PracticeSession
        {
            Id = $"{GeneratedSessionPrefix}{Guid.NewGuid():N}",
            TopicId = 0,
            TopicName = ResolveTopicName(normalizedTopics),
            Status = "DANG_LAM",
            StartTime = now,
            CreatedAt = now,
            TotalQuestions = selectedQuestions.Count,
            Note = $"AI chat: {normalizedSource}/{string.Join(',', normalizedTopics)}",
            Questions = selectedQuestions
        };

        await _practiceService.SaveLocalPracticeSessionAsync(session);
        return session;
    }

    public async Task<List<PracticeQuestionItem>> GetQuestionsByTopicAsync(string topic, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync();
        var normalizedTopics = ResolveRequestedTopics(topic);
        var questions = new List<QuestionDto>();

        foreach (var normalizedTopic in normalizedTopics)
        {
            var topicQuestions = await LoadQuestionsWithAnswersAsync(ResolveTopicCode(normalizedTopic), cancellationToken);
            questions.AddRange(topicQuestions);
        }

        return questions
            .GroupBy(question => ResolveString(question.Id, question.QuestionId, question.Question?.Id, question.Question?.QuestionId))
            .Select(group => group.First())
            .Where(question => normalizedTopics.Any(topic => MatchesTopic(question, topic)))
            .Select((question, index) => ToPracticeQuestionItem(question, index + 1))
            .ToList();
    }

    public async Task<List<PracticeQuestionItem>> GetWrongQuestionsAsync(string topic, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync();
        var normalizedTopics = ResolveRequestedTopics(topic);
        var wrongQuestions = await LoadWrongQuestionsAsync(cancellationToken);

        return wrongQuestions
            .Where(question => normalizedTopics.Any(topic => MatchesTopic(question, topic)))
            .Select((question, index) => ToPracticeQuestionItem(question, index + 1))
            .ToList();
    }

    private async Task<List<QuestionDto>> LoadQuestionsWithAnswersAsync(string? topicCode, CancellationToken cancellationToken)
    {
        var topicFilter = string.IsNullOrWhiteSpace(topicCode) ? string.Empty : $"&topicCode={Uri.EscapeDataString(topicCode)}";
        var firstPage = await GetRawOrWrappedAsync<PagedResponse<QuestionDto>>($"api/v1/questions/with-answers?page=1&pageSize=1&status=approved&includeCorrectAnswer=true&includeExplanation=true{topicFilter}", cancellationToken);
        var totalCount = Math.Max(firstPage?.TotalCount ?? 0, 1);
        var pageSize = Math.Min(Math.Max(totalCount, 100), 500);
        var page = await GetRawOrWrappedAsync<PagedResponse<QuestionDto>>($"api/v1/questions/with-answers?page=1&pageSize={pageSize}&status=approved&includeCorrectAnswer=true&includeExplanation=true{topicFilter}", cancellationToken);

        if (page?.Items is { Count: > 0 })
            return page.Items;

        var list = await GetRawOrWrappedAsync<List<QuestionDto>>("api/v1/questions", cancellationToken);
        return list ?? new List<QuestionDto>();
    }

    private async Task<List<QuestionDto>> LoadWrongQuestionsAsync(CancellationToken cancellationToken)
    {
        var page = await GetRawOrWrappedAsync<PagedResponse<QuestionDto>>("api/v1/wrong-questions?page=1&pageSize=500&includeCorrectAnswer=true&includeExplanation=true", cancellationToken);
        if (page?.Items is { Count: > 0 })
            return page.Items;

        var list = await GetRawOrWrappedAsync<List<QuestionDto>>("api/v1/wrong-questions", cancellationToken);
        return list ?? new List<QuestionDto>();
    }

    private async Task<T?> GetRawOrWrappedAsync<T>(string endpoint, CancellationToken cancellationToken) where T : class
    {
        try
        {
            using var response = await _httpClient.GetAsync(endpoint, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return default;

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(content))
                return default;

            try
            {
                var wrapped = JsonSerializer.Deserialize<ApiResponse<T>>(content, JsonOptions);
                if (wrapped?.Data is not null)
                    return wrapped.Data;
            }
            catch
            {
                // Fallback raw JSON below.
            }

            return JsonSerializer.Deserialize<T>(content, JsonOptions);
        }
        catch
        {
            return default;
        }
    }

    private async Task AttachAuthHeaderAsync()
    {
        var token = await SecureStorage.Default.GetAsync("access_token");
        _httpClient.DefaultRequestHeaders.Authorization = string.IsNullOrWhiteSpace(token)
            ? null
            : new AuthenticationHeaderValue("Bearer", token);
    }

    private static PracticeQuestionItem ToPracticeQuestionItem(QuestionDto question, int number)
    {
        return new PracticeQuestionItem
        {
            Id = ResolveString(question.Id, question.QuestionId, question.Question?.Id, question.Question?.QuestionId),
            Number = number,
            Text = FirstNonEmpty(question.Content, question.Text, question.QuestionText, question.Question?.Content, question.Question?.Text, question.Question?.QuestionText),
            Category = FirstNonEmpty(question.TopicName, question.Category, question.Question?.TopicName, question.Question?.Category, ResolveSingleTopicName(NormalizeTopic(question.TopicCode))),
            IsCritical = question.IsCritical || question.Question?.IsCritical == true || IsCriticalTopic(question.TopicCode) || IsCriticalTopic(question.Question?.TopicCode),
            ImageUrl = NormalizeAssetUrl(FirstNonEmpty(question.ImageUrl, question.Image, question.Question?.ImageUrl, question.Question?.Image)),
            Explanation = FirstNonEmpty(question.Explanation, question.ExplanationSnake, question.ExplanationAnswer, question.Question?.Explanation, question.Question?.ExplanationSnake, question.Question?.ExplanationAnswer),
            Answers = ResolveAnswers(question).Select((answer, index) => new PracticeAnswerOption
            {
                Id = ResolveString(answer.Id, answer.AnswerId),
                Label = ((char)('A' + index)).ToString(),
                Text = FirstNonEmpty(answer.Content, answer.Text, answer.AnswerText),
                IsCorrectAnswer = answer.IsCorrect == true || answer.IsCorrectAnswer == true,
                IsSelected = false,
                IsRevealed = false
            }).ToList()
        };
    }

    private static PracticeQuestionItem CloneQuestionForSession(PracticeQuestionItem question, int number)
    {
        return new PracticeQuestionItem
        {
            Id = question.Id,
            Number = number,
            Text = question.Text,
            Category = question.Category,
            IsCritical = question.IsCritical,
            ImageUrl = question.ImageUrl,
            Explanation = question.Explanation,
            Answers = question.Answers.Select(answer => new PracticeAnswerOption
            {
                Id = answer.Id,
                Label = answer.Label,
                Text = answer.Text,
                IsCorrectAnswer = answer.IsCorrectAnswer,
                IsSelected = false,
                IsRevealed = false
            }).ToList()
        };
    }

    private static List<AnswerDto> ResolveAnswers(QuestionDto question)
    {
        var answers = question.Answers is { Count: > 0 } ? question.Answers : question.Question?.Answers ?? new List<AnswerDto>();
        return answers.OrderBy(answer => answer.Order).ToList();
    }

    private static bool MatchesTopic(QuestionDto question, string topic)
    {
        return topic switch
        {
            "critical" => question.IsCritical || question.Question?.IsCritical == true || IsCriticalTopic(question.TopicCode) || IsCriticalTopic(question.TopicName) || IsCriticalTopic(question.Question?.TopicCode) || IsCriticalTopic(question.Question?.TopicName),
            "simulation" => IsSimulationTopic(question.TopicCode) || IsSimulationTopic(question.TopicName) || IsSimulationTopic(question.Category) || IsSimulationTopic(question.Question?.TopicCode) || IsSimulationTopic(question.Question?.TopicName),
            "rules" => IsRulesTopic(question.TopicCode) || IsRulesTopic(question.TopicName) || IsRulesTopic(question.Category) || IsRulesTopic(question.Question?.TopicCode) || IsRulesTopic(question.Question?.TopicName),
            "technical" => IsTechnicalTopic(question.TopicCode) || IsTechnicalTopic(question.TopicName) || IsTechnicalTopic(question.Category) || IsTechnicalTopic(question.Question?.TopicCode) || IsTechnicalTopic(question.Question?.TopicName),
            "culture" => IsCultureTopic(question.TopicCode) || IsCultureTopic(question.TopicName) || IsCultureTopic(question.Category) || IsCultureTopic(question.Question?.TopicCode) || IsCultureTopic(question.Question?.TopicName),
            _ => IsTrafficSignTopic(question.TopicCode) || IsTrafficSignTopic(question.TopicName) || IsTrafficSignTopic(question.Category) || IsTrafficSignTopic(question.Question?.TopicCode) || IsTrafficSignTopic(question.Question?.TopicName)
        };
    }

    private static List<string> ResolveRequestedTopics(string? topic)
    {
        var parts = (topic ?? string.Empty)
            .Split(new[] { ',', '|', ';', '+', '&' }, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(NormalizeTopic)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (parts.Count == 0 || parts.Contains("mixed", StringComparer.OrdinalIgnoreCase))
            return new List<string> { "traffic_sign", "simulation", "critical", "rules", "technical", "culture" };

        return parts;
    }

    private static string NormalizeTopic(string? topic)
    {
        return topic?.Trim().ToLowerInvariant() switch
        {
            "critical" => "critical",
            "simulation" or "situational" or "sa_hinh" or "sa-hinh" or "cd_sh" => "simulation",
            "traffic_sign" or "traffic-sign" or "traffic signs" or "traffic_signs" or "cd_bh" => "traffic_sign",
            "rules" or "rule" or "theory" or "traffic_rules" or "traffic-rules" or "cd_qtgt" => "rules",
            "technical" or "technique" or "driving_technique" or "driving-technique" or "cd_kt" => "technical",
            "culture" or "ethics" or "driving_culture" or "driving-culture" or "cd_vh" => "culture",
            "mixed" or "all" or "general" or "random" => "mixed",
            _ => string.Empty
        };
    }

    private static string? ResolveTopicCode(string topic)
    {
        return topic switch
        {
            "critical" => CriticalTopicCode,
            "simulation" => SimulationTopicCode,
            "traffic_sign" => TrafficSignsTopicCode,
            "rules" => RulesTopicCode,
            "technical" => TechnicalTopicCode,
            "culture" => CultureTopicCode,
            _ => null
        };
    }

    private static string ResolveTopicName(IReadOnlyList<string> topics)
    {
        if (topics.Count != 1)
            return "Ôn tập tổng hợp";

        return ResolveSingleTopicName(topics[0]);
    }

    private static string ResolveSingleTopicName(string topic)
    {
        return topic switch
        {
            "critical" => "Ôn tập điểm liệt",
            "simulation" => "Ôn tập sa hình",
            "rules" => "Ôn tập quy tắc giao thông",
            "technical" => "Ôn tập kỹ thuật lái xe",
            "culture" => "Ôn tập văn hóa lái xe",
            _ => "Ôn tập biển báo"
        };
    }

    private static bool IsTrafficSignTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeText(value);
        return string.Equals(value.Trim(), TrafficSignsTopicCode, StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("bien bao", StringComparison.Ordinal)
            || normalized.Contains("bao hieu", StringComparison.Ordinal)
            || normalized.Contains("traffic sign", StringComparison.Ordinal)
            || normalized.Contains("traffic_sign", StringComparison.Ordinal);
    }

    private static bool IsSimulationTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeText(value);
        return string.Equals(value.Trim(), SimulationTopicCode, StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("sa hinh", StringComparison.Ordinal)
            || normalized.Contains("mo phong", StringComparison.Ordinal)
            || normalized.Contains("tinh huong", StringComparison.Ordinal)
            || normalized.Contains("simulation", StringComparison.Ordinal);
    }

    private static bool IsCriticalTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeText(value);
        return string.Equals(value.Trim(), CriticalTopicCode, StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("diem liet", StringComparison.Ordinal)
            || normalized.Contains("cau liet", StringComparison.Ordinal)
            || normalized.Contains("critical", StringComparison.Ordinal);
    }

    private static bool IsRulesTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeText(value);
        return string.Equals(value.Trim(), RulesTopicCode, StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("quy tac", StringComparison.Ordinal)
            || normalized.Contains("luat giao thong", StringComparison.Ordinal)
            || normalized.Contains("ly thuyet", StringComparison.Ordinal)
            || normalized.Contains("traffic rule", StringComparison.Ordinal);
    }

    private static bool IsTechnicalTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeText(value);
        return string.Equals(value.Trim(), TechnicalTopicCode, StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("ky thuat", StringComparison.Ordinal)
            || normalized.Contains("ky nang lai", StringComparison.Ordinal)
            || normalized.Contains("driving technique", StringComparison.Ordinal);
    }

    private static bool IsCultureTopic(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = NormalizeText(value);
        return string.Equals(value.Trim(), CultureTopicCode, StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("van hoa", StringComparison.Ordinal)
            || normalized.Contains("dao duc", StringComparison.Ordinal)
            || normalized.Contains("ethic", StringComparison.Ordinal);
    }

    private static string NormalizeText(string value)
    {
        var normalized = value.Normalize(System.Text.NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character);
            if (category != System.Globalization.UnicodeCategory.NonSpacingMark)
                builder.Append(character == 'đ' ? 'd' : character == 'Đ' ? 'D' : character);
        }

        return builder.ToString().Normalize(System.Text.NormalizationForm.FormC).Trim().ToLowerInvariant();
    }

    private static string FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? string.Empty;
    }

    private static string ResolveString(params long?[] values)
    {
        return values.FirstOrDefault(value => value.GetValueOrDefault() > 0)?.ToString() ?? string.Empty;
    }

    private static string? NormalizeAssetUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return null;

        var trimmed = imageUrl.Trim();

        if (trimmed.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        var candidate = trimmed.Replace('\\', '/');
        if (IsRelativeAssetPath(candidate))
        {
            if (!Uri.TryCreate(ApiEndpoints.GetBaseUrl(), UriKind.Absolute, out var baseUri))
                return null;

            candidate = new Uri(baseUri, NormalizeRelativeAssetPath(candidate)).ToString();
        }
        else if (IsMissingSchemeAbsoluteUrl(candidate))
        {
            candidate = $"http://{candidate}";
        }
        else if (!Uri.TryCreate(candidate, UriKind.Absolute, out _))
        {
            candidate = $"{ApiEndpoints.GetBaseUrl().TrimEnd('/')}/{candidate.TrimStart('/')}";
        }

        var escapedCandidate = Uri.EscapeUriString(candidate);
        var normalizedUrl = NormalizeLoopbackUrlForDevice(escapedCandidate);

        return Uri.TryCreate(normalizedUrl, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            ? uri.AbsoluteUri
            : null;
    }

    private static bool IsRelativeAssetPath(string value)
    {
        var normalized = value.TrimStart();
        return normalized.StartsWith("/assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("./assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("../assets", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("uploads", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("./uploads", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("../uploads", StringComparison.OrdinalIgnoreCase);
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

    private sealed class QuestionDto
    {
        public long? Id { get; set; }
        public long? QuestionId { get; set; }
        public string? Content { get; set; }
        public string? Text { get; set; }
        public string? QuestionText { get; set; }
        public string? TopicCode { get; set; }
        public string? TopicName { get; set; }
        public string? Category { get; set; }
        public bool IsCritical { get; set; }
        public string? Explanation { get; set; }

        [JsonPropertyName("giai_thich")]
        public string? ExplanationSnake { get; set; }

        [JsonPropertyName("giai_thich_dap_an")]
        public string? ExplanationAnswer { get; set; }

        public string? ImageUrl { get; set; }
        [JsonPropertyName("image_url")]
        public string? ImageUrlSnake
        {
            get => ImageUrl;
            set => ImageUrl = value;
        }

        [JsonPropertyName("hinh_anh")]
        public string? ImageUrlVietnamese
        {
            get => ImageUrl;
            set => ImageUrl = value;
        }

        public string? Image { get; set; }
        public List<AnswerDto> Answers { get; set; } = new();
        public QuestionDto? Question { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
    }

    private sealed class AnswerDto
    {
        public long? Id { get; set; }
        public long? AnswerId { get; set; }
        public string? Content { get; set; }
        public string? Text { get; set; }
        public string? AnswerText { get; set; }
        public int Order { get; set; }
        public bool? IsCorrect { get; set; }
        public bool? IsCorrectAnswer { get; set; }
    }
}
