using MauiApp1.Controllers;
using MauiApp1.Services;

namespace MauiApp1.Views;

public partial class LoginPage : ContentPage
{
    private readonly AuthController _authController;
    private readonly IAuthService _authService;

    public LoginPage(AuthController authController, IAuthService authService)
    {
        InitializeComponent();
        _authController = authController;
        _authService = authService;
    }

    private async void OnLoginClicked(object? sender, EventArgs e)
    {
        var usernameOrEmail = UsernameEntry.Text?.Trim() ?? string.Empty;
        var password = PasswordEntry.Text?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(usernameOrEmail) || string.IsNullOrWhiteSpace(password))
        {
            await DisplayAlert("Thiếu thông tin", "Vui lòng nhập tên đăng nhập/email và mật khẩu.", "OK");
            return;
        }

        try
        {
            LoginButton.IsEnabled = false;
            LoginButton.Text = "Đang đăng nhập...";

            var isSuccess = await _authService.LoginAsync(usernameOrEmail, password);

            if (!isSuccess)
            {
                await DisplayAlert("Đăng nhập thất bại", "Thông tin đăng nhập chưa hợp lệ.", "OK");
                return;
            }

            await _authController.OpenDashboardAsync();
        }
        finally
        {
            LoginButton.IsEnabled = true;
            LoginButton.Text = "Đăng nhập";
        }
    }
}
