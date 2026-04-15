namespace MauiApp1.Models;

public class PracticeTopic
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public string AccentEmoji { get; set; } = "📘";
    public string AccentColor { get; set; } = "#7C5800";
    public bool IsRecommended { get; set; }
}
