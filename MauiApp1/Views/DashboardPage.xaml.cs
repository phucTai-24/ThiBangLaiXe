using MauiApp1.Models.Entitlements;
using MauiApp1.Services;
using System.Globalization;

namespace MauiApp1.Views;

public partial class DashboardPage : ContentPage
{
    private readonly IEntitlementService _entitlementService;
    private readonly IStudyScheduleService _studyScheduleService;
    private bool _isLoadingMyCourses;
    private bool _isLoadingDashboardOverview;

    public List<EntitlementPackageItem> MyRegisteredCourses { get; } = new();

    public DashboardPage(IEntitlementService entitlementService, IStudyScheduleService studyScheduleService)
    {
        _entitlementService = entitlementService;
        _studyScheduleService = studyScheduleService;
        InitializeComponent();
        BindingContext = this;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        await LoadMyRegisteredCoursesAsync();
        await LoadDashboardOverviewAsync();
    }

    private async Task LoadDashboardOverviewAsync()
    {
        if (_isLoadingDashboardOverview)
            return;

        try
        {
            _isLoadingDashboardOverview = true;
            await LoadNextSessionSummaryAsync();
            UpdateTuitionSummary();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Dashboard][Overview][Load][Error] {ex.Message}");
        }
        finally
        {
            _isLoadingDashboardOverview = false;
        }
    }

    private async Task LoadNextSessionSummaryAsync()
    {
        try
        {
            var schedules = await _studyScheduleService.GetUpcomingScheduleAsync();
            var next = schedules.FirstOrDefault(x => x.IsNextUp) ?? schedules.FirstOrDefault();
            if (next == null)
            {
                NextSessionQuickValueLabel.Text = "Chưa có lịch";
                NextSessionQuickCaptionLabel.Text = "Chưa có buổi học sắp tới";
                NextSessionDetailTimeLabel.Text = "Chưa có buổi học sắp tới";
                NextSessionDetailInfoLabel.Text = "Lịch học sẽ hiển thị khi lớp của bạn có lịch.";
                return;
            }

            NextSessionQuickValueLabel.Text = BuildQuickNextSessionText(next);
            NextSessionQuickCaptionLabel.Text = string.IsNullOrWhiteSpace(next.Location) ? next.SessionTitle : next.Location;
            NextSessionDetailTimeLabel.Text = $"{ToTitleCase(next.WeekdayText)}, {next.DateText} • {next.TimeRange}";
            NextSessionDetailInfoLabel.Text = BuildNextSessionDetailText(next);
        }
        catch (UnauthorizedAccessException)
        {
            NextSessionQuickValueLabel.Text = "Cần đăng nhập";
            NextSessionQuickCaptionLabel.Text = "Không tải được lịch học";
            NextSessionDetailTimeLabel.Text = "Phiên đăng nhập đã hết hạn";
            NextSessionDetailInfoLabel.Text = "Vui lòng đăng nhập lại để xem lịch học.";
        }
        catch (Exception ex)
        {
            NextSessionQuickValueLabel.Text = "Không tải được";
            NextSessionQuickCaptionLabel.Text = "Lỗi dữ liệu lịch học";
            NextSessionDetailTimeLabel.Text = "Không tải được buổi học tiếp theo";
            NextSessionDetailInfoLabel.Text = "Vui lòng thử lại sau.";
            Console.WriteLine($"[Dashboard][NextSession][Load][Error] {ex.Message}");
        }
    }

    private void UpdateTuitionSummary()
    {
        if (MyRegisteredCourses.Count == 0)
        {
            TuitionStatusLabel.Text = "Chưa đăng ký";
            TuitionStatusLabel.TextColor = Color.FromArgb("#8A4B00");
            TuitionCaptionLabel.Text = "Chưa có khóa học";
            return;
        }

        var totalCount = MyRegisteredCourses.Count;
        var totalTuitionFee = MyRegisteredCourses.Sum(package => package.TuitionFee);

        TuitionStatusLabel.Text = totalTuitionFee > 0
            ? $"{totalTuitionFee:N0}đ"
            : $"{totalCount} khóa";
        TuitionStatusLabel.TextColor = Color.FromArgb("#2E7D32");
        TuitionCaptionLabel.Text = $"Đã thanh toán {totalCount} khóa học";
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
            UpdateTuitionSummary();
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

    private static string BuildQuickNextSessionText(MauiApp1.Models.StudyScheduleItem item)
    {
        var date = item.DateText;
        var startTime = item.TimeRange.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? item.TimeRange;
        return string.IsNullOrWhiteSpace(date) ? startTime : $"{date} • {startTime}";
    }

    private static string BuildNextSessionDetailText(MauiApp1.Models.StudyScheduleItem item)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(item.Location))
            parts.Add($"Địa điểm: {item.Location}");
        if (!string.IsNullOrWhiteSpace(item.Description))
            parts.Add($"Nội dung: {item.Description}");
        if (!string.IsNullOrWhiteSpace(item.CourseName))
            parts.Add(item.CourseName);

        return parts.Count == 0 ? "Chưa có thông tin chi tiết buổi học." : string.Join(" • ", parts);
    }

    private static string ToTitleCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return value;

        return CultureInfo.GetCultureInfo("vi-VN").TextInfo.ToTitleCase(value.Trim());
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
