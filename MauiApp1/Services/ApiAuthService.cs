using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
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

    public async Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/v1/auth/register", request, cancellationToken);

            if (response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.Conflict)
            {
                var badRequest = await response.Content.ReadFromJsonAsync<ApiResponse<string>>(cancellationToken: cancellationToken);
                var message = badRequest?.Errors?.FirstOrDefault()?.Detail
                    ?? badRequest?.Message
                    ?? "Dữ liệu đăng ký không hợp lệ.";

                return RegisterResult.Failure(message);
            }

            if (!response.IsSuccessStatusCode)
                return RegisterResult.Failure($"Đăng ký thất bại. Mã lỗi: {(int)response.StatusCode}.");

            var result = await response.Content.ReadFromJsonAsync<ApiResponse<RegisterResponse>>(cancellationToken: cancellationToken);

            if (result?.Success != true || result.Data is null)
                return RegisterResult.Failure(result?.Message ?? "Không nhận được dữ liệu đăng ký hợp lệ từ máy chủ.");

            return RegisterResult.Success(result.Data, result.Message);
        }
        catch (HttpRequestException)
        {
            return RegisterResult.Failure("Không kết nối được tới máy chủ API. Hãy kiểm tra backend đang chạy và base URL phù hợp với thiết bị.");
        }
        catch (TaskCanceledException)
        {
            return RegisterResult.Failure("Yêu cầu đăng ký đã hết thời gian chờ.");
        }
        catch (Exception ex)
        {
            return RegisterResult.Failure($"Đã xảy ra lỗi khi đăng ký: {ex.Message}");
        }
    }

    public async Task<bool> LogoutAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var token = await SecureStorage.Default.GetAsync("access_token");
            if (!string.IsNullOrWhiteSpace(token))
            {
                _httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                _ = await _httpClient.PostAsync("api/v1/auth/logout", content: null, cancellationToken);
            }
        }
        catch
        {
            // ignore network errors during logout; still clear local session
        }
        finally
        {
            SecureStorage.Default.Remove("access_token");
            SecureStorage.Default.Remove("user_id");
            SecureStorage.Default.Remove("username");
            SecureStorage.Default.Remove("email");
            SecureStorage.Default.Remove("roles");
            SecureStorage.Default.Remove("expires_at_utc");
            SecureStorage.Default.Remove("login_source");
            _httpClient.DefaultRequestHeaders.Authorization = null;
        }

        return true;
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

    public async Task<MeResponse?> RegisterStudentProfileAsync(RegisterStudentProfileRequest request, CancellationToken cancellationToken = default)
    {
        var token = await SecureStorage.Default.GetAsync("access_token");
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đã hết hạn.");

        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var payload = new RegisterStudentProfileApiRequest
        {
            ho_ten = request.ho_ten,
            ngay_sinh = request.ngay_sinh.HasValue ? DateOnly.FromDateTime(request.ngay_sinh.Value) : null,
            gioi_tinh = request.gioi_tinh,
            cccd = request.cccd,
            dia_chi = request.dia_chi,
            anh_chan_dung = request.anh_chan_dung
        };

        var response = await _httpClient.PostAsJsonAsync("api/v1/auth/register-student-profile", payload, cancellationToken);
        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            return await GetCurrentUserProfileAsync(cancellationToken);
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Đăng ký hồ sơ học viên thất bại ({(int)response.StatusCode}): {body}");
        }

        var wrapped = await response.Content.ReadFromJsonAsync<ApiResponse<MeResponse>>(cancellationToken: cancellationToken);
        var profile = wrapped?.Data;

        if (profile is null)
            return await GetCurrentUserProfileAsync(cancellationToken);

        if (profile.roles is { Count: > 0 })
        {
            await SecureStorage.Default.SetAsync("roles", string.Join(",", profile.roles));
        }

        return profile;
    }

    public async Task<MeStudentProfileResponse?> GetCurrentStudentProfileAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var token = await SecureStorage.Default.GetAsync("access_token");
            if (string.IsNullOrWhiteSpace(token))
                return null;

            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.GetAsync("api/v1/auth/me/student-profile", cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
                return null;

            if (!response.IsSuccessStatusCode)
                return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponse<MeStudentProfileResponse>>(cancellationToken: cancellationToken);
            return wrapped?.Success == true ? wrapped.Data : null;
        }
        catch
        {
            return null;
        }
    }

    private sealed class RegisterStudentProfileApiRequest
    {
        public string ho_ten { get; set; } = string.Empty;
        public DateOnly? ngay_sinh { get; set; }
        public string? gioi_tinh { get; set; }
        public string? cccd { get; set; }
        public string? dia_chi { get; set; }
        public string? anh_chan_dung { get; set; }
    }
}
