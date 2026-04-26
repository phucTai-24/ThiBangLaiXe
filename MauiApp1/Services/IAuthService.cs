using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public interface IAuthService
{
    Task<LoginResult> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default);
    Task<MeResponse?> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default);
}
