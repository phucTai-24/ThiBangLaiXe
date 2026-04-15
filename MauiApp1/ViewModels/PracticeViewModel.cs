using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public class PracticeViewModel : BaseViewModel
{
    private readonly IPracticeService _practiceService;
    private PracticeTopic? _recommendedTopic;
    private string _practiceSummaryText = "Chưa có dữ liệu ôn tập";
    private string _lastSessionText = "Hãy bắt đầu một phiên ôn tập mới";

    public PracticeViewModel(IPracticeService practiceService)
    {
        _practiceService = practiceService;

        Topics = new ObservableCollection<PracticeTopic>();
        PracticeHistory = new ObservableCollection<PracticeHistoryItem>();

        GoBackCommand = new Command(async () => await Shell.Current.GoToAsync(".."));
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
        StartRecommendedPracticeCommand = new Command(async () => await StartRecommendedPracticeAsync());
        StartTopicPracticeCommand = new Command<PracticeTopic>(async topic => await StartTopicPracticeAsync(topic));

        _ = LoadAsync();
    }

    public ObservableCollection<PracticeTopic> Topics { get; }
    public ObservableCollection<PracticeHistoryItem> PracticeHistory { get; }

    public PracticeTopic? RecommendedTopic
    {
        get => _recommendedTopic;
        set => SetProperty(ref _recommendedTopic, value);
    }

    public string PracticeSummaryText
    {
        get => _practiceSummaryText;
        set => SetProperty(ref _practiceSummaryText, value);
    }

    public string LastSessionText
    {
        get => _lastSessionText;
        set => SetProperty(ref _lastSessionText, value);
    }

    public ICommand GoBackCommand { get; }
    public ICommand GoHomeCommand { get; }
    public ICommand GoMockExamCommand { get; }
    public ICommand StartRecommendedPracticeCommand { get; }
    public ICommand StartTopicPracticeCommand { get; }

    private async Task LoadAsync()
    {
        var topics = await _practiceService.GetTopicsAsync();
        var history = await _practiceService.GetPracticeHistoryAsync();

        Topics.Clear();
        foreach (var topic in topics)
        {
            Topics.Add(topic);
        }

        PracticeHistory.Clear();
        foreach (var item in history)
        {
            PracticeHistory.Add(item);
        }

        RecommendedTopic = topics.FirstOrDefault(x => x.IsRecommended) ?? topics.FirstOrDefault();

        var totalQuestions = history.Sum(x => x.TotalQuestions);
        var totalCorrect = history.Sum(x => x.CorrectAnswers);
        var averageScore = history.Count != 0 ? (int)Math.Round(history.Average(x => x.Score)) : 0;

        PracticeSummaryText = history.Count == 0
            ? "Chưa có lịch sử ôn tập. Chọn một chủ đề để bắt đầu."
            : $"Đã ôn {history.Count} phiên • {totalCorrect}/{totalQuestions} câu đúng • Điểm TB {averageScore}";

        var latest = history.OrderByDescending(x => x.PracticedAt).FirstOrDefault();
        LastSessionText = latest == null
            ? "Hãy bắt đầu một phiên ôn tập mới"
            : $"Gần nhất: {latest.Topic} • {latest.CorrectAnswers}/{latest.TotalQuestions} câu đúng";
    }

    private async Task StartRecommendedPracticeAsync()
    {
        if (RecommendedTopic == null)
        {
            return;
        }

        await StartTopicPracticeAsync(RecommendedTopic);
    }

    private async Task StartTopicPracticeAsync(PracticeTopic? topic)
    {
        if (topic == null)
        {
            return;
        }

        var session = await _practiceService.StartPracticeSessionAsync(
            topic.Id,
            Math.Min(topic.QuestionCount, 20),
            $"Phiên ôn tập mock chủ đề {topic.Name}");

        await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={session.Id}");
    }
}
