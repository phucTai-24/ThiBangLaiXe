namespace MauiApp1.Controllers;

public abstract class BaseController
{
    protected Task GoToAsync(string route)
    {
        return Shell.Current.GoToAsync(route);
    }
}
