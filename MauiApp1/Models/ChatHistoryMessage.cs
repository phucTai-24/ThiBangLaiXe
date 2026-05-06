namespace MauiApp1.Models;

public sealed class ChatHistoryMessage
{
    public string Text { get; set; } = string.Empty;
    public bool IsFromUser { get; set; }
}
