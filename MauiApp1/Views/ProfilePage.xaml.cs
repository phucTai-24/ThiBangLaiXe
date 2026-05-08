using MauiApp1.Controllers;

namespace MauiApp1.Views;

public partial class ProfilePage : ContentPage
{
    private readonly AuthController _authController;

    public ProfilePage(AuthController authController)
    {
        InitializeComponent();
        _authController = authController;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await LoadProfileAsync();
    }

    private async Task LoadProfileAsync()
    {
        var profile = await _authController.GetCurrentUserProfileAsync();
        var source = await SecureStorage.Default.GetAsync("login_source") ?? "UNKNOWN";

        if (profile is null)
        {
            FullNameLabel.Text = "Chưa có dữ liệu người dùng";
            RoleStatusLabel.Text = "Không tải được hồ sơ từ auth";
            ProfileStatusLabel.Text = "Lỗi tải dữ liệu";
            PhoneLabel.Text = "Chưa có";
            EmailLabel.Text = "Chưa có";
            IdentityLabel.Text = "Chưa có";
            AddressLabel.Text = "Chưa có";
            ProfileSourceLabel.Text = "Nguồn dữ liệu hồ sơ: không xác định";
            return;
        }

        FullNameLabel.Text = string.IsNullOrWhiteSpace(profile.ho_ten) ? profile.ten_dang_nhap : profile.ho_ten;
        RoleStatusLabel.Text = $"{string.Join(", ", profile.roles.DefaultIfEmpty("USER"))} • Hồ sơ đang hoạt động";
        ProfileStatusLabel.Text = string.IsNullOrWhiteSpace(profile.trang_thai) ? "Đang hoạt động" : profile.trang_thai;
        PhoneLabel.Text = string.IsNullOrWhiteSpace(profile.so_dien_thoai) ? "Chưa cập nhật" : profile.so_dien_thoai;
        EmailLabel.Text = string.IsNullOrWhiteSpace(profile.email) ? "Chưa cập nhật" : profile.email;

        var birthday = profile.ngay_sinh?.ToString("yyyy-MM-dd") ?? "Chưa cập nhật";
        var cccd = string.IsNullOrWhiteSpace(profile.cccd) ? "Chưa cập nhật" : profile.cccd;
        IdentityLabel.Text = $"{cccd} • {birthday}";
        AddressLabel.Text = string.IsNullOrWhiteSpace(profile.dia_chi) ? "Chưa cập nhật" : profile.dia_chi;
        ProfileSourceLabel.Text = string.Equals(source, "API", StringComparison.OrdinalIgnoreCase)
            ? "Nguồn dữ liệu hồ sơ: API auth/me"
            : string.Equals(source, "MOCK", StringComparison.OrdinalIgnoreCase)
                ? "Nguồn dữ liệu hồ sơ: MOCK auth"
                : "Nguồn dữ liệu hồ sơ: chưa xác định";
    }

    private async void OnHomeTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(DashboardPage));
    }

    private async void OnMockExamTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(ExamListPage));
    }

    private async void OnPracticeTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(TrafficSignsPage));
    }

    private async void OnScheduleTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(StudySchedulePage));
    }

    private async void OnEditTapped(object sender, EventArgs e)
    {
        var profile = await _authController.GetCurrentUserProfileAsync();
        if (profile is null)
        {
            await DisplayAlert("Không thể chỉnh sửa", "Không tải được hồ sơ hiện tại để chỉnh sửa.", "OK");
            return;
        }

        var username = await DisplayPromptAsync(
            "Cập nhật hồ sơ",
            "Tên đăng nhập:",
            initialValue: profile.ten_dang_nhap,
            maxLength: 50,
            accept: "Tiếp",
            cancel: "Hủy");

        if (username is null)
            return;

        var email = await DisplayPromptAsync(
            "Cập nhật hồ sơ",
            "Email:",
            initialValue: profile.email,
            keyboard: Keyboard.Email,
            accept: "Tiếp",
            cancel: "Hủy");

        if (email is null)
            return;

        var phone = await DisplayPromptAsync(
            "Cập nhật hồ sơ",
            "Số điện thoại (để trống nếu muốn xóa):",
            initialValue: profile.so_dien_thoai,
            keyboard: Keyboard.Telephone,
            maxLength: 20,
            accept: "Lưu",
            cancel: "Hủy");

        if (phone is null)
            return;

        var updateError = await _authController.UpdateCurrentUserProfileAsync(new Models.Auth.UpdateMeRequest
        {
            ten_dang_nhap = username.Trim(),
            email = email.Trim(),
            so_dien_thoai = phone
        });

        if (!string.IsNullOrWhiteSpace(updateError))
        {
            await DisplayAlert("Cập nhật thất bại", updateError, "OK");
            return;
        }

        await LoadProfileAsync();
        await DisplayAlert("Thành công", "Đã cập nhật thông tin cá nhân và tải lại hồ sơ mới nhất.", "OK");
    }

    private async void OnSettingsTapped(object sender, TappedEventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(SettingsPage));
    }

    private async void OnLogoutClicked(object sender, EventArgs e)
    {
        var confirm = await DisplayAlert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", "Đăng xuất", "Hủy");
        if (!confirm)
            return;

        try
        {
            LogoutButton.IsEnabled = false;
            LogoutButton.Text = "Đang đăng xuất...";
            await _authController.LogoutAsync();
        }
        finally
        {
            LogoutButton.IsEnabled = true;
            LogoutButton.Text = "Đăng xuất";
        }
    }
}
