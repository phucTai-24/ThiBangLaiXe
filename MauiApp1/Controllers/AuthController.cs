namespace MauiApp1.Controllers;

public sealed class AuthController : BaseController
{
    public Task OpenLoginAsync() => GoToAsync(nameof(Views.LoginPage));

    public Task OpenRegisterAsync() => GoToAsync(nameof(Views.RegisterPage));

    public Task OpenForgotPasswordAsync() => GoToAsync(nameof(Views.ForgotPasswordPage));

    public Task OpenDashboardAsync() => GoToAsync(nameof(Views.DashboardPage));
}
