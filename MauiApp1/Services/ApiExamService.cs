using System.Net.Http.Headers;
using System.Net.Http.Json;
using MauiApp1.Models;
using MauiApp1.Models.Auth;
using MauiApp1.Models.Exams;

namespace MauiApp1.Services;

public sealed class ApiExamService : IExamService
{
    private readonly HttpClient _httpClient;
    private static readonly Dictionary<string, Exam> _examCache = new();

    public ApiExamService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<SampleExamItem>> GetSampleExamsAsync(CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync();

        var response = await _httpClient.GetFromJsonAsync<ApiResponse<PagedResponse<SampleExamItem>>>("api/v1/sample-exams?page=1&pageSize=50", cancellationToken);

        return response?.Data?.Items?
            .Where(x => string.Equals(x.Status, "published", StringComparison.OrdinalIgnoreCase))
            .OrderBy(x => x.Name)
            .ToList() ?? new List<SampleExamItem>();
    }

    public async Task<Exam> GetExamAsync(string sampleExamId)
    {
        await AttachAuthHeaderAsync();

        var startResponse = await _httpClient.PostAsync($"api/v1/exams/sample/{sampleExamId}/start", null);
        startResponse.EnsureSuccessStatusCode();

        var started = await startResponse.Content.ReadFromJsonAsync<ApiResponse<StartExamSessionResponse>>();
        if (started?.Data is null)
            throw new InvalidOperationException("Không khởi tạo được phiên thi thử.");

        var sessionId = started.Data.SessionId;

        var session = await _httpClient.GetFromJsonAsync<ApiResponse<ExamSessionDto>>($"api/v1/exams/sessions/{sessionId}");
        if (session?.Data is null)
            throw new InvalidOperationException("Không tải được thông tin phiên thi.");

        var exam = new Exam
        {
            Id = sessionId.ToString(),
            SessionId = sessionId.ToString(),
            SampleExamId = started.Data.SampleExamId.ToString(),
            Title = started.Data.SampleExamName,
            LicenseType = InferLicenseType(started.Data.SampleExamName),
            TimeLimit = started.Data.DurationMinutes * 60,
            TimeRemaining = session.Data.RemainingSeconds,
            StartTime = started.Data.StartedAt,
            Questions = new List<Question>()
        };

        for (var i = 1; i <= started.Data.TotalQuestions; i++)
        {
            var questionResponse = await _httpClient.GetFromJsonAsync<ApiResponse<ExamSessionQuestionDto>>($"api/v1/exams/sessions/{sessionId}/questions/{i}");
            if (questionResponse?.Data is null)
                continue;

            exam.Questions.Add(MapQuestion(questionResponse.Data));
        }

        _examCache[exam.Id] = exam;
        return exam;
    }

    public async Task<bool> SaveAnswerAsync(string sessionId, long questionId, long answerId, CancellationToken cancellationToken = default)
    {
        await AttachAuthHeaderAsync();

        var response = await _httpClient.PostAsJsonAsync($"api/v1/exams/sessions/{sessionId}/answers", new SubmitExamAnswerRequest
        {
            QuestionId = questionId,
            AnswerId = answerId
        }, cancellationToken);

        return response.IsSuccessStatusCode;
    }

    public async Task<bool> SubmitExamAsync(Exam exam)
    {
        await AttachAuthHeaderAsync();

        var response = await _httpClient.PostAsync($"api/v1/exams/sessions/{exam.SessionId}/submit", null);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ExamSessionResultDto>>();
        var review = await _httpClient.GetFromJsonAsync<ApiResponse<ExamSessionReviewDto>>($"api/v1/exams/sessions/{exam.SessionId}/review");

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

        var result = await _httpClient.GetFromJsonAsync<ApiResponse<ExamSessionResultDto>>($"api/v1/exams/sessions/{examId}/result");
        var review = await _httpClient.GetFromJsonAsync<ApiResponse<ExamSessionReviewDto>>($"api/v1/exams/sessions/{examId}/review");
        var session = await _httpClient.GetFromJsonAsync<ApiResponse<ExamSessionDto>>($"api/v1/exams/sessions/{examId}");

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
            IsCritical = dto.IsCritical,
            Category = dto.TopicId.ToString(),
            SelectedAnswerId = dto.SelectedAnswerId?.ToString(),
            Answers = answers
        };
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

        if (!string.IsNullOrWhiteSpace(token))
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
}
