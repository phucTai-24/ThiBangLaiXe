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

    public Task OpenLoginAsync() => Shell.Current.GoToAsync($"//{nameof(Views.LoginPage)}");

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

    public Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        return _authService.RegisterAsync(request, cancellationToken);
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        await _authService.LogoutAsync(cancellationToken);
        await OpenLoginAsync();
    }

    public Task<MeResponse?> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default)
    {
        return _authService.GetCurrentUserProfileAsync(cancellationToken);
    }

    public Task<string?> UpdateCurrentUserProfileAsync(UpdateMeRequest request, CancellationToken cancellationToken = default)
    {
        return _authService.UpdateCurrentUserProfileAsync(request, cancellationToken);
    }
}
