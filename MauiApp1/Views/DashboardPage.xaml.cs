namespace MauiApp1.Views;

public partial class DashboardPage : ContentPage
{
    public DashboardPage()
    {
        InitializeComponent();
    }

    private async void OnMockExamTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(MockExamPage));
    }

    private async void OnPracticeTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(TrafficSignsPage));
    }
}
