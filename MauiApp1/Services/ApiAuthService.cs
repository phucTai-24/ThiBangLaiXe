using System.Net;
using System.Net.Http.Json;
using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public sealed class ApiAuthService : IAuthService
{
    private readonly HttpClient _httpClient;

    public ApiAuthService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<LoginResult> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default)
    {
        var request = new LoginRequest
        {
            ten_dang_nhap_hoac_email = usernameOrEmail,
            mat_khau = password
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/v1/auth/login", request, cancellationToken);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
                return LoginResult.Failure("Sai tài khoản hoặc mật khẩu.");

            if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                var badRequest = await response.Content.ReadFromJsonAsync<ApiResponse<string>>(cancellationToken: cancellationToken);
                var message = badRequest?.Errors?.FirstOrDefault()?.Detail
                    ?? badRequest?.Message
                    ?? "Dữ liệu đăng nhập không hợp lệ.";

                return LoginResult.Failure(message);
            }

            if (!response.IsSuccessStatusCode)
                return LoginResult.Failure($"Đăng nhập thất bại. Mã lỗi: {(int)response.StatusCode}.");

            var result = await response.Content.ReadFromJsonAsync<ApiResponse<LoginResponse>>(cancellationToken: cancellationToken);

            if (result?.Success != true || result.Data is null || string.IsNullOrWhiteSpace(result.Data.access_token))
                return LoginResult.Failure(result?.Message ?? "Không nhận được dữ liệu đăng nhập hợp lệ từ máy chủ.");

            await SecureStorage.Default.SetAsync("access_token", result.Data.access_token);
            await SecureStorage.Default.SetAsync("user_id", result.Data.user_id.ToString());
            await SecureStorage.Default.SetAsync("username", result.Data.ten_dang_nhap);
            await SecureStorage.Default.SetAsync("email", result.Data.email);
            await SecureStorage.Default.SetAsync("roles", string.Join(",", result.Data.roles));
            await SecureStorage.Default.SetAsync("expires_at_utc", result.Data.expires_at_utc.ToString("O"));
            await SecureStorage.Default.SetAsync("login_source", "API");

            return LoginResult.Success(result.Data, result.Message, "API");
        }
        catch (HttpRequestException)
        {
            return LoginResult.Failure("Không kết nối được tới máy chủ API. Hãy kiểm tra backend đang chạy và base URL phù hợp với thiết bị.");
        }
        catch (TaskCanceledException)
        {
            return LoginResult.Failure("Yêu cầu đăng nhập đã hết thời gian chờ.");
        }
        catch (Exception ex)
        {
            return LoginResult.Failure($"Đã xảy ra lỗi khi đăng nhập: {ex.Message}");
        }
    }

    public async Task<MeResponse?> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var token = await SecureStorage.Default.GetAsync("access_token");
            if (string.IsNullOrWhiteSpace(token))
                return null;

            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.GetAsync("api/v1/auth/me", cancellationToken);
            if (!response.IsSuccessStatusCode)
                return null;

            var result = await response.Content.ReadFromJsonAsync<ApiResponse<MeResponse>>(cancellationToken: cancellationToken);
            return result?.Success == true ? result.Data : null;
        }
        catch
        {
            return null;
        }
    }
}
