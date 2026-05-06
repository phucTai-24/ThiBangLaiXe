namespace MauiApp1.ViewModels;

public sealed class ChatMessageViewModel
{
    public ChatMessageViewModel(string sender, string text, bool isFromUser)
    {
        Sender = sender;
        Text = text;
        IsFromUser = isFromUser;
        SentAt = DateTime.Now;
    }

    public string Sender { get; }

    public string Text { get; }

    public bool IsFromUser { get; }

    public DateTime SentAt { get; }

    public LayoutOptions HorizontalAlignment => IsFromUser ? LayoutOptions.End : LayoutOptions.Start;

    public Color BubbleColor => IsFromUser ? Color.FromArgb("#2563EB") : Color.FromArgb("#F2F3F5");

    public Color MessageTextColor => IsFromUser ? Colors.White : Color.FromArgb("#151515");

    public Color SenderTextColor => IsFromUser ? Color.FromArgb("#DCE8FF") : Color.FromArgb("#6F6F6F");
}
