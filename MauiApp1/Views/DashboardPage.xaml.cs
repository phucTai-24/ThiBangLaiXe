using MauiApp1.Models.Entitlements;
using MauiApp1.Services;

namespace MauiApp1.Views;

public partial class DashboardPage : ContentPage
{
    private readonly IEntitlementService _entitlementService;
    private bool _isLoadingPackages;

    public List<EntitlementPackageItem> CoursePackages { get; } = new();

    public DashboardPage(IEntitlementService entitlementService)
    {
        _entitlementService = entitlementService;
        InitializeComponent();
        BindingContext = this;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        var loginSource = await SecureStorage.Default.GetAsync("login_source") ?? "UNKNOWN";

        if (string.Equals(loginSource, "API", StringComparison.OrdinalIgnoreCase))
        {
            LoginSourceLabel.Text = "Nguồn dữ liệu sau đăng nhập: API thật từ backend";
            LoginSourceBadge.BackgroundColor = Color.FromArgb("#E8F7EA");
            LoginSourceLabel.TextColor = Color.FromArgb("#1E7A35");
            return;
        }

        if (string.Equals(loginSource, "MOCK", StringComparison.OrdinalIgnoreCase))
        {
            LoginSourceLabel.Text = "Nguồn dữ liệu sau đăng nhập: dữ liệu MOCK";
            LoginSourceBadge.BackgroundColor = Color.FromArgb("#FFF4D6");
            LoginSourceLabel.TextColor = Color.FromArgb("#9A6700");
            return;
        }

        LoginSourceLabel.Text = "Nguồn dữ liệu sau đăng nhập: chưa xác định";
        LoginSourceBadge.BackgroundColor = Color.FromArgb("#ECECEC");
        LoginSourceLabel.TextColor = Color.FromArgb("#5F5F5F");

        await LoadCoursePackagesAsync();
    }

    private async Task LoadCoursePackagesAsync()
    {
        if (_isLoadingPackages)
            return;

        try
        {
            _isLoadingPackages = true;
            CourseRegisterLoading.IsVisible = true;
            CourseRegisterLoading.IsRunning = true;
            CourseRegistrationStatusLabel.Text = "Đang tải danh sách khóa học...";

            var packages = await _entitlementService.GetPackagesAsync();

            CoursePackages.Clear();
            CoursePackages.AddRange(packages);

            if (CoursePackages.Count == 0)
            {
                CourseRegistrationStatusLabel.Text = "Hiện chưa có khóa học mở đăng ký.";
            }
            else
            {
                CourseRegistrationStatusLabel.Text = $"Có {CoursePackages.Count} khóa học có thể đăng ký.";
            }

            OnPropertyChanged(nameof(CoursePackages));
        }
        catch (UnauthorizedAccessException)
        {
            CourseRegistrationStatusLabel.Text = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
        }
        catch (Exception ex)
        {
            CourseRegistrationStatusLabel.Text = "Không tải được danh sách khóa học.";
            Console.WriteLine($"[Dashboard][Courses][Load][Error] {ex.Message}");
        }
        finally
        {
            _isLoadingPackages = false;
            CourseRegisterLoading.IsVisible = false;
            CourseRegisterLoading.IsRunning = false;
        }
    }

    private async void OnRegisterCourseClicked(object? sender, EventArgs e)
    {
        if (sender is not Button button || button.CommandParameter is null)
            return;

        if (!long.TryParse(button.CommandParameter.ToString(), out var packageId) || packageId <= 0)
            return;

        try
        {
            button.IsEnabled = false;
            await _entitlementService.RegisterPackageAsync(packageId);

            var item = CoursePackages.FirstOrDefault(x => x.Id == packageId);
            if (item != null)
                item.IsRegistered = true;

            OnPropertyChanged(nameof(CoursePackages));
            CourseRegistrationStatusLabel.Text = "Đăng ký khóa học thành công.";
        }
        catch (UnauthorizedAccessException)
        {
            CourseRegistrationStatusLabel.Text = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
        }
        catch (Exception ex)
        {
            CourseRegistrationStatusLabel.Text = "Đăng ký khóa học thất bại.";
            Console.WriteLine($"[Dashboard][Courses][Register][Error] {ex.Message}");
            await DisplayAlert("Lỗi", "Không thể đăng ký khóa học. Vui lòng thử lại.", "OK");
        }
        finally
        {
            button.IsEnabled = true;
        }
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

    private async void OnProfileTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(ProfilePage));
    }
}
