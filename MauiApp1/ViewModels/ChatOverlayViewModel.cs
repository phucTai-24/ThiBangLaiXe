using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public sealed class ChatOverlayViewModel : BaseViewModel
{
    private readonly IChatService _chatService;
    private readonly IChatPracticeService _practiceService;
    private readonly IPracticeSessionStore _practiceSessionStore;
    private bool _isChatOpen;
    private bool _isSending;
    private string _draftMessage = string.Empty;

    public ChatOverlayViewModel()
        : this(
            ResolveService<IChatService>(),
            ResolveService<IChatPracticeService>(),
            ResolveService<IPracticeSessionStore>())
    {
    }

    public ChatOverlayViewModel(
        IChatService chatService,
        IChatPracticeService practiceService,
        IPracticeSessionStore practiceSessionStore)
    {
        _chatService = chatService;
        _practiceService = practiceService;
        _practiceSessionStore = practiceSessionStore;

        Messages = new ObservableCollection<ChatMessageViewModel>
        {
            new("AI", "Chào bạn! Mình là trợ lý học tập. Bạn cần ôn phần nào hôm nay?", false),
            new("Bạn", "Mình muốn luyện câu hỏi biển báo.", true),
            new("AI", "Rất tốt. Hãy ưu tiên biển cấm, biển nguy hiểm và các câu điểm liệt trước nhé.", false)
        };

        ToggleChatCommand = new Command(ToggleChat);
        CloseChatCommand = new Command(() => IsChatOpen = false);
        SendMessageCommand = new Command(SendMessage, CanSendMessage);
    }

    public ObservableCollection<ChatMessageViewModel> Messages { get; }

    public bool IsChatOpen
    {
        get => _isChatOpen;
        set
        {
            if (SetProperty(ref _isChatOpen, value))
                OnPropertyChanged(nameof(FloatingButtonText));
        }
    }

    public string DraftMessage
    {
        get => _draftMessage;
        set
        {
            if (SetProperty(ref _draftMessage, value ?? string.Empty))
                RefreshSendCommand();
        }
    }

    public string FloatingButtonText => IsChatOpen ? "×" : "💬";

    public bool IsSending
    {
        get => _isSending;
        set
        {
            if (SetProperty(ref _isSending, value))
                RefreshSendCommand();
        }
    }

    public ICommand ToggleChatCommand { get; }

    public ICommand CloseChatCommand { get; }

    public ICommand SendMessageCommand { get; }

    private void ToggleChat()
    {
        IsChatOpen = !IsChatOpen;
    }

    private void SendMessage()
    {
        _ = SendMessageSafeAsync();
    }

    public async Task SendMessageAsync()
    {
        await SendMessageSafeAsync();
    }

    private bool CanSendMessage()
    {
        return !IsSending && !string.IsNullOrWhiteSpace(DraftMessage);
    }

    private void RefreshSendCommand()
    {
        if (SendMessageCommand is Command command)
            command.ChangeCanExecute();
    }

    private async Task SendMessageSafeAsync()
    {
        try
        {
            await SendMessageCoreAsync();
        }
        catch (Exception ex)
        {
            IsSending = false;
            Messages.Add(new ChatMessageViewModel(
                "AI",
                $"Mình chưa xử lý được tin nhắn: {ex.Message}",
                false));
        }
    }

    private async Task SendMessageCoreAsync()
    {
        if (IsSending)
            return;

        var message = DraftMessage?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(message))
            return;

        Messages.Add(new ChatMessageViewModel("Bạn", message, true));
        DraftMessage = string.Empty;

        try
        {
            IsSending = true;

            var thinkingMessage = new ChatMessageViewModel("AI", "AI đang suy nghĩ...", false);
            Messages.Add(thinkingMessage);

            var history = Messages
                .Where(item => item != thinkingMessage)
                .Select(item => new ChatHistoryMessage
                {
                    Text = item.Text,
                    IsFromUser = item.IsFromUser
                })
                .ToList();

            var aiJson = await _chatService.SendChatMessageAsync(message, history);
            var aiResponse = _chatService.ParseAiResponse(aiJson);

            var thinkingIndex = Messages.IndexOf(thinkingMessage);
            if (thinkingIndex >= 0)
                Messages[thinkingIndex] = new ChatMessageViewModel("AI", aiResponse.Message, false);
            else
                Messages.Add(new ChatMessageViewModel("AI", aiResponse.Message, false));

            if (!string.Equals(aiResponse.Type, AiResponse.PracticeType, StringComparison.OrdinalIgnoreCase) || aiResponse.Practice == null)
            {
                return;
            }

            var session = await _practiceService.CreateSessionAsync(aiResponse.Practice);
            _practiceSessionStore.SetCurrentSession(session);
            await _practiceSessionStore.SaveAsync(session);

            Messages.Add(new ChatMessageViewModel(
                "AI",
                $"Đã tạo phiên {session.TopicName.ToLowerInvariant()} gồm {session.TotalQuestions} câu. Mình sẽ chuyển bạn sang màn hình luyện tập.",
                false));

            await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={Uri.EscapeDataString(session.Id)}");
        }
        catch (Exception ex)
        {
            Messages.Add(new ChatMessageViewModel(
                "AI",
                $"Mình chưa tạo được phiên ôn tập: {ex.Message}",
                false));
        }
        finally
        {
            IsSending = false;
        }
    }

    private static T ResolveService<T>() where T : notnull
    {
        var services = IPlatformApplication.Current?.Services;
        if (services == null)
            throw new InvalidOperationException("Service provider chưa sẵn sàng.");

        return services.GetRequiredService<T>();
    }
}
