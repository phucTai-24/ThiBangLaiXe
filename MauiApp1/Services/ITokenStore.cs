namespace MauiApp1.Services;

public interface ITokenStore
{
    Task<string?> GetAccessTokenAsync();
}

