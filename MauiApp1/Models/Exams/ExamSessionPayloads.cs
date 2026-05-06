namespace MauiApp1.Models.Exams;

using System.Text.Json.Serialization;

public sealed class StartExamSessionResponse
{
    public long SessionId { get; set; }
    public long SampleExamId { get; set; }
    public string SampleExamName { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class ExamSessionDto
{
    public long SessionId { get; set; }
    public long SampleExamId { get; set; }
    public string SampleExamName { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public decimal Score { get; set; }
    public string? Result { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int DurationMinutes { get; set; }
    public int RemainingSeconds { get; set; }
}

public sealed class ExamSessionQuestionDto
{
    public int Number { get; set; }
    public long QuestionId { get; set; }
    public string Content { get; set; } = string.Empty;
    public long TopicId { get; set; }
    public bool IsCritical { get; set; }
    public string? Explanation { get; set; }
    public long? SelectedAnswerId { get; set; }
    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("image_url")]
    public string? ImageUrlSnake
    {
        get => ImageUrl;
        set => ImageUrl = value;
    }

    [JsonPropertyName("image")]
    public string? Image
    {
        get => ImageUrl;
        set => ImageUrl = value;
    }

    public List<ExamSessionAnswerOptionDto> Answers { get; set; } = new();
}

public sealed class ExamSessionAnswerOptionDto
{
    public long AnswerId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int Order { get; set; }
}

public sealed class SubmitExamAnswerRequest
{
    public long QuestionId { get; set; }
    public long AnswerId { get; set; }
}

public sealed class ExamSessionResultDto
{
    public long SessionId { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public int UnansweredAnswers { get; set; }
    public decimal Score { get; set; }
    public string Result { get; set; } = string.Empty;
    public bool FailedByCriticalQuestion { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class ExamSessionReviewDto
{
    public long SessionId { get; set; }
    public List<ExamSessionReviewItemDto> Items { get; set; } = new();
}

public sealed class ExamSessionReviewItemDto
{
    public int Number { get; set; }
    public long QuestionId { get; set; }
    public string QuestionContent { get; set; } = string.Empty;
    public bool IsCritical { get; set; }
    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("image_url")]
    public string? ImageUrlSnake
    {
        get => ImageUrl;
        set => ImageUrl = value;
    }

    [JsonPropertyName("image")]
    public string? Image
    {
        get => ImageUrl;
        set => ImageUrl = value;
    }

    public long? SelectedAnswerId { get; set; }
    public long? CorrectAnswerId { get; set; }
    public bool? IsCorrect { get; set; }
}
