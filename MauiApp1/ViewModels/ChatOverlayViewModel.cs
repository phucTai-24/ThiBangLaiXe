using System.Collections.ObjectModel;
using System.Windows.Input;

namespace MauiApp1.ViewModels;

public sealed class ChatOverlayViewModel : BaseViewModel
{
    private bool _isChatOpen;
    private string _draftMessage = string.Empty;

    public ChatOverlayViewModel()
    {
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
            if (SetProperty(ref _draftMessage, value))
                ((Command)SendMessageCommand).ChangeCanExecute();
        }
    }

    public string FloatingButtonText => IsChatOpen ? "×" : "💬";

    public ICommand ToggleChatCommand { get; }

    public ICommand CloseChatCommand { get; }

    public ICommand SendMessageCommand { get; }

    private void ToggleChat()
    {
        IsChatOpen = !IsChatOpen;
    }

    private bool CanSendMessage()
    {
        return !string.IsNullOrWhiteSpace(DraftMessage);
    }

    private void SendMessage()
    {
        var message = DraftMessage.Trim();
        if (string.IsNullOrEmpty(message))
            return;

        Messages.Add(new ChatMessageViewModel("Bạn", message, true));
        DraftMessage = string.Empty;

        Messages.Add(new ChatMessageViewModel(
            "AI",
            "Mình đã ghi nhận. Hiện tại đây là dữ liệu mẫu, phiên bản sau có thể kết nối API trợ lý học tập.",
            false));
    }
}
