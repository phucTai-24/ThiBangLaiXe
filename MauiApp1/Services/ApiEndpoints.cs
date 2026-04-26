namespace MauiApp1.Services;

public static class ApiEndpoints
{
    public static string GetBaseUrl()
    {
        if (DeviceInfo.Platform == DevicePlatform.Android)
            return "http://10.0.2.2:5017/";

        return "http://localhost:5017/";
    }
}
