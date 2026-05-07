namespace MauiApp1.Services;

public static class ApiEndpoints
{
    private const string ApiBaseUrlPreferenceKey = "Api.BaseUrl";
    private const string PublicNgrokBaseUrl = "https://crop-unshackle-lavender.ngrok-free.dev/";
    private const string AndroidLocalBaseUrl = "http://10.0.2.2:5017/";
    private const string DesktopLocalBaseUrl = "http://localhost:5017/";

    public static string GetBaseUrl()
    {
        var overrideUrl = Preferences.Default.Get(ApiBaseUrlPreferenceKey, string.Empty)?.Trim();
        if (Uri.TryCreate(overrideUrl, UriKind.Absolute, out var overrideUri)
            && (overrideUri.Scheme == Uri.UriSchemeHttp || overrideUri.Scheme == Uri.UriSchemeHttps))
        {
            return EnsureTrailingSlash(overrideUri.ToString());
        }

        // Ngrok có thể hết hạn/tunnel sai port -> 404, nên default quay về local để app luôn chạy được.
        if (DeviceInfo.Platform == DevicePlatform.Android)
            return AndroidLocalBaseUrl;

        return DesktopLocalBaseUrl;
    }

    public static void SetBaseUrlOverride(string? baseUrl)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            Preferences.Default.Remove(ApiBaseUrlPreferenceKey);
            return;
        }

        if (!Uri.TryCreate(baseUrl.Trim(), UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("Base URL không hợp lệ.", nameof(baseUrl));
        }

        Preferences.Default.Set(ApiBaseUrlPreferenceKey, EnsureTrailingSlash(uri.ToString()));
    }

    public static string GetSuggestedNgrokBaseUrl() => PublicNgrokBaseUrl;

    private static string EnsureTrailingSlash(string value)
    {
        return value.EndsWith('/') ? value : value + "/";
    }
}
