using MauiApp1.Models;

namespace MauiApp1.Controllers;

public sealed class AppController : BaseController
{
    public IReadOnlyList<RouteItem> MenuItems { get; } =
    [
        new() { Title = "Splash", Route = nameof(Views.MainPage) },
        new() { Title = "Onboarding", Route = nameof(Views.OnboardingPage) },
        new() { Title = "Đăng nhập", Route = nameof(Views.LoginPage) },
        new() { Title = "Đăng ký", Route = nameof(Views.RegisterPage) },
        new() { Title = "Quên mật khẩu", Route = nameof(Views.ForgotPasswordPage) },
        new() { Title = "Trang chủ", Route = nameof(Views.DashboardPage) },
        new() { Title = "Đề thi", Route = nameof(Views.ExamListPage) },
        new() { Title = "Biển báo", Route = nameof(Views.TrafficSignsPage) },
        new() { Title = "Thi thử", Route = nameof(Views.MockExamPage) },
        new() { Title = "Câu sai", Route = nameof(Views.WrongAnswersPage) },
        new() { Title = "Kết quả", Route = nameof(Views.ExamResultPage) },
        new() { Title = "Lịch sử", Route = nameof(Views.HistoryPage) },
        new() { Title = "Cá nhân", Route = nameof(Views.ProfilePage) },
        new() { Title = "Thông báo", Route = nameof(Views.NotificationPage) },
        new() { Title = "Cài đặt", Route = nameof(Views.SettingsPage) }
    ];
}
