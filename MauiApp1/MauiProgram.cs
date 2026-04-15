using Microsoft.Extensions.Logging;
using MauiApp1.Controllers;
using MauiApp1.Services;
using MauiApp1.ViewModels;
using MauiApp1.Views;

namespace MauiApp1
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                });

            // Controllers
            builder.Services.AddSingleton<AppController>();
            builder.Services.AddSingleton<AuthController>();
            
            // Services
            builder.Services.AddSingleton<IAuthService, MockAuthService>();
            builder.Services.AddSingleton<IExamService, MockExamService>();
            builder.Services.AddSingleton<IPracticeService, MockPracticeService>();
            
            // ViewModels
            builder.Services.AddTransient<MockExamViewModel>();
            builder.Services.AddTransient<ExamResultViewModel>();
            builder.Services.AddTransient<PracticeViewModel>();
            builder.Services.AddTransient<PracticeSessionViewModel>();
            builder.Services.AddTransient<PracticeResultViewModel>();
            
            // Views
            builder.Services.AddTransient<MockExamPage>();
            builder.Services.AddTransient<ExamResultPage>();
            builder.Services.AddTransient<TrafficSignsPage>();
            builder.Services.AddTransient<PracticeSessionPage>();
            builder.Services.AddTransient<PracticeResultPage>();
            
            builder.Services.AddSingleton<AppShell>();

#if DEBUG
     		builder.Logging.AddDebug();
#endif

            return builder.Build();
        }
    }
}
