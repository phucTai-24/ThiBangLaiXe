using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Helpers;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public class PracticeViewModel : BaseViewModel
{
    private readonly IPracticeService _practiceService;
    private PracticeTopic? _recommendedTopic;
    private string _practiceSummaryText = "Chưa có dữ liệu ôn tập";
    private string _lastSessionText = "Hãy bắt đầu một phiên ôn tập mới";
    private int _selectedQuestionCount = 20;
    private int _criticalQuestionCount;
    private int _trafficRulesQuestionCount;
    private int _theoryQuestionCount;
    private int _drivingCultureQuestionCount;
    private int _drivingTechniqueQuestionCount;
    private int _trafficSignsQuestionCount;
    private int _situationalQuestionCount;
    private bool _isLoading;

    public PracticeViewModel(IPracticeService practiceService)
    {
        _practiceService = practiceService;

        Topics = new ObservableCollection<PracticeTopic>();
        PracticeHistory = new ObservableCollection<PracticeHistoryItem>();
        QuestionCountOptions = new ObservableCollection<int> { 10, 15, 20, 25, 30 };

        GoBackCommand = new Command(async () => await NavigationHelper.GoBackAsync());
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
        StartRecommendedPracticeCommand = new Command(async () => await StartRecommendedPracticeAsync());
        StartTopicPracticeCommand = new Command<PracticeTopic>(async topic => await StartTopicPracticeAsync(topic));
        StartCriticalPracticeCommand = new Command(async () => await StartFilteredPracticeAsync("critical", CriticalQuestionCount, "Điểm liệt"));
        StartTrafficRulesPracticeCommand = new Command(async () => await StartFilteredPracticeAsync("theory", TrafficRulesQuestionCount, "Quy tắc giao thông", "CD_QTGT"));
        StartTheoryPracticeCommand = new Command(async () => await StartFilteredPracticeAsync("theory", TheoryQuestionCount, "Lý thuyết"));
        StartDrivingCulturePracticeCommand = new Command(async () => await StartFilteredPracticeAsync("theory", DrivingCultureQuestionCount, "Văn hóa và đạo đức lái xe", "CD_VH"));
        StartDrivingTechniquePracticeCommand = new Command(async () => await StartFilteredPracticeAsync("theory", DrivingTechniqueQuestionCount, "Kỹ thuật lái xe", "CD_KT"));
        StartTrafficSignsPracticeCommand = new Command(async () => await StartFilteredPracticeAsync("traffic-signs", TrafficSignsQuestionCount, "Biển báo"));
        StartSituationalPracticeCommand = new Command(async () => await StartFilteredPracticeAsync("situational", SituationalQuestionCount, "Sa hình"));

        _ = LoadAsync();
    }

    public ObservableCollection<PracticeTopic> Topics { get; }
    public ObservableCollection<PracticeHistoryItem> PracticeHistory { get; }
    public ObservableCollection<int> QuestionCountOptions { get; }

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

    public int SelectedQuestionCount
    {
        get => _selectedQuestionCount;
        set => SetProperty(ref _selectedQuestionCount, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public int CriticalQuestionCount
    {
        get => _criticalQuestionCount;
        set => SetProperty(ref _criticalQuestionCount, value);
    }

    public int TheoryQuestionCount
    {
        get => _theoryQuestionCount;
        set => SetProperty(ref _theoryQuestionCount, value);
    }

    public int TrafficRulesQuestionCount
    {
        get => _trafficRulesQuestionCount;
        set => SetProperty(ref _trafficRulesQuestionCount, value);
    }

    public int DrivingCultureQuestionCount
    {
        get => _drivingCultureQuestionCount;
        set => SetProperty(ref _drivingCultureQuestionCount, value);
    }

    public int DrivingTechniqueQuestionCount
    {
        get => _drivingTechniqueQuestionCount;
        set => SetProperty(ref _drivingTechniqueQuestionCount, value);
    }

    public int TrafficSignsQuestionCount
    {
        get => _trafficSignsQuestionCount;
        set => SetProperty(ref _trafficSignsQuestionCount, value);
    }

    public int SituationalQuestionCount
    {
        get => _situationalQuestionCount;
        set => SetProperty(ref _situationalQuestionCount, value);
    }

    public ICommand GoBackCommand { get; }
    public ICommand GoHomeCommand { get; }
    public ICommand GoMockExamCommand { get; }
    public ICommand StartRecommendedPracticeCommand { get; }
    public ICommand StartTopicPracticeCommand { get; }
    public ICommand StartCriticalPracticeCommand { get; }
    public ICommand StartTrafficRulesPracticeCommand { get; }
    public ICommand StartTheoryPracticeCommand { get; }
    public ICommand StartDrivingCulturePracticeCommand { get; }
    public ICommand StartDrivingTechniquePracticeCommand { get; }
    public ICommand StartTrafficSignsPracticeCommand { get; }
    public ICommand StartSituationalPracticeCommand { get; }

    private async Task LoadAsync()
    {
        if (IsLoading)
        {
            return;
        }

        IsLoading = true;

        try
        {
            var topics = await _practiceService.GetTopicsAsync();
            var history = await _practiceService.GetPracticeHistoryAsync();
            CriticalQuestionCount = await _practiceService.GetCriticalSummaryAsync();
            var groupCounts = await _practiceService.GetPracticeQuestionGroupCountsAsync();
            var trafficRulesCounts = await _practiceService.GetPracticeQuestionGroupCountsAsync("CD_QTGT");
            var drivingCultureCounts = await _practiceService.GetPracticeQuestionGroupCountsAsync("CD_VH");
            var drivingTechniqueCounts = await _practiceService.GetPracticeQuestionGroupCountsAsync("CD_KT");

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
            TheoryQuestionCount = groupCounts.Theory;
            TrafficRulesQuestionCount = trafficRulesCounts.Theory;
            DrivingCultureQuestionCount = drivingCultureCounts.Theory;
            DrivingTechniqueQuestionCount = drivingTechniqueCounts.Theory;
            TrafficSignsQuestionCount = groupCounts.TrafficSigns;
            SituationalQuestionCount = groupCounts.Situational;

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
        catch (UnauthorizedAccessException ex)
        {
            Console.WriteLine($"[Practice][Load][Unauthorized] {ex.Message}");
            PracticeSummaryText = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
            await Shell.Current.GoToAsync($"//{nameof(Views.LoginPage)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Practice][Load][Error] {ex.Message}");
            PracticeSummaryText = "Không tải được dữ liệu ôn tập.";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task StartFilteredPracticeAsync(string groupCode, int availableCount, string displayName, string? topicCode = null)
    {
        if (availableCount <= 0)
        {
            await Application.Current?.MainPage?.DisplayAlert("Thông báo", $"Chưa có dữ liệu {displayName.ToLowerInvariant()} từ API.", "OK")!;
            return;
        }

        var session = await _practiceService.StartFilteredPracticeSessionAsync(
            groupCode,
            availableCount,
            topicCode,
            note: $"Phiên ôn tập {displayName.ToLowerInvariant()} từ danh sách câu hỏi API");

        await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={session.Id}");
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
            topic.QuestionCount,
            $"Phiên ôn tập chủ đề {topic.Name}");

        await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={session.Id}");
    }
}
