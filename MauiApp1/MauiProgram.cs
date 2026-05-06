using Microsoft.Extensions.Logging;
using MauiApp1.Controllers;
using MauiApp1.Services;
using MauiApp1.ViewModels;
using MauiApp1.Views;

namespace MauiApp1
{
    public static class MauiProgram
    {
        private const string GeminiApiKeyPreferenceKey = "Gemini.ApiKey";
        private const string DefaultGeminiApiKey = "AIzaSyBPkF0q8hWxQofcAj_VbyDhtSp7affSwFU";

        public static MauiApp CreateMauiApp()
        {
            ConfigureGeminiApiKey();

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
             builder.Services.AddHttpClient<IAuthService, ApiAuthService>(client =>
             {
                 client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                 client.Timeout = TimeSpan.FromSeconds(30);
             });
             builder.Services.AddHttpClient<IExamService, ApiExamService>(client =>
             {
                 client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                 client.Timeout = TimeSpan.FromSeconds(30);
             });
             builder.Services.AddHttpClient<IPracticeService, ApiPracticeService>(client =>
             {
                 client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                 client.Timeout = TimeSpan.FromSeconds(30);
             });
              builder.Services.AddHttpClient<IStudyScheduleService, ApiStudyScheduleService>(client =>
              {
                  client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                  client.Timeout = TimeSpan.FromSeconds(30);
              });
              builder.Services.AddHttpClient<IEntitlementService, ApiEntitlementService>(client =>
              {
                  client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                  client.Timeout = TimeSpan.FromSeconds(30);
              });
              builder.Services.AddHttpClient<ICriticalPracticeService, ApiCriticalPracticeService>(client =>
              {
                  client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                  client.Timeout = TimeSpan.FromSeconds(30);
              });
              builder.Services.AddHttpClient<IChatPracticeService, PracticeService>(client =>
              {
                  client.BaseAddress = new Uri(ApiEndpoints.GetBaseUrl());
                  client.Timeout = TimeSpan.FromSeconds(30);
              });
              builder.Services.AddHttpClient<IChatService, ChatService>(client =>
              {
                  client.Timeout = TimeSpan.FromSeconds(60);
              });
              builder.Services.AddSingleton<IPracticeSessionStore, PracticeSessionStore>();
               
               // ViewModels
              builder.Services.AddTransient<ChatOverlayViewModel>();
               builder.Services.AddTransient<MockExamViewModel>();
             builder.Services.AddTransient<ExamListViewModel>();
             builder.Services.AddTransient<ExamResultViewModel>();
             builder.Services.AddTransient<WrongAnswersViewModel>();
             builder.Services.AddTransient<PracticeViewModel>();
             builder.Services.AddTransient<CriticalPracticeViewModel>();
             builder.Services.AddTransient<PracticeSessionViewModel>();
             builder.Services.AddTransient<PracticeResultViewModel>();
             builder.Services.AddTransient<StudyScheduleViewModel>();
             
              // Views
               builder.Services.AddTransient<DashboardPage>();
               builder.Services.AddTransient<ExamListPage>();
               builder.Services.AddTransient<MockExamPage>();
               builder.Services.AddTransient<ExamResultPage>();
              builder.Services.AddTransient<WrongAnswersPage>();
             builder.Services.AddTransient<TrafficSignsPage>();
             builder.Services.AddTransient<CriticalPracticePage>();
             builder.Services.AddTransient<PracticeSessionPage>();
             builder.Services.AddTransient<PracticeResultPage>();
             builder.Services.AddTransient<StudySchedulePage>();
            
            builder.Services.AddSingleton<AppShell>();

#if DEBUG
     		builder.Logging.AddDebug();
#endif

            return builder.Build();
        }

        private static void ConfigureGeminiApiKey()
        {
            if (string.IsNullOrWhiteSpace(Preferences.Get(GeminiApiKeyPreferenceKey, string.Empty)))
                Preferences.Set(GeminiApiKeyPreferenceKey, DefaultGeminiApiKey);
        }
    }
}
