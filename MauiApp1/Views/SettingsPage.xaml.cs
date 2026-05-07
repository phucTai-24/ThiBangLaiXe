using MauiApp1.Helpers;

namespace MauiApp1.Views;

public partial class SettingsPage : ContentPage
{
    private const string GeminiApiKeyPreferenceKey = "Gemini.ApiKey";
    private const string NotificationEnabledPreferenceKey = "Settings.NotificationEnabled";
    private const string DarkModePreferenceKey = "Settings.DarkMode";
    private const string LanguagePreferenceKey = "Settings.Language";
    private bool _isLoadingSettings;

    public SettingsPage()
    {
        InitializeComponent();
        LoadSettings();
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }

    private void LoadSettings()
    {
        _isLoadingSettings = true;

        var currentKey = Preferences.Get(GeminiApiKeyPreferenceKey, string.Empty);
        GeminiApiKeyEntry.Text = currentKey;

        NotificationSwitch.IsToggled = Preferences.Get(NotificationEnabledPreferenceKey, true);
        ThemeSwitch.IsToggled = Preferences.Get(DarkModePreferenceKey, false);
        LanguageLabel.Text = Preferences.Get(LanguagePreferenceKey, "Tiếng Việt");
        VersionLabel.Text = $"ONTHIBANGLAI {AppInfo.Current.VersionString}";

        UpdateNotificationStatus(NotificationSwitch.IsToggled);
        UpdateThemeStatus(ThemeSwitch.IsToggled);
        UpdateSummary();

        _isLoadingSettings = false;
    }

    private async void OnSaveGeminiApiKeyClicked(object? sender, EventArgs e)
    {
        var key = GeminiApiKeyEntry.Text?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(key))
        {
            await DisplayAlert("Thiếu API key", "Vui lòng nhập Gemini API key trước khi lưu.", "OK");
            return;
        }

        Preferences.Set(GeminiApiKeyPreferenceKey, key);
        await DisplayAlert("Đã lưu", "Gemini API key đã được cập nhật.", "OK");
    }

    private async void OnClearGeminiApiKeyClicked(object? sender, EventArgs e)
    {
        Preferences.Remove(GeminiApiKeyPreferenceKey);
        GeminiApiKeyEntry.Text = string.Empty;
        await DisplayAlert("Đã xóa", "Gemini API key đã được xóa khỏi thiết bị.", "OK");
    }

    private async void OnProfileInfoTapped(object? sender, TappedEventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(ProfilePage));
    }

    private async void OnSecurityTapped(object? sender, TappedEventArgs e)
    {
        await DisplayAlert("Bảo mật", "Chức năng đổi mật khẩu sẽ được kết nối với API tài khoản ở bước sau.", "OK");
    }

    private void OnNotificationSwitchToggled(object? sender, ToggledEventArgs e)
    {
        if (_isLoadingSettings)
            return;

        Preferences.Set(NotificationEnabledPreferenceKey, e.Value);
        UpdateNotificationStatus(e.Value);
        UpdateSummary();
    }

    private void OnThemeSwitchToggled(object? sender, ToggledEventArgs e)
    {
        if (_isLoadingSettings)
            return;

        Preferences.Set(DarkModePreferenceKey, e.Value);
        Application.Current!.UserAppTheme = e.Value ? AppTheme.Dark : AppTheme.Light;
        UpdateThemeStatus(e.Value);
        UpdateSummary();
    }

    private async void OnLanguageTapped(object? sender, TappedEventArgs e)
    {
        var selected = await DisplayActionSheet("Ngôn ngữ", "Hủy", null, "Tiếng Việt", "English");
        if (selected is null || selected == "Hủy")
            return;

        Preferences.Set(LanguagePreferenceKey, selected);
        LanguageLabel.Text = selected;
        UpdateSummary();
    }

    private async void OnHelpTapped(object? sender, TappedEventArgs e)
    {
        await DisplayAlert("Trợ giúp", "Bạn có thể cấu hình API, thông báo, giao diện và thông tin tài khoản tại màn hình này.", "OK");
    }

    private async void OnVersionTapped(object? sender, TappedEventArgs e)
    {
        await DisplayAlert("Phiên bản ứng dụng", $"ONTHIBANGLAI {AppInfo.Current.VersionString}\nBuild {AppInfo.Current.BuildString}", "OK");
    }

    private async void OnLogoutTapped(object? sender, TappedEventArgs e)
    {
        var confirm = await DisplayAlert("Đăng xuất", "Vui lòng quay về màn hồ sơ để đăng xuất tài khoản hiện tại.", "Về hồ sơ", "Hủy");
        if (confirm)
            await Shell.Current.GoToAsync(nameof(ProfilePage));
    }

    private void UpdateNotificationStatus(bool enabled)
    {
        NotificationStatusLabel.Text = enabled
            ? "Đang bật nhắc nhở ôn bài và lịch học"
            : "Đã tắt thông báo học tập";
    }

    private void UpdateThemeStatus(bool darkMode)
    {
        ThemeStatusLabel.Text = darkMode ? "Tối" : "Sáng";
    }

    private void UpdateSummary()
    {
        SettingsSummaryLabel.Text = $"Thông báo: {(NotificationSwitch.IsToggled ? "Bật" : "Tắt")} • Giao diện: {(ThemeSwitch.IsToggled ? "Tối" : "Sáng")} • {LanguageLabel.Text}";
    }
}
