using MauiApp1.Controllers;
using MauiApp1.Views;

namespace MauiApp1
{
    public partial class AppShell : Shell
    {
        public AppController Controller { get; }

        public AppShell(AppController controller)
        {
            InitializeComponent();

            Controller = controller;

            Routing.RegisterRoute(nameof(MainPage), typeof(MainPage));
            Routing.RegisterRoute(nameof(OnboardingPage), typeof(OnboardingPage));
            Routing.RegisterRoute(nameof(LoginPage), typeof(LoginPage));
            Routing.RegisterRoute(nameof(RegisterPage), typeof(RegisterPage));
            Routing.RegisterRoute(nameof(ForgotPasswordPage), typeof(ForgotPasswordPage));
            Routing.RegisterRoute(nameof(DashboardPage), typeof(DashboardPage));
            Routing.RegisterRoute(nameof(ExamListPage), typeof(ExamListPage));
            Routing.RegisterRoute(nameof(TrafficSignsPage), typeof(TrafficSignsPage));
            Routing.RegisterRoute(nameof(PracticeSessionPage), typeof(PracticeSessionPage));
            Routing.RegisterRoute(nameof(PracticeResultPage), typeof(PracticeResultPage));
            Routing.RegisterRoute(nameof(MockExamPage), typeof(MockExamPage));
            Routing.RegisterRoute(nameof(WrongAnswersPage), typeof(WrongAnswersPage));
            Routing.RegisterRoute(nameof(ExamResultPage), typeof(ExamResultPage));
            Routing.RegisterRoute(nameof(HistoryPage), typeof(HistoryPage));
            Routing.RegisterRoute(nameof(ProfilePage), typeof(ProfilePage));
            Routing.RegisterRoute(nameof(NotificationPage), typeof(NotificationPage));
            Routing.RegisterRoute(nameof(StudySchedulePage), typeof(StudySchedulePage));
            Routing.RegisterRoute(nameof(SettingsPage), typeof(SettingsPage));
        }
    }
}
