namespace MauiApp1.Services;

public sealed class SecureTokenStore : ITokenStore
{
    public Task<string?> GetAccessTokenAsync()
    {
        return SecureStorage.Default.GetAsync("access_token");
    }
}

