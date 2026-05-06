using System.Text.Json.Serialization;

namespace MauiApp1.Models;

public sealed class AiResponse
{
    public const string ChatType = "chat";
    public const string PracticeType = "practice";

    [JsonPropertyName("type")]
    public string Type { get; set; } = ChatType;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("practice")]
    public PracticeRequest? Practice { get; set; }

    public static AiResponse CreateBusyFallback(string? reason = null)
    {
        return new AiResponse
        {
            Type = ChatType,
            Message = string.IsNullOrWhiteSpace(reason)
                ? "Hiện tại AI đang bận, bạn thử lại sau nhé!"
                : $"Hiện tại AI đang bận, bạn thử lại sau nhé!\n\n[Debug] {reason}"
        };
    }
}
