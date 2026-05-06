using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MauiApp1.Models;
using MauiApp1.Models.Auth;
using MauiApp1.Models.Exams;

namespace MauiApp1.Services;

public sealed class ApiExamService : IExamService
{
    private readonly HttpClient _httpClient;
    private static readonly Dictionary<string, Exam> _examCache = new();
    private static readonly Dictionary<string, SampleExamItem> _sampleExamCache = new();

    public ApiExamService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<SampleExamItem>> GetSampleExamsAsync(CancellationToken cancellationToken = default)
    {
        ClearAuthHeader();

        const int pageSize = 20;
        var allItems = new List<SampleExamItem>();
        var page = 1;
        var hasNext = true;

        while (hasNext)
        {
            var response = await _httpClient.GetFromJsonAsync<ApiResponse<PagedResponse<SampleExamItem>>>($"api/v1/mock-exams?page={page}&pageSize={pageSize}", cancellationToken);
            var data = response?.Data;

            if (data?.Items is null || data.Items.Count == 0)
                break;

            allItems.AddRange(data.Items);

            hasNext = data.HasNext || (data.TotalPages > 0 && page < data.TotalPages);
            page++;
        }

        var exams = allItems
            .Where(x => string.Equals(x.Status, "published", StringComparison.OrdinalIgnoreCase))
            .Where(x => x.TotalQuestions > 0 && x.LinkedQuestionCount == x.TotalQuestions)
            .OrderBy(x => x.Code)
            .ToList();

        foreach (var exam in exams)
            _sampleExamCache[exam.Id.ToString()] = exam;

        return exams;
    }

    public async Task<Exam> GetExamAsync(string sampleExamId)
    {
        await AttachAuthHeaderAsync();

        var sampleExam = await GetSampleExamDetailAsync(sampleExamId);

        var startResponse = await _httpClient.PostAsync($"api/v1/mock-exams/{sampleExamId}/start", null);
        await EnsureAuthorizedAsync(startResponse);
        if (!startResponse.IsSuccessStatusCode)
        {
            var message = await ReadErrorMessageAsync(startResponse, $"Không thể bắt đầu thi thử. Mã lỗi: {(int)startResponse.StatusCode}.");
            throw new InvalidOperationException(message);
        }

        var started = await startResponse.Content.ReadFromJsonAsync<ApiResponse<StartExamSessionResponse>>();
        if (started?.Data is null)
            throw new InvalidOperationException("Không khởi tạo được phiên thi thử.");

        var sessionId = started.Data.SessionId;

        var sessionResponse = await _httpClient.GetAsync($"api/v1/mock-exams/sessions/{sessionId}");
        await EnsureAuthorizedAsync(sessionResponse);
        sessionResponse.EnsureSuccessStatusCode();

        var session = await sessionResponse.Content.ReadFromJsonAsync<ApiResponse<ExamSessionDto>>();
        if (session?.Data is null)
            throw new InvalidOperationException("Không tải được thông tin phiên thi.");

        var totalQuestions = session.Data.TotalQuestions > 0
            ? session.Data.TotalQuestions
            : started.Data.TotalQuestions > 0
                ? started.Data.TotalQuestions
                : sampleExam.TotalQuestions;

        var durationMinutes = session.Data.DurationMinutes > 0
            ? session.Data.DurationMinutes
            : started.Data.DurationMinutes > 0
                ? started.Data.DurationMinutes
                : sampleExam.DurationMinutes;

        var remainingSeconds = session.Data.RemainingSeconds;

        var exam = new Exam
        {
            Id = sessionId.ToString(),
            SessionId = sessionId.ToString(),
            SampleExamId = started.Data.SampleExamId > 0 ? started.Data.SampleExamId.ToString() : sampleExamId,
            Title = !string.IsNullOrWhiteSpace(started.Data.SampleExamName)
                ? started.Data.SampleExamName
                : sampleExam.Name,
            LicenseType = InferLicenseType(!string.IsNullOrWhiteSpace(started.Data.SampleExamName)
                ? started.Data.SampleExamName
                : sampleExam.Name),
            TimeLimit = durationMinutes * 60,
            TimeRemaining = remainingSeconds,
            StartTime = started.Data.StartedAt,
            Questions = new List<Question>()
        };

        for (var i = 1; i <= totalQuestions; i++)
        {
            var questionHttpResponse = await _httpClient.GetAsync($"api/v1/mock-exams/sessions/{sessionId}/questions/{i}");
            await EnsureAuthorizedAsync(questionHttpResponse);
            questionHttpResponse.EnsureSuccessStatusCode();

            var questionResponse = await questionHttpResponse.Content.ReadFromJsonAsync<ApiResponse<ExamSessionQuestionDto>>();
            if (questionResponse?.Data is null)
                continue;

            await EnsureQuestionImageAsync(questionResponse.Data);
            exam.Questions.Add(MapQuestion(questionResponse.Data));
        }

        if (exam.Questions.Count == 0)
            throw new InvalidOperationException("Phiên thi đã tạo nhưng chưa tải được câu hỏi. Vui lòng thử lại.");

        _examCache[exam.Id] = exam;

        if (remainingSeconds <= 0)
            await SubmitExamAsync(exam);

        return exam;
    }

