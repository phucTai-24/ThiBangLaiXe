namespace MauiApp1.Services;

public static class VnPayDeepLinkState
{
    private static readonly object Locker = new();
    private static Uri? _latestUri;

    public static void Set(Uri uri)
    {
        lock (Locker)
        {
            _latestUri = uri;
        }
    }

    public static bool TryConsume(out Uri? uri)
    {
        lock (Locker)
        {
            uri = _latestUri;
            _latestUri = null;
            return uri is not null;
        }
    }
}

