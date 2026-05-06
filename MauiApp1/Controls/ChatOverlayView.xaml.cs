using System.Collections.Specialized;
using System.ComponentModel;
using MauiApp1.ViewModels;

namespace MauiApp1.Controls;

public partial class ChatOverlayView : ContentView
{
    private const double BubbleSize = 56;
    private const double SafeMargin = 20;
    private const double DefaultBottomOffset = 104;
    private const double DragThreshold = 8;
    private const string BubbleTranslationXKey = "ChatBubble.TranslationX";
    private const string BubbleTranslationYKey = "ChatBubble.TranslationY";

    private readonly ChatOverlayViewModel _viewModel;
    private double _dragStartX;
    private double _dragStartY;
    private bool _hasDraggedFloatingButton;
    private bool _suppressNextTap;
    private bool _hasRestoredBubblePosition;

    public ChatOverlayView()
    {
        InitializeComponent();

        _viewModel = new ChatOverlayViewModel();
        BindingContext = _viewModel;

        _viewModel.PropertyChanged += OnViewModelPropertyChanged;
        _viewModel.Messages.CollectionChanged += OnMessagesCollectionChanged;
        SizeChanged += OnSizeChanged;
    }

    private async void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(ChatOverlayViewModel.IsChatOpen))
            await AnimatePopupAsync(_viewModel.IsChatOpen);
    }

    private async Task AnimatePopupAsync(bool isOpen)
    {
        if (isOpen)
        {
            ChatPopup.IsVisible = true;
            await Task.WhenAll(
                ChatPopup.FadeTo(1, 210, Easing.CubicOut),
                ChatPopup.ScaleTo(1, 210, Easing.CubicOut));
            ScrollMessagesToEnd();
            return;
        }

        await Task.WhenAll(
            ChatPopup.FadeTo(0, 150, Easing.CubicIn),
            ChatPopup.ScaleTo(0.96, 150, Easing.CubicIn));
        ChatPopup.IsVisible = false;
    }

    private void OnSizeChanged(object? sender, EventArgs e)
    {
        if (_hasRestoredBubblePosition || Width <= 0 || Height <= 0)
            return;

        _hasRestoredBubblePosition = true;
        RestoreFloatingButtonPosition();
    }

    private void OnFloatingButtonTapped(object? sender, TappedEventArgs e)
    {
        if (_suppressNextTap)
            return;

        if (_viewModel.ToggleChatCommand.CanExecute(null))
            _viewModel.ToggleChatCommand.Execute(null);
    }

    private void OnFloatingButtonPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        switch (e.StatusType)
        {
            case GestureStatus.Started:
                FloatingButton.AbortAnimation(nameof(FloatingButton));
                _dragStartX = FloatingButton.TranslationX;
                _dragStartY = FloatingButton.TranslationY;
                _hasDraggedFloatingButton = false;
                _ = FloatingButton.ScaleTo(1.08, 90, Easing.CubicOut);
                break;

            case GestureStatus.Running:
                var nextX = _dragStartX + e.TotalX;
                var nextY = _dragStartY + e.TotalY;

                FloatingButton.TranslationX = Clamp(nextX, GetMinTranslationX(), GetMaxTranslationX());
                FloatingButton.TranslationY = Clamp(nextY, GetMinTranslationY(), GetMaxTranslationY());
                _hasDraggedFloatingButton = Math.Abs(e.TotalX) > DragThreshold || Math.Abs(e.TotalY) > DragThreshold;
                break;

            case GestureStatus.Completed:
            case GestureStatus.Canceled:
                if (_hasDraggedFloatingButton)
                {
                    _suppressNextTap = true;
                    _ = ResetTapSuppressionAsync();
                    _ = SnapFloatingButtonToNearestEdgeAsync();
                    return;
                }

                _ = FloatingButton.ScaleTo(1, 90, Easing.CubicOut);
                break;
        }
    }

    private async Task SnapFloatingButtonToNearestEdgeAsync()
    {
        var currentCenterX = Width - SafeMargin - BubbleSize / 2 + FloatingButton.TranslationX;
        var snapX = currentCenterX < Width / 2 ? GetMinTranslationX() : GetMaxTranslationX();
        var snapY = Clamp(FloatingButton.TranslationY, GetMinTranslationY(), GetMaxTranslationY());

        await Task.WhenAll(
            FloatingButton.TranslateTo(snapX, snapY, 220, Easing.CubicOut),
            FloatingButton.ScaleTo(1, 140, Easing.CubicOut));

        SaveFloatingButtonPosition();
    }

    private async Task ResetTapSuppressionAsync()
    {
        await Task.Delay(250);
        _suppressNextTap = false;
    }

    private void RestoreFloatingButtonPosition()
    {
        var savedX = Preferences.Default.Get(BubbleTranslationXKey, GetMaxTranslationX());
        var savedY = Preferences.Default.Get(BubbleTranslationYKey, 0d);

        FloatingButton.TranslationX = Clamp(savedX, GetMinTranslationX(), GetMaxTranslationX());
        FloatingButton.TranslationY = Clamp(savedY, GetMinTranslationY(), GetMaxTranslationY());
    }

    private void SaveFloatingButtonPosition()
    {
        Preferences.Default.Set(BubbleTranslationXKey, FloatingButton.TranslationX);
        Preferences.Default.Set(BubbleTranslationYKey, FloatingButton.TranslationY);
    }

    private double GetMinTranslationX()
    {
        return -Math.Max(0, Width - BubbleSize - SafeMargin * 2);
    }

    private static double GetMaxTranslationX()
    {
        return 0;
    }

    private double GetMinTranslationY()
    {
        return -Math.Max(0, Height - BubbleSize - DefaultBottomOffset - SafeMargin);
    }

    private static double GetMaxTranslationY()
    {
        return Math.Max(0, DefaultBottomOffset - SafeMargin);
    }

    private static double Clamp(double value, double min, double max)
    {
        return Math.Min(Math.Max(value, min), max);
    }

    private void OnMessagesCollectionChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        ScrollMessagesToEnd();
    }

    private void ScrollMessagesToEnd()
    {
        if (_viewModel.Messages.Count == 0)
            return;

        MainThread.BeginInvokeOnMainThread(async () =>
        {
            try
            {
                await Task.Delay(50);

                if (_viewModel.Messages.Count == 0)
                    return;

                MessagesCollection.ScrollTo(
                    _viewModel.Messages[^1],
                    position: ScrollToPosition.End,
                    animate: true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Chat scroll failed: {ex.Message}");
            }
        });
    }

    private async void OnMessageEntryCompleted(object? sender, EventArgs e)
    {
        try
        {
            Console.WriteLine("Entry completed");
            await SendMessage();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Entry send failed: {ex.Message}");
        }
    }

    private async void OnSendButtonClicked(object? sender, EventArgs e)
    {
        try
        {
            Console.WriteLine("Send clicked");
            await SendMessage();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Button send failed: {ex.Message}");
        }
    }

    private async Task SendMessage()
    {
        SyncDraftMessageFromEntry();

        if (string.IsNullOrWhiteSpace(_viewModel.DraftMessage))
            return;

        await _viewModel.SendMessageAsync();

        if (MessageEntry != null)
            MessageEntry.Text = _viewModel.DraftMessage;
    }

    private void SyncDraftMessageFromEntry()
    {
        _viewModel.DraftMessage = MessageEntry.Text ?? string.Empty;
    }
}
