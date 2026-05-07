using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.OS;
using MauiApp1.Services;

namespace MauiApp1
{
    [Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true, LaunchMode = LaunchMode.SingleTop, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
    [IntentFilter(
        new[] { Intent.ActionView },
        Categories = new[] { Intent.CategoryDefault, Intent.CategoryBrowsable },
        DataScheme = "hethongthibanglai",
        DataHost = "payments",
        DataPathPrefix = "/vnpay/return")]
    public class MainActivity : MauiAppCompatActivity
    {
        protected override void OnCreate(Bundle? savedInstanceState)
        {
            base.OnCreate(savedInstanceState);
            CaptureDeepLink(Intent);
        }

        protected override void OnNewIntent(Intent? intent)
        {
            base.OnNewIntent(intent);
            CaptureDeepLink(intent);
        }

        private static void CaptureDeepLink(Intent? intent)
        {
            var data = intent?.Data;
            if (data is null)
                return;

            if (Uri.TryCreate(data.ToString(), UriKind.Absolute, out var deepLinkUri))
            {
                VnPayDeepLinkState.Set(deepLinkUri);
            }
        }
    }
}
