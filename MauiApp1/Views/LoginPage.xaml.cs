using MauiApp1.Controllers;

namespace MauiApp1.Views;

public partial class LoginPage : ContentPage
{
    private readonly AuthController _authController;
    private bool _isPasswordVisible;

    public LoginPage(AuthController authController)
    {
        InitializeComponent();
        _authController = authController;
        UpdatePasswordVisibility();
    }

    private void OnTogglePasswordVisibility(object? sender, TappedEventArgs e)
    {
        _isPasswordVisible = !_isPasswordVisible;
        UpdatePasswordVisibility();
    }

    private void UpdatePasswordVisibility()
    {
        PasswordEntry.IsPassword = !_isPasswordVisible;
        PasswordToggleLabel.Text = _isPasswordVisible ? "🙈" : "👁";
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

            var result = await _authController.LoginAsync(usernameOrEmail, password);

            if (!result.IsSuccess)
            {
                await DisplayAlert("Đăng nhập thất bại", result.Message, "OK");
                return;
            }
        }
        finally
        {
            LoginButton.IsEnabled = true;
            LoginButton.Text = "Đăng nhập";
        }
    }

    private async void OnOpenRegisterTapped(object? sender, TappedEventArgs e)
    {
        await _authController.OpenRegisterAsync();
    }
}
