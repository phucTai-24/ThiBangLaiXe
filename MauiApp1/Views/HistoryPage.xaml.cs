using MauiApp1.Helpers;

namespace MauiApp1.Views;

public partial class HistoryPage : ContentPage
{
    public HistoryPage()
    {
        InitializeComponent();
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }
}
