using System.Text.Json.Serialization;

namespace MauiApp1.Models;

public sealed class PracticeRequest
{
    public const string DefaultAction = "create_session";
    public const string DefaultTopic = "traffic_sign";
    public const string DefaultSource = "random";
    public const int DefaultQuestionCount = 20;

    [JsonPropertyName("action")]
    public string Action { get; set; } = DefaultAction;

    [JsonPropertyName("topic")]
    public string Topic { get; set; } = DefaultTopic;

    [JsonPropertyName("source")]
    public string Source { get; set; } = DefaultSource;

    [JsonPropertyName("questionCount")]
    public int QuestionCount { get; set; } = DefaultQuestionCount;

    public static PracticeRequest CreateDefault()
    {
        return new PracticeRequest
        {
            Action = DefaultAction,
            Topic = DefaultTopic,
            Source = DefaultSource,
            QuestionCount = DefaultQuestionCount
        };
    }
}
