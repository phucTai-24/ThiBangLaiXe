using MauiApp1.Controllers;
using MauiApp1.Models.Auth;
using MauiApp1.Services;

namespace MauiApp1.Views;

public partial class StudentProfileRegistrationPage : ContentPage
{
    private readonly IAuthService _authService;

    public StudentProfileRegistrationPage(IAuthService authService)
    {
        InitializeComponent();
        _authService = authService;
    }

    private async void OnSubmitClicked(object? sender, EventArgs e)
    {
        var fullName = FullNameEntry.Text?.Trim() ?? string.Empty;
        var birthDate = BirthDatePicker.Date;
        var gender = GenderPicker.SelectedItem as string;
        var identityNumber = IdentityNumberEntry.Text?.Trim();
        var address = AddressEditor.Text?.Trim();

        // Validate
        if (string.IsNullOrWhiteSpace(fullName))
        {
            await DisplayAlert("Thiếu thông tin", "Vui lòng nhập họ và tên.", "OK");
            return;
        }

        try
        {
            SubmitButton.IsEnabled = false;
            LoadingIndicator.IsRunning = true;
            LoadingIndicator.IsVisible = true;
            SubmitButton.Text = "Đang xử lý...";

            var request = new RegisterStudentProfileRequest
            {
                ho_ten = fullName,
                ngay_sinh = birthDate,
                gioi_tinh = gender,
                cccd = identityNumber,
                dia_chi = address
            };

            // Kiểm tra xác thực trước
            var currentProfile = await _authService.GetCurrentUserProfileAsync();
            if (currentProfile is null)
            {
                await DisplayAlert("Lỗi xác thực", "Không thể xác thực người dùng. Vui lòng đăng nhập lại.", "OK");
                await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
                return;
            }

            // Gọi API đăng ký học viên
            var result = await _authService.RegisterStudentProfileAsync(request);

            if (result is null)
            {
                await DisplayAlert("Đăng ký thất bại", "Không thể đăng ký hồ sơ học viên. Vui lòng thử lại.", "OK");
                return;
            }

            await DisplayAlert("Thành công", "Đã đăng ký hồ sơ học viên thành công! Đang chuyển về màn hình đăng ký khóa học.", "OK");

            // Dùng route tương đối để push vào stack hiện tại, tránh lỗi global-route-only
            await Shell.Current.GoToAsync(nameof(CourseRegistrationPage));
        }
        catch (UnauthorizedAccessException ex)
        {
            await DisplayAlert("Lỗi xác thực", ex.Message, "OK");
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi", $"Đã xảy ra lỗi: {ex.Message}", "OK");
        }
        finally
        {
            SubmitButton.IsEnabled = true;
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
            SubmitButton.Text = "Hoàn tất đăng ký học viên";
        }
    }

    private async void OnCancelClicked(object? sender, EventArgs e)
    {
        var confirm = await DisplayAlert(
            "Xác nhận hủy",
            "Bạn có chắc muốn hủy đăng ký học viên? Bạn sẽ không thể đăng ký khóa học nếu chưa hoàn tất hồ sơ.",
            "Hủy đăng ký",
            "Tiếp tục điền");

        if (confirm)
        {
            await Shell.Current.GoToAsync($"//{nameof(DashboardPage)}");
        }
    }
}
