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
    private PracticeSession? _pendingPracticeSession;
    private bool _hasPendingPracticeSession;

    private static readonly string[] StartPracticeKeywords =
    {
        "bat dau on tap",
        "bat dau luyen tap",
        "bat dau",
        "vao on tap",
        "vao luyen tap"
    };

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
        StartPracticeCommand = new Command(async () => await StartPendingPracticeAsync(), () => HasPendingPracticeSession);
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

    public ICommand StartPracticeCommand { get; }

    public bool HasPendingPracticeSession
    {
        get => _hasPendingPracticeSession;
        set
        {
            if (SetProperty(ref _hasPendingPracticeSession, value) && StartPracticeCommand is Command command)
                command.ChangeCanExecute();
        }
    }

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

        if (TryHandleStartPracticeRequest(message))
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
            _pendingPracticeSession = session;
            HasPendingPracticeSession = true;

            Messages.Add(new ChatMessageViewModel(
                "AI",
                $"Đã tạo phiên {session.TopicName.ToLowerInvariant()} gồm {session.TotalQuestions} câu. Khi sẵn sàng, bạn nhắn 'bắt đầu ôn tập' để vào màn hình luyện tập.",
                false));
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

    private bool TryHandleStartPracticeRequest(string message)
    {
        var normalized = NormalizeText(message);
        var isStartIntent = StartPracticeKeywords.Any(keyword => normalized.Contains(keyword, StringComparison.Ordinal));
        if (!isStartIntent)
            return false;

        if (_pendingPracticeSession == null)
        {
            Messages.Add(new ChatMessageViewModel(
                "AI",
                "Mình chưa có phiên ôn tập nào vừa tạo. Bạn hãy nêu phần cần ôn (ví dụ: biển báo, sa hình, điểm liệt), mình sẽ tạo phiên ngay.",
                false));
            DraftMessage = string.Empty;
            return true;
        }

        var sessionId = _pendingPracticeSession.Id;
        _pendingPracticeSession = null;
        HasPendingPracticeSession = false;
        DraftMessage = string.Empty;
        _ = Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={Uri.EscapeDataString(sessionId)}");
        return true;
    }

    private async Task StartPendingPracticeAsync()
    {
        if (_pendingPracticeSession == null)
            return;

        var sessionId = _pendingPracticeSession.Id;
        _pendingPracticeSession = null;
        HasPendingPracticeSession = false;
        await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={Uri.EscapeDataString(sessionId)}");
    }

    private static string NormalizeText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var normalized = value.Trim().ToLowerInvariant();
        normalized = normalized
            .Replace("đ", "d")
            .Replace("á", "a").Replace("à", "a").Replace("ả", "a").Replace("ã", "a").Replace("ạ", "a")
            .Replace("ă", "a").Replace("ắ", "a").Replace("ằ", "a").Replace("ẳ", "a").Replace("ẵ", "a").Replace("ặ", "a")
            .Replace("â", "a").Replace("ấ", "a").Replace("ầ", "a").Replace("ẩ", "a").Replace("ẫ", "a").Replace("ậ", "a")
            .Replace("é", "e").Replace("è", "e").Replace("ẻ", "e").Replace("ẽ", "e").Replace("ẹ", "e")
            .Replace("ê", "e").Replace("ế", "e").Replace("ề", "e").Replace("ể", "e").Replace("ễ", "e").Replace("ệ", "e")
            .Replace("í", "i").Replace("ì", "i").Replace("ỉ", "i").Replace("ĩ", "i").Replace("ị", "i")
            .Replace("ó", "o").Replace("ò", "o").Replace("ỏ", "o").Replace("õ", "o").Replace("ọ", "o")
            .Replace("ô", "o").Replace("ố", "o").Replace("ồ", "o").Replace("ổ", "o").Replace("ỗ", "o").Replace("ộ", "o")
            .Replace("ơ", "o").Replace("ớ", "o").Replace("ờ", "o").Replace("ở", "o").Replace("ỡ", "o").Replace("ợ", "o")
            .Replace("ú", "u").Replace("ù", "u").Replace("ủ", "u").Replace("ũ", "u").Replace("ụ", "u")
            .Replace("ư", "u").Replace("ứ", "u").Replace("ừ", "u").Replace("ử", "u").Replace("ữ", "u").Replace("ự", "u")
            .Replace("ý", "y").Replace("ỳ", "y").Replace("ỷ", "y").Replace("ỹ", "y").Replace("ỵ", "y");

        return normalized;
    }

    private static T ResolveService<T>() where T : notnull
    {
        var services = IPlatformApplication.Current?.Services;
        if (services == null)
            throw new InvalidOperationException("Service provider chưa sẵn sàng.");

        return services.GetRequiredService<T>();
    }
}
