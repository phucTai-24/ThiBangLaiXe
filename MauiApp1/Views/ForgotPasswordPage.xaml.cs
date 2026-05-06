using MauiApp1.Helpers;

namespace MauiApp1.Views;

public partial class ForgotPasswordPage : ContentPage
{
    public ForgotPasswordPage()
    {
        InitializeComponent();
    }

    private async void OnBackTapped(object? sender, EventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }
}
