using MauiApp1.Controllers;
using MauiApp1.Models.Auth;

namespace MauiApp1.Views;

public partial class RegisterPage : ContentPage
{
    private readonly AuthController _authController;
    private bool _isPasswordVisible;

    public RegisterPage()
    {
        InitializeComponent();
    }

    public RegisterPage(AuthController authController)
    {
        InitializeComponent();
        _authController = authController;
    }

    private async void OnBackClicked(object? sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("..");
    }

    private async void OnBackToLoginTapped(object? sender, TappedEventArgs e)
    {
        await Shell.Current.GoToAsync("..");
    }

    private async void OnRegisterClicked(object? sender, EventArgs e)
    {
        var username = UsernameEntry.Text?.Trim() ?? string.Empty;
        var email = EmailEntry.Text?.Trim() ?? string.Empty;
        var phone = PhoneEntry.Text?.Trim();
        var password = PasswordEntry.Text?.Trim() ?? string.Empty;
        var confirmPassword = ConfirmPasswordEntry.Text?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            await DisplayAlert("Thiếu thông tin", "Vui lòng nhập tên đăng nhập, email và mật khẩu.", "OK");
            return;
        }

        if (password.Length < 8)
        {
            await DisplayAlert("Mật khẩu không hợp lệ", "Mật khẩu phải có ít nhất 8 ký tự.", "OK");
            return;
        }

        if (!string.Equals(password, confirmPassword, StringComparison.Ordinal))
        {
            await DisplayAlert("Mật khẩu không khớp", "Mật khẩu xác nhận không trùng khớp.", "OK");
            return;
        }

        if (!TermsCheckBox.IsChecked)
        {
            await DisplayAlert("Điều khoản sử dụng", "Vui lòng đồng ý điều khoản trước khi đăng ký.", "OK");
            return;
        }

        if (_authController is null)
        {
            await DisplayAlert("Lỗi cấu hình", "Không khởi tạo được dịch vụ đăng ký.", "OK");
            return;
        }

        try
        {
            RegisterButton.IsEnabled = false;
            RegisterButton.Text = "Đang đăng ký...";

            var request = new RegisterRequest
            {
                ten_dang_nhap = username,
                email = email,
                mat_khau = password,
                so_dien_thoai = string.IsNullOrWhiteSpace(phone) ? null : phone
            };

            var result = await _authController.RegisterAsync(request);
            if (!result.IsSuccess)
            {
                await DisplayAlert("Đăng ký thất bại", result.Message, "OK");
                return;
            }

            await DisplayAlert("Đăng ký thành công", result.Message, "OK");
            // Điều hướng về trang đăng nhập sau khi đăng ký thành công
            await Shell.Current.GoToAsync("..");
        }
        finally
        {
            RegisterButton.IsEnabled = true;
            RegisterButton.Text = "Đăng ký ngay  →";
        }
    }

    private void OnTogglePasswordVisibilityTapped(object? sender, TappedEventArgs e)
    {
        _isPasswordVisible = !_isPasswordVisible;
        PasswordEntry.IsPassword = !_isPasswordVisible;
        ConfirmPasswordEntry.IsPassword = !_isPasswordVisible;
        PasswordVisibilityIcon.Text = _isPasswordVisible ? "🙈" : "👁";
    }
}