    private async Task<SampleExamItem> GetSampleExamDetailAsync(string sampleExamId)
    {
        if (_sampleExamCache.TryGetValue(sampleExamId, out var cachedExam))
            return cachedExam;

        ClearAuthHeader();

        var response = await _httpClient.GetAsync($"api/v1/mock-exams/{sampleExamId}");
        if (!response.IsSuccessStatusCode)
        {
            var message = await ReadErrorMessageAsync(response, $"Không tải được dữ liệu bộ đề thi thử. Mã lỗi: {(int)response.StatusCode}.");
            throw new InvalidOperationException(message);
        }

        var detailResponse = await response.Content.ReadFromJsonAsync<ApiResponse<SampleExamItem>>();
        var sampleExam = detailResponse?.Data;

        if (sampleExam is null)
            throw new InvalidOperationException("Không tải được dữ liệu bộ đề thi thử.");

        _sampleExamCache[sampleExam.Id.ToString()] = sampleExam;
        return sampleExam;
    }

    private async Task EnsureQuestionImageAsync(ExamSessionQuestionDto question)
    {
        if (!string.IsNullOrWhiteSpace(question.ImageUrl))
            return;

        try
        {
            var response = await _httpClient.GetAsync($"api/v1/questions/{question.QuestionId}");
            await EnsureAuthorizedAsync(response);

            if (!response.IsSuccessStatusCode)
                return;

            var questionDetail = await response.Content.ReadFromJsonAsync<ApiResponse<QuestionImageFallbackDto>>();
            question.ImageUrl = FirstNonEmpty(questionDetail?.Data?.ImageUrl, questionDetail?.Data?.ImageUrlSnake, questionDetail?.Data?.Image);
        }
        catch
        {
            // Mock exam still works without image if the fallback endpoint is unavailable.
        }
    }

