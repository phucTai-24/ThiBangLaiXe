namespace HeThongThiBangLai.Api.Configurations;

public class ExamOptions
{
    public const string SectionName = "Exam";

    public int DefaultDurationMinutes { get; set; } = 25;
    public int PassingScorePercentage { get; set; } = 84;
    public int MaxExamAttemptsPerDay { get; set; } = 3;
}
