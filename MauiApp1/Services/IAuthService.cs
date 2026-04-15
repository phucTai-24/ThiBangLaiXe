namespace MauiApp1.Services;

public interface IAuthService
{
    Task<bool> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default);
}
