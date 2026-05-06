namespace MauiApp1.Helpers;

public static class NavigationHelper
{
    public static async Task GoBackAsync()
    {
        try
        {
            await Shell.Current.GoToAsync("..");
        }
        catch
        {
            await Shell.Current.GoToAsync(nameof(Views.DashboardPage));
        }
    }
}

