using MauiApp1.Models.Auth;

namespace MauiApp1.Services;

public sealed class MockAuthService : IAuthService
{
    private static MeStudentProfileResponse? _studentProfile;

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

    public Task<MeResponse?> RegisterStudentProfileAsync(RegisterStudentProfileRequest request, CancellationToken cancellationToken = default)
    {
        _studentProfile = new MeStudentProfileResponse
        {
            hoc_vien_id = 999,
            user_id = 0,
            ho_ten = string.IsNullOrWhiteSpace(request.ho_ten) ? "Người dùng Mock" : request.ho_ten,
            ngay_sinh = request.ngay_sinh,
            gioi_tinh = request.gioi_tinh,
            cccd = request.cccd,
            dia_chi = request.dia_chi,
            anh_chan_dung = request.anh_chan_dung
        };

        MeResponse result = new()
        {
            user_id = 0,
            hoc_vien_id = _studentProfile.hoc_vien_id,
            ten_dang_nhap = "mock_user",
            ho_ten = _studentProfile.ho_ten,
            email = "mock@example.com",
            so_dien_thoai = "0900000000",
            trang_thai = "MOCK",
            ngay_sinh = _studentProfile.ngay_sinh,
            gioi_tinh = _studentProfile.gioi_tinh,
            cccd = _studentProfile.cccd,
            dia_chi = _studentProfile.dia_chi,
            anh_chan_dung = _studentProfile.anh_chan_dung,
            roles = ["HOC_VIEN", "MOCK"]
        };

        return Task.FromResult<MeResponse?>(result);
    }

    public Task<MeStudentProfileResponse?> GetCurrentStudentProfileAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_studentProfile);
    }

    public Task<bool> LogoutAsync(CancellationToken cancellationToken = default)
    {
        SecureStorage.Default.Remove("access_token");
        SecureStorage.Default.Remove("user_id");
        SecureStorage.Default.Remove("username");
        SecureStorage.Default.Remove("email");
        SecureStorage.Default.Remove("roles");
        SecureStorage.Default.Remove("expires_at_utc");
        SecureStorage.Default.Remove("login_source");
        return Task.FromResult(true);
    }

    public async Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        await Task.Delay(500, cancellationToken);

        if (string.IsNullOrWhiteSpace(request.ten_dang_nhap)
            || string.IsNullOrWhiteSpace(request.email)
            || string.IsNullOrWhiteSpace(request.mat_khau))
        {
            return RegisterResult.Failure("Thông tin đăng ký chưa hợp lệ.");
        }

        return RegisterResult.Success(new RegisterResponse
        {
            user_id = 0,
            ten_dang_nhap = request.ten_dang_nhap,
            email = request.email,
            role_mac_dinh = "hoc_vien",
            created_at = DateTime.UtcNow
        }, "Đăng ký thành công (MOCK).");
    }
}
