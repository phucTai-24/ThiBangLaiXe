namespace MauiApp1.Models.Auth;

public sealed class RegisterResult
{
    public bool IsSuccess { get; init; }
    public string Message { get; init; } = string.Empty;
    public RegisterResponse? User { get; init; }

    public static RegisterResult Success(RegisterResponse user, string message)
        => new()
        {
            IsSuccess = true,
            Message = message,
            User = user
        };

    public static RegisterResult Failure(string message)
        => new()
        {
            IsSuccess = false,
            Message = message
        };
}

