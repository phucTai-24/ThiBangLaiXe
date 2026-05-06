using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IChatService
{
    Task<string> SendChatMessageAsync(string userMessage, IReadOnlyList<ChatHistoryMessage> history, CancellationToken cancellationToken = default);
    AiResponse ParseAiResponse(string aiResponseJson);
}
