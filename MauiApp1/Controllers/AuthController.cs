using MauiApp1.Models.Auth;
using MauiApp1.Services;

namespace MauiApp1.Controllers;

public sealed class AuthController : BaseController
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    public Task OpenLoginAsync() => GoToAsync(nameof(Views.LoginPage));

    public Task OpenRegisterAsync() => GoToAsync(nameof(Views.RegisterPage));

    public Task OpenForgotPasswordAsync() => GoToAsync(nameof(Views.ForgotPasswordPage));

    public Task OpenDashboardAsync() => GoToAsync(nameof(Views.DashboardPage));

    public async Task<LoginResult> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default)
    {
        var result = await _authService.LoginAsync(usernameOrEmail, password, cancellationToken);

        if (result.IsSuccess)
            await OpenDashboardAsync();

        return result;
    }

    public Task<MeResponse?> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default)
    {
        return _authService.GetCurrentUserProfileAsync(cancellationToken);
    }
}
