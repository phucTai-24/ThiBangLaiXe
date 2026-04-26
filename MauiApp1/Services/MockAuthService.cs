using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public sealed class MockAuthService : IAuthService
{
    public async Task<LoginResult> LoginAsync(string usernameOrEmail, string password, CancellationToken cancellationToken = default)
    {
        await Task.Delay(500, cancellationToken);

        var isSuccess = !string.IsNullOrWhiteSpace(usernameOrEmail)
            && !string.IsNullOrWhiteSpace(password);

        if (!isSuccess)
            return LoginResult.Failure("Thông tin đăng nhập chưa hợp lệ.");

        await SecureStorage.Default.SetAsync("login_source", "MOCK");

        return LoginResult.Success(new LoginResponse
        {
            user_id = 0,
            ten_dang_nhap = usernameOrEmail,
            email = string.Empty,
            access_token = "mock-token"
        }, "Đăng nhập thành công.", "MOCK");
    }

    public Task<MeResponse?> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default)
    {
        MeResponse result = new()
        {
            user_id = 0,
            hoc_vien_id = 0,
            ten_dang_nhap = "mock_user",
            ho_ten = "Người dùng Mock",
            email = "mock@example.com",
            so_dien_thoai = "0900000000",
            trang_thai = "MOCK",
            cccd = "000000000000",
            dia_chi = "Dữ liệu giả lập",
            roles = ["MOCK"]
        };

        return Task.FromResult<MeResponse?>(result);
    }
}
