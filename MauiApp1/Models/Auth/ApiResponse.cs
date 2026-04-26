namespace MauiApp1.Models.Auth;

public sealed class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<ApiError>? Errors { get; set; }
}

public sealed class ApiError
{
    public string Code { get; set; } = string.Empty;
    public string? Field { get; set; }
    public string Detail { get; set; } = string.Empty;
}
