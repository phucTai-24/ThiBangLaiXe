using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public class PracticeViewModel : BaseViewModel
{
    private readonly IPracticeService _practiceService;
    private PracticeTopic? _recommendedTopic;
    private PracticeTopic? _trafficSignsTopic;
    private string _practiceSummaryText = "Chưa có dữ liệu ôn tập";
    private string _lastSessionText = "Hãy bắt đầu một phiên ôn tập mới";
    private int _selectedQuestionCount = 20;
    private int _criticalQuestionCount;
    private int _trafficSignsQuestionCount;
    private bool _isLoading;

    public PracticeViewModel(IPracticeService practiceService)
    {
        _practiceService = practiceService;

        Topics = new ObservableCollection<PracticeTopic>();
        PracticeHistory = new ObservableCollection<PracticeHistoryItem>();
        QuestionCountOptions = new ObservableCollection<int> { 10, 15, 20, 25, 30 };

        GoBackCommand = new Command(async () => await Shell.Current.GoToAsync(".."));
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
        StartRecommendedPracticeCommand = new Command(async () => await StartRecommendedPracticeAsync());
        StartTopicPracticeCommand = new Command<PracticeTopic>(async topic => await StartTopicPracticeAsync(topic));
        StartCriticalPracticeCommand = new Command(async () => await StartCriticalPracticeAsync());
        StartTrafficSignsPracticeCommand = new Command(async () => await StartTrafficSignsPracticeAsync());

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

    public int TrafficSignsQuestionCount
    {
        get => _trafficSignsQuestionCount;
        set => SetProperty(ref _trafficSignsQuestionCount, value);
    }

    public ICommand GoBackCommand { get; }
    public ICommand GoHomeCommand { get; }
    public ICommand GoMockExamCommand { get; }
    public ICommand StartRecommendedPracticeCommand { get; }
    public ICommand StartTopicPracticeCommand { get; }
    public ICommand StartCriticalPracticeCommand { get; }
    public ICommand StartTrafficSignsPracticeCommand { get; }

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
            var trafficSignKeywords = new[]
            {
                "biển báo",
                "bien bao",
                "báo hiệu",
                "bao hieu",
                "hệ thống báo hiệu",
                "he thong bao hieu"
            };

            _trafficSignsTopic = topics
                .Where(x => trafficSignKeywords.Any(k =>
                    x.Name.Contains(k, StringComparison.OrdinalIgnoreCase)
                    || x.Description.Contains(k, StringComparison.OrdinalIgnoreCase)))
                .OrderByDescending(x => x.QuestionCount)
                .FirstOrDefault();
            TrafficSignsQuestionCount = _trafficSignsTopic?.QuestionCount ?? 0;

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

    private async Task StartCriticalPracticeAsync()
    {
        if (IsLoading)
        {
            return;
        }

        try
        {
            IsLoading = true;

            var sessionId = await _practiceService.StartCriticalPracticeAsync();
            if (string.IsNullOrWhiteSpace(sessionId))
                throw new InvalidOperationException("SessionId không hợp lệ.");

            await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={sessionId}");
        }
        catch (UnauthorizedAccessException ex)
        {
            Console.WriteLine($"[Practice][Critical][Unauthorized] {ex.Message}");
            await Application.Current?.MainPage?.DisplayAlert("Phiên đăng nhập", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", "OK")!;
            await Shell.Current.GoToAsync($"//{nameof(Views.LoginPage)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Practice][Critical][Start][Error] {ex.Message}");
            await Application.Current?.MainPage?.DisplayAlert("Lỗi", "Không thể bắt đầu phiên ôn tập", "OK")!;
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task StartTrafficSignsPracticeAsync()
    {
        if (_trafficSignsTopic == null)
        {
            await Application.Current?.MainPage?.DisplayAlert("Thông báo", "Chưa có dữ liệu chủ đề biển báo từ API.", "OK")!;
            return;
        }

        await StartTopicPracticeAsync(_trafficSignsTopic);
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
            Math.Min(topic.QuestionCount, SelectedQuestionCount),
            $"Phiên ôn tập chủ đề {topic.Name}");

        await Shell.Current.GoToAsync($"{nameof(Views.PracticeSessionPage)}?sessionId={session.Id}");
    }
}
