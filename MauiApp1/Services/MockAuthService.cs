namespace MauiApp1.Services;

public sealed class MockAuthService : IAuthService
{
    public async Task<bool> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default)
    {
        await Task.Delay(500, cancellationToken);

        return !string.IsNullOrWhiteSpace(usernameOrEmail)
            && !string.IsNullOrWhiteSpace(password);
    }
}
