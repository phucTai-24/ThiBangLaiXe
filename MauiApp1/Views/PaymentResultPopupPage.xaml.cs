namespace MauiApp1.Views;

public partial class PaymentResultPopupPage : ContentPage
{
    private readonly INavigation _ownerNavigation;
    private bool _isClosing;

    public PaymentResultPopupPage(string statusTitle, decimal amount, string courseName, string className, string detail, INavigation ownerNavigation)
    {
        InitializeComponent();
        _ownerNavigation = ownerNavigation;

        BindingContext = new
        {
            StatusTitle = statusTitle,
            AmountText = $"{amount:N0}đ",
            CourseText = $"Khóa học: {courseName}",
            ClassText = $"Lớp học: {className}",
            DetailText = detail
        };
    }

    private async void OnCloseClicked(object? sender, EventArgs e)
    {
        await ClosePopupAsync();
    }

    protected override bool OnBackButtonPressed()
    {
        _ = ClosePopupAsync();
        return true;
    }

    private async Task ClosePopupAsync()
    {
        if (_isClosing)
            return;

        _isClosing = true;

        try
        {
            if (Dispatcher.IsDispatchRequired)
                await Dispatcher.DispatchAsync(async () => await Navigation.PopModalAsync(false));
            else
                await Navigation.PopModalAsync(false);
        }
        catch
        {
            // Fallback theo owner navigation khi Navigation hiện tại không pop được.
            try
            {
                if (Dispatcher.IsDispatchRequired)
                    await Dispatcher.DispatchAsync(async () => await _ownerNavigation.PopModalAsync(false));
                else
                    await _ownerNavigation.PopModalAsync(false);
            }
            catch
            {
                // Nuốt lỗi để tránh crash/thoát app khi stack modal thay đổi đột ngột.
            }
        }
        finally
        {
            _isClosing = false;
        }
    }
}