    public async Task<bool> SaveAnswerAsync(string sessionId, long questionId, long answerId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync();

        var response = await _httpClient.PostAsJsonAsync($"api/v1/mock-exams/sessions/{sessionId}/answers", new SubmitExamAnswerRequest
        {
            QuestionId = questionId,
            AnswerId = answerId
        }, cancellationToken);

        await EnsureAuthorizedAsync(response);
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> SubmitExamAsync(Exam exam)
    {
        await AttachAuthHeaderAsync();

        var response = await _httpClient.PostAsync($"api/v1/mock-exams/sessions/{exam.SessionId}/submit", null);
        await EnsureAuthorizedAsync(response);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ExamSessionResultDto>>();
        var reviewResponse = await _httpClient.GetAsync($"api/v1/mock-exams/sessions/{exam.SessionId}/review");
        await EnsureAuthorizedAsync(reviewResponse);
        var review = reviewResponse.IsSuccessStatusCode
            ? await reviewResponse.Content.ReadFromJsonAsync<ApiResponse<ExamSessionReviewDto>>()
            : null;

        if (result?.Data is null)
            return false;

        ApplyReview(exam, review?.Data);
        exam.IsCompleted = true;
        exam.EndTime = result.Data.SubmittedAt;

        _examCache[exam.Id] = exam;
        return true;
    }

    public async Task<Exam> GetExamByIdAsync(string examId)
    {
        if (_examCache.TryGetValue(examId, out var cachedExam))
            return cachedExam;

        await AttachAuthHeaderAsync();

        var resultResponse = await _httpClient.GetAsync($"api/v1/mock-exams/sessions/{examId}/result");
        await EnsureAuthorizedAsync(resultResponse);
        var result = resultResponse.IsSuccessStatusCode
            ? await resultResponse.Content.ReadFromJsonAsync<ApiResponse<ExamSessionResultDto>>()
            : null;

        var reviewResponse = await _httpClient.GetAsync($"api/v1/mock-exams/sessions/{examId}/review");
        await EnsureAuthorizedAsync(reviewResponse);
        var review = reviewResponse.IsSuccessStatusCode
            ? await reviewResponse.Content.ReadFromJsonAsync<ApiResponse<ExamSessionReviewDto>>()
            : null;

        var sessionResponse = await _httpClient.GetAsync($"api/v1/mock-exams/sessions/{examId}");
        await EnsureAuthorizedAsync(sessionResponse);
        var session = sessionResponse.IsSuccessStatusCode
            ? await sessionResponse.Content.ReadFromJsonAsync<ApiResponse<ExamSessionDto>>()
            : null;

        if (session?.Data is null)
            return new Exam();

        var exam = new Exam
        {
            Id = examId,
            SessionId = examId,
            SampleExamId = session.Data.SampleExamId.ToString(),
            Title = session.Data.SampleExamName,
            LicenseType = InferLicenseType(session.Data.SampleExamName),
            TimeLimit = session.Data.DurationMinutes * 60,
            TimeRemaining = session.Data.RemainingSeconds,
            StartTime = session.Data.StartedAt,
            EndTime = result?.Data?.SubmittedAt,
            IsCompleted = true,
            Questions = new List<Question>()
        };

        ApplyReview(exam, review?.Data);
        _examCache[exam.Id] = exam;

        return exam;
    }

    public Task<List<Exam>> GetExamHistoryAsync()
    {
        return Task.FromResult(_examCache.Values.Where(x => x.IsCompleted).OrderByDescending(x => x.EndTime).ToList());
    }

    private static string InferLicenseType(string sampleExamName)
    {
        if (sampleExamName.Contains("A1", StringComparison.OrdinalIgnoreCase))
            return "A1";

        if (sampleExamName.Contains("A2", StringComparison.OrdinalIgnoreCase))
            return "A2";

        return "A1/A";
    }

    private static Question MapQuestion(ExamSessionQuestionDto dto)
    {
        var answers = dto.Answers
            .OrderBy(x => x.Order)
            .Select((x, index) => new Answer
            {
                Id = x.AnswerId.ToString(),
                Label = ((char)('A' + index)).ToString(),
                Text = x.Content,
                IsCorrect = false,
                IsSelected = dto.SelectedAnswerId == x.AnswerId
            })
            .ToList();

        return new Question
        {
            Id = dto.QuestionId.ToString(),
            Number = dto.Number,
            Text = dto.Content,
            ImageUrl = NormalizeAssetUrl(dto.ImageUrl),
            IsCritical = dto.IsCritical,
            Category = dto.TopicId.ToString(),
            SelectedAnswerId = dto.SelectedAnswerId?.ToString(),
            Answers = answers
        };
    }

    private static string? NormalizeAssetUrl(string? assetUrl)
    {
        if (string.IsNullOrWhiteSpace(assetUrl))
        {
            Console.WriteLine("[MockExam][Image] original=<empty> normalized=<null> extension=<none>");
            return null;
        }

        var trimmed = assetUrl.Trim();
        if (trimmed.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("[MockExam][Image] original=data-image normalized=data-image extension=data");
            return trimmed;
        }

        var candidate = trimmed.Replace('\\', '/');

        if (candidate.StartsWith("//", StringComparison.Ordinal))
        {
            candidate = $"http:{candidate}";
        }
        else if (IsRelativeAssetPath(candidate))
        {
            if (!Uri.TryCreate(ApiEndpoints.GetBaseUrl(), UriKind.Absolute, out var baseUri))
            {
                Console.WriteLine($"[MockExam][Image] original={trimmed} normalized=<null> extension=<unknown> reason=invalid-base-url");
                return null;
            }

            candidate = new Uri(baseUri, NormalizeRelativeAssetPath(candidate)).ToString();
        }
        else if (IsMissingSchemeAbsoluteUrl(candidate))
        {
            candidate = $"http://{candidate}";
        }
        else if (!Uri.TryCreate(candidate, UriKind.Absolute, out _))
        {
            if (!Uri.TryCreate(ApiEndpoints.GetBaseUrl(), UriKind.Absolute, out var baseUri))
            {
                Console.WriteLine($"[MockExam][Image] original={trimmed} normalized=<null> extension=<unknown> reason=invalid-base-url");
                return null;
            }

            candidate = new Uri(baseUri, NormalizeRelativeAssetPath(candidate)).ToString();
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
            Console.WriteLine($"[MockExam][Image] original={originalUrl} normalized=<null> extension=<unknown> reason=invalid-absolute-uri");
            return null;
        }

        var extension = Path.GetExtension(uri.AbsolutePath);
        var normalizedExtension = string.IsNullOrWhiteSpace(extension) ? null : extension.ToLowerInvariant();
        Console.WriteLine($"[MockExam][Image] original={originalUrl} normalized={uri.AbsoluteUri} extension={normalizedExtension ?? "<none>"}");
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

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return null;
    }

    private static void ApplyReview(Exam exam, ExamSessionReviewDto? review)
    {
        if (review is null)
            return;

        if (exam.Questions.Any())
        {
            var reviewMap = review.Items.ToDictionary(x => x.QuestionId);

            foreach (var question in exam.Questions)
            {
                if (!long.TryParse(question.Id, out var questionId) || !reviewMap.TryGetValue(questionId, out var item))
                    continue;

                question.Number = item.Number;
                question.Text = item.QuestionContent;
                question.ImageUrl = NormalizeAssetUrl(item.ImageUrl) ?? question.ImageUrl;
                question.IsCritical = item.IsCritical;
                question.SelectedAnswerId = item.SelectedAnswerId?.ToString();

                foreach (var answer in question.Answers)
                {
                    answer.IsCorrect = answer.Id == item.CorrectAnswerId?.ToString();
                    answer.IsSelected = answer.Id == item.SelectedAnswerId?.ToString();
                }
            }

            return;
        }

        exam.Questions = review.Items
            .OrderBy(x => x.Number)
            .Select(item =>
            {
                var answers = new List<Answer>();

                if (item.SelectedAnswerId.HasValue)
                {
                    answers.Add(new Answer
                    {
                        Id = item.SelectedAnswerId.Value.ToString(),
                        Label = "Bạn chọn",
                        Text = item.SelectedAnswerId == item.CorrectAnswerId ? "Đáp án đã chọn" : "Đáp án bạn đã chọn",
                        IsCorrect = item.SelectedAnswerId == item.CorrectAnswerId,
                        IsSelected = true
                    });
                }

                if (item.CorrectAnswerId.HasValue && item.CorrectAnswerId != item.SelectedAnswerId)
                {
                    answers.Add(new Answer
                    {
                        Id = item.CorrectAnswerId.Value.ToString(),
                        Label = "Đúng",
                        Text = "Đáp án đúng",
                        IsCorrect = true,
                        IsSelected = false
                    });
                }

                return new Question
                {
                    Id = item.QuestionId.ToString(),
                    Number = item.Number,
                    Text = item.QuestionContent,
                    ImageUrl = NormalizeAssetUrl(item.ImageUrl),
                    IsCritical = item.IsCritical,
                    SelectedAnswerId = item.SelectedAnswerId?.ToString(),
                    Answers = answers
                };
            })
            .ToList();
    }

    private async Task AttachAuthHeaderAsync()
    {
        var token = await SecureStorage.Default.GetAsync("access_token");

        if (string.IsNullOrWhiteSpace(token))
        {
            ClearAuthHeader();
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đã hết hạn.");
        }

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private void ClearAuthHeader()
    {
        _httpClient.DefaultRequestHeaders.Authorization = null;
    }

    private static async Task EnsureAuthorizedAsync(HttpResponseMessage response)
    {
        if (response.StatusCode != System.Net.HttpStatusCode.Unauthorized)
            return;

        SecureStorage.Default.Remove("access_token");
        throw new UnauthorizedAccessException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    private static async Task<string> ReadErrorMessageAsync(HttpResponseMessage response, string fallbackMessage)
    {
        try
        {
            var json = await response.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(json))
                return fallbackMessage;

            var error = JsonSerializer.Deserialize<ApiResponse<object>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return error?.Errors?.FirstOrDefault()?.Detail
                ?? error?.Message
                ?? fallbackMessage;
        }
        catch
        {
            return fallbackMessage;
        }
    }

    private sealed class QuestionImageFallbackDto
    {
        public string? ImageUrl { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("image_url")]
        public string? ImageUrlSnake { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("image")]
        public string? Image { get; set; }
    }
}
