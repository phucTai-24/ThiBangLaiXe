namespace HeThongThiBangLai.Api.Domain.Constants;

public static class ExamConstants
{
    public const int DefaultDurationMinutes = 25;
    public const int PassingScorePercentage = 84;
    public const int MaxExamAttemptsPerDay = 3;
    public const int DefaultQuestionCount = 25;
    
    public const string StatusNotStarted = "not_started";
    public const string StatusInProgress = "in_progress";
    public const string StatusCompleted = "completed";
    public const string StatusExpired = "expired";
}
