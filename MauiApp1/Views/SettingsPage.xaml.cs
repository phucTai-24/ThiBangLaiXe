using MauiApp1.Helpers;

namespace MauiApp1.Views;

public partial class SettingsPage : ContentPage
{
    private const string GeminiApiKeyPreferenceKey = "Gemini.ApiKey";

    public SettingsPage()
    {
        InitializeComponent();
        LoadGeminiApiKey();
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }

    private void LoadGeminiApiKey()
    {
        var currentKey = Preferences.Get(GeminiApiKeyPreferenceKey, string.Empty);
        GeminiApiKeyEntry.Text = currentKey;
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
}
