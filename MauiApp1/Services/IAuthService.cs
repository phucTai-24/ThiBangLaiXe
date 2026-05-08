using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public interface IAuthService
{
    Task<LoginResult> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default);
    Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<bool> LogoutAsync(CancellationToken cancellationToken = default);
    Task<MeResponse?> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default);
    Task<MeResponse?> RegisterStudentProfileAsync(RegisterStudentProfileRequest request, CancellationToken cancellationToken = default);
    Task<MeStudentProfileResponse?> GetCurrentStudentProfileAsync(CancellationToken cancellationToken = default);
    Task<string?> UpdateCurrentUserProfileAsync(UpdateMeRequest request, CancellationToken cancellationToken = default);
}
