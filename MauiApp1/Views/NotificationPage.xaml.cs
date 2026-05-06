using MauiApp1.Helpers;

namespace MauiApp1.Views;

public partial class NotificationPage : ContentPage
{
    public NotificationPage()
    {
        InitializeComponent();
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }
}
