using MauiApp1.Models.Entitlements;
using MauiApp1.Services;

namespace MauiApp1.Views;

public partial class DashboardPage : ContentPage
{
    private readonly IEntitlementService _entitlementService;
    private bool _isLoadingMyCourses;

    public List<EntitlementPackageItem> MyRegisteredCourses { get; } = new();

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
        }
        else if (string.Equals(loginSource, "MOCK", StringComparison.OrdinalIgnoreCase))
        {
            LoginSourceLabel.Text = "Nguồn dữ liệu sau đăng nhập: dữ liệu MOCK";
            LoginSourceBadge.BackgroundColor = Color.FromArgb("#FFF4D6");
            LoginSourceLabel.TextColor = Color.FromArgb("#9A6700");
        }
        else
        {
            LoginSourceLabel.Text = "Nguồn dữ liệu sau đăng nhập: chưa xác định";
            LoginSourceBadge.BackgroundColor = Color.FromArgb("#ECECEC");
            LoginSourceLabel.TextColor = Color.FromArgb("#5F5F5F");
        }

        await LoadMyRegisteredCoursesAsync();
    }

    private async Task LoadMyRegisteredCoursesAsync()
    {
        if (_isLoadingMyCourses)
            return;

        try
        {
            _isLoadingMyCourses = true;
            MyCourseLoading.IsVisible = true;
            MyCourseLoading.IsRunning = true;
            MyCoursesStatusLabel.Text = "Đang tải khóa học của bạn...";

            var packages = await _entitlementService.GetMyRegisteredPackagesAsync();

            MyRegisteredCourses.Clear();
            MyRegisteredCourses.AddRange(packages);

            if (MyRegisteredCourses.Count == 0)
            {
                MyCoursesStatusLabel.Text = "Bạn chưa đăng ký khóa học nào.";
            }
            else
            {
                MyCoursesStatusLabel.Text = $"Bạn đã đăng ký {MyRegisteredCourses.Count} khóa học.";
            }

            OnPropertyChanged(nameof(MyRegisteredCourses));
        }
        catch (UnauthorizedAccessException)
        {
            MyCoursesStatusLabel.Text = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
        }
        catch (Exception ex)
        {
            MyCoursesStatusLabel.Text = "Không tải được khóa học của bạn.";
            Console.WriteLine($"[Dashboard][MyCourses][Load][Error] {ex.Message}");
        }
        finally
        {
            _isLoadingMyCourses = false;
            MyCourseLoading.IsVisible = false;
            MyCourseLoading.IsRunning = false;
        }
    }

    private async void OnRegisterCourseNowTapped(object? sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(CourseRegistrationPage));
    }

    protected override async void OnNavigatedTo(NavigatedToEventArgs args)
    {
        base.OnNavigatedTo(args);

        if (Shell.Current?.CurrentState?.Location?.OriginalString?.Contains("refreshRegisteredCourses=true", StringComparison.OrdinalIgnoreCase) == true)
        {
            await LoadMyRegisteredCoursesAsync();
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
