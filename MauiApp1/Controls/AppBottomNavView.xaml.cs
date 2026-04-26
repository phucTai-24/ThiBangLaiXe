namespace MauiApp1.Controls;

public partial class AppBottomNavView : ContentView
{
    public static readonly BindableProperty CurrentTabProperty = BindableProperty.Create(
        nameof(CurrentTab),
        typeof(string),
        typeof(AppBottomNavView),
        "",
        propertyChanged: OnCurrentTabChanged);

    public string CurrentTab
    {
        get => (string)GetValue(CurrentTabProperty);
        set => SetValue(CurrentTabProperty, value);
    }

    public AppBottomNavView()
    {
        InitializeComponent();
        ApplySelectedState();
    }

    private static void OnCurrentTabChanged(BindableObject bindable, object oldValue, object newValue)
    {
        if (bindable is AppBottomNavView view)
            view.ApplySelectedState();
    }

    private void ApplySelectedState()
    {
        SetTabState(HomeBadge, HomeText, HomeIcon, CurrentTab == "home");
        SetTabState(ExamBadge, ExamText, ExamIcon, CurrentTab == "exam");
        SetTabState(PracticeBadge, PracticeText, PracticeIcon, CurrentTab == "practice");
        SetTabState(ScheduleBadge, ScheduleText, ScheduleIcon, CurrentTab == "schedule");
        SetTabState(ProfileBadge, ProfileText, ProfileIcon, CurrentTab == "profile");
    }

    private static void SetTabState(Border badge, Label textLabel, Label iconLabel, bool isSelected)
    {
        badge.BackgroundColor = isSelected ? Color.FromArgb("#FFDEA8") : Colors.Transparent;
        textLabel.TextColor = isSelected ? Color.FromArgb("#7C5800") : Color.FromArgb("#6B6257");
        iconLabel.TextColor = isSelected ? Color.FromArgb("#271900") : Color.FromArgb("#6B6257");
    }

    private Task NavigateAsync(string route)
    {
        return Shell.Current.GoToAsync(route);
    }

    private async void OnHomeTapped(object? sender, TappedEventArgs e)
    {
        await NavigateAsync(nameof(Views.DashboardPage));
    }

    private async void OnExamTapped(object? sender, TappedEventArgs e)
    {
        await NavigateAsync(nameof(Views.ExamListPage));
    }

    private async void OnPracticeTapped(object? sender, TappedEventArgs e)
    {
        await NavigateAsync(nameof(Views.TrafficSignsPage));
    }

    private async void OnScheduleTapped(object? sender, TappedEventArgs e)
    {
        await NavigateAsync(nameof(Views.StudySchedulePage));
    }

    private async void OnProfileTapped(object? sender, TappedEventArgs e)
    {
        await NavigateAsync(nameof(Views.ProfilePage));
    }
}
