namespace MauiApp1.Models.Auth;

public sealed class LoginResult
{
    public bool IsSuccess { get; init; }
    public string Message { get; init; } = string.Empty;
    public LoginResponse? User { get; init; }
    public string Source { get; init; } = string.Empty;

    public static LoginResult Success(LoginResponse user, string message, string source)
        => new()
        {
            IsSuccess = true,
            Message = message,
            User = user,
            Source = source
        };

    public static LoginResult Failure(string message)
        => new()
        {
            IsSuccess = false,
            Message = message
        };
}
