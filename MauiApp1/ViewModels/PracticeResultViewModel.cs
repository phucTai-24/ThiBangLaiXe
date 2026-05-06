using System.Windows.Input;
using MauiApp1.Helpers;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

[QueryProperty(nameof(SessionId), "sessionId")]
public class PracticeResultViewModel : BaseViewModel
{
    private readonly IPracticeService _practiceService;
    private string _sessionId = string.Empty;
    private PracticeSessionResult? _result;

    public PracticeResultViewModel(IPracticeService practiceService)
    {
        _practiceService = practiceService;
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoPracticeHomeCommand = new Command(async () => await NavigationHelper.GoBackAsync());
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
        RetakeCommand = new Command(async () => await RetakeAsync());
    }

    public string SessionId
    {
        get => _sessionId;
        set
        {
            if (SetProperty(ref _sessionId, value) && !string.IsNullOrWhiteSpace(value))
            {
                _ = LoadAsync();
            }
        }
    }

    public PracticeSessionResult? Result
    {
        get => _result;
        set => SetProperty(ref _result, value);
    }

    public ICommand GoHomeCommand { get; }
    public ICommand GoPracticeHomeCommand { get; }
    public ICommand GoMockExamCommand { get; }
    public ICommand RetakeCommand { get; }

    private async Task LoadAsync()
    {
        Result = await _practiceService.GetPracticeSessionResultAsync(SessionId);
    }

    private async Task RetakeAsync()
    {
        var session = await _practiceService.GetPracticeSessionAsync(SessionId);
        if (session.TopicId == 0)
        {
            var groupCode = ResolveFilteredGroupCode(session.TopicName);
            var retakeFilteredSession = await _practiceService.StartFilteredPracticeSessionAsync(groupCode, session.TotalQuestions, note: $"Làm lại {session.TopicName}");
            await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={retakeFilteredSession.Id}");
            return;
        }

        var newSession = await _practiceService.StartPracticeSessionAsync(session.TopicId, session.TotalQuestions, $"Làm lại chủ đề {session.TopicName}");
        await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={newSession.Id}");
    }

    private static string ResolveFilteredGroupCode(string topicName)
    {
        if (topicName.Contains("biển báo", StringComparison.OrdinalIgnoreCase))
            return "traffic-signs";

        if (topicName.Contains("sa hình", StringComparison.OrdinalIgnoreCase))
            return "situational";

        return "theory";
    }
}
