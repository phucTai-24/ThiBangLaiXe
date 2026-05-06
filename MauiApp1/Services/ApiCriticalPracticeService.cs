using System.Net.Http.Headers;
using System.Net.Http.Json;
using MauiApp1.Models;
using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public sealed class ApiCriticalPracticeService(HttpClient httpClient) : ICriticalPracticeService
{
    private const string CriticalTopicCode = "CD_LIET";
    private const int CriticalQuestionsPageSize = 1000;

    public async Task<List<CriticalPracticeQuestion>> GetCriticalQuestionsAsync(int pageNumber = 1, int pageSize = 0, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync();

        var page = await GetAllCriticalQuestionPagesAsync(cancellationToken);
        var items = page.Items;

        Console.WriteLine($"[CriticalPractice] Loaded {items.Count}/{page.TotalCount} critical questions by isCritical=true.");

        if (page.TotalCount > 0 && items.Count != page.TotalCount)
            Console.WriteLine($"[CriticalPractice][Warning] Loaded item count does not match TotalCount: items={items.Count}, total={page.TotalCount}.");

        return items.Select((q, index) => new CriticalPracticeQuestion
        {
            Id = q.Id.ToString(),
            Number = index + 1,
            Content = q.Content ?? string.Empty,
            Explanation = q.Explanation,
            ImageUrl = NormalizeAssetUrl(q.ImageUrl),
            Answers = q.Answers
                .OrderBy(a => a.Order)
                .Select((a, answerIndex) => new CriticalPracticeAnswer
                {
                    Id = a.AnswerId.ToString(),
                    Label = ((char)('A' + answerIndex)).ToString(),
                    Content = a.Content ?? string.Empty,
                    IsCorrectAnswer = a.IsCorrect == true
                })
                .ToObservableCollection()
        }).ToList();
    }

    private async Task<PagedQuestionResponseDto> GetAllCriticalQuestionPagesAsync(CancellationToken cancellationToken)
    {
        var firstPage = await GetCriticalQuestionPageAsync(1, CriticalQuestionsPageSize, cancellationToken, allowTopicFallback: false);

        if (firstPage.TotalCount == 0 && firstPage.Items.Count == 0)
        {
            Console.WriteLine("[CriticalPractice][Fallback] isCritical=true returned no data. Falling back to topicCode=CD_LIET.");
            return await GetAllCriticalQuestionPagesByTopicAsync(cancellationToken);
        }

        var totalCount = Math.Max(firstPage.TotalCount, firstPage.Items.Count);
        var allItems = new List<QuestionWithAnswersDto>(firstPage.Items);
        var totalPages = Math.Max(firstPage.TotalPages, (int)Math.Ceiling(totalCount / (double)CriticalQuestionsPageSize));

        for (var pageNumber = 2; pageNumber <= totalPages; pageNumber++)
        {
            var nextPage = await GetCriticalQuestionPageAsync(pageNumber, CriticalQuestionsPageSize, cancellationToken, allowTopicFallback: false);
            allItems.AddRange(nextPage.Items);
        }

        return new PagedQuestionResponseDto
        {
            Items = allItems,
            TotalCount = totalCount,
            Page = 1,
            PageSize = CriticalQuestionsPageSize,
            TotalPages = totalPages
        };
    }

    private async Task<PagedQuestionResponseDto> GetCriticalQuestionPageAsync(int pageNumber, int pageSize, CancellationToken cancellationToken, bool allowTopicFallback)
    {
        // Lấy theo cờ la_cau_diem_liet/isCritical để bao phủ đủ toàn bộ câu điểm liệt trong DB.
        // CD_LIET chỉ dùng làm fallback khi backend chưa hỗ trợ filter isCritical.
        var endpoint = $"api/v1/questions/with-answers?isCritical=true&status=approved&page={pageNumber}&pageSize={pageSize}&includeCorrectAnswer=true";
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Phiên đăng nhập đã hết hạn.");

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(ExtractError(body) ?? "Không tải được danh sách câu điểm liệt.");

        var api = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<PagedQuestionResponseDto>>(body, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        var data = api?.Data ?? new PagedQuestionResponseDto();
        if (data.TotalCount > 0 || data.Items.Count > 0)
            return data;

        return allowTopicFallback
            ? await GetCriticalQuestionPageByTopicAsync(pageNumber, pageSize, cancellationToken)
            : data;
    }

    private async Task<PagedQuestionResponseDto> GetAllCriticalQuestionPagesByTopicAsync(CancellationToken cancellationToken)
    {
        var firstPage = await GetCriticalQuestionPageByTopicAsync(1, CriticalQuestionsPageSize, cancellationToken);
        var totalCount = Math.Max(firstPage.TotalCount, firstPage.Items.Count);
        var allItems = new List<QuestionWithAnswersDto>(firstPage.Items);
        var totalPages = Math.Max(firstPage.TotalPages, (int)Math.Ceiling(totalCount / (double)CriticalQuestionsPageSize));

        for (var pageNumber = 2; pageNumber <= totalPages; pageNumber++)
        {
            var nextPage = await GetCriticalQuestionPageByTopicAsync(pageNumber, CriticalQuestionsPageSize, cancellationToken);
            allItems.AddRange(nextPage.Items);
        }

        return new PagedQuestionResponseDto
        {
            Items = allItems,
            TotalCount = totalCount,
            Page = 1,
            PageSize = CriticalQuestionsPageSize,
            TotalPages = totalPages
        };
    }

    private async Task<PagedQuestionResponseDto> GetCriticalQuestionPageByTopicAsync(int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var endpoint = $"api/v1/questions/with-answers?topicCode={CriticalTopicCode}&page={pageNumber}&pageSize={pageSize}&includeCorrectAnswer=true";
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Phiên đăng nhập đã hết hạn.");

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(ExtractError(body) ?? "Không tải được danh sách câu điểm liệt.");

        var api = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<PagedQuestionResponseDto>>(body, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return api?.Data ?? new PagedQuestionResponseDto();
    }

    private async Task AttachAuthHeaderAsync()
    {
        var token = await SecureStorage.GetAsync("access_token");
        httpClient.DefaultRequestHeaders.Authorization = string.IsNullOrWhiteSpace(token)
            ? null
            : new AuthenticationHeaderValue("Bearer", token);
    }

    private static string? ExtractError(string content)
    {
        try
        {
            var api = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<object>>(content, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var detail = api?.Errors?.FirstOrDefault()?.Detail;
            return string.IsNullOrWhiteSpace(detail) ? api?.Message : detail;
        }
        catch
        {
            return null;
        }
    }

    private string? NormalizeAssetUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return null;

        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out _))
            return imageUrl;

        if (httpClient.BaseAddress is null)
            return imageUrl;

        return new Uri(httpClient.BaseAddress, imageUrl.TrimStart('/')).ToString();
    }

    private sealed class PagedQuestionResponseDto
    {
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public List<QuestionWithAnswersDto> Items { get; set; } = [];
    }

    private sealed class QuestionWithAnswersDto
    {
        public long Id { get; set; }
        public string? Content { get; set; }
        public string? Explanation { get; set; }
        public string? ImageUrl { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("image_url")]
        public string? ImageUrlSnake
        {
            get => ImageUrl;
            set => ImageUrl = value;
        }
        public List<QuestionAnswerOptionDto> Answers { get; set; } = [];
    }

    private sealed class QuestionAnswerOptionDto
    {
        public long AnswerId { get; set; }
        public string? Content { get; set; }
        public int Order { get; set; }
        public bool? IsCorrect { get; set; }
    }
}

file static class CriticalPracticeCollectionExtensions
{
    public static System.Collections.ObjectModel.ObservableCollection<T> ToObservableCollection<T>(this IEnumerable<T> source)
        => new(source);
}
