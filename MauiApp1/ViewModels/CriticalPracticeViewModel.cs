using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public sealed class CriticalPracticeViewModel : BaseViewModel
{
    private readonly ICriticalPracticeService _criticalPracticeService;
    private CriticalPracticeQuestion? _currentQuestion;
    private int _currentIndex = -1;
    private bool _isLoading;
    private bool _isSubmitted;
    private string _statusText = "Đang tải...";

    public CriticalPracticeViewModel(ICriticalPracticeService criticalPracticeService)
    {
        _criticalPracticeService = criticalPracticeService;
        Questions = [];
        Questions.CollectionChanged += (_, _) => OnPropertyChanged(nameof(ProgressText));

        SelectAnswerCommand = new Command<CriticalPracticeAnswer>(OnSelectAnswer);
        NextCommand = new Command(OnNext, () => CurrentIndex < Questions.Count - 1);
        PreviousCommand = new Command(OnPrevious, () => CurrentIndex > 0);
        SelectQuestionCommand = new Command<CriticalPracticeQuestion>(OnSelectQuestion);
        SubmitCommand = new Command(async () => await OnSubmitAsync(), () => Questions.Count > 0 && !IsSubmitted);
        GoBackCommand = new Command(async () => await OnGoBackAsync());

        _ = LoadAsync();
    }

    public ObservableCollection<CriticalPracticeQuestion> Questions { get; }

    public CriticalPracticeQuestion? CurrentQuestion
    {
        get => _currentQuestion;
        set => SetProperty(ref _currentQuestion, value);
    }

    public int CurrentIndex
    {
        get => _currentIndex;
        set
        {
            if (!SetProperty(ref _currentIndex, value))
            {
                return;
            }

            CurrentQuestion = value >= 0 && value < Questions.Count ? Questions[value] : null;
            OnPropertyChanged(nameof(ProgressText));
            ((Command)NextCommand).ChangeCanExecute();
            ((Command)PreviousCommand).ChangeCanExecute();
        }
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public bool IsSubmitted
    {
        get => _isSubmitted;
        set
        {
            if (!SetProperty(ref _isSubmitted, value))
            {
                return;
            }

            OnPropertyChanged(nameof(ResultSummaryText));
            ((Command)SubmitCommand).ChangeCanExecute();
        }
    }

    public string StatusText
    {
        get => _statusText;
        set => SetProperty(ref _statusText, value);
    }

    public string ProgressText => Questions.Count == 0 ? "0/0" : $"{CurrentIndex + 1}/{Questions.Count}";
    public string ResultSummaryText => !IsSubmitted
        ? ""
        : $"Đúng {Questions.Count(x => x.Answers.Any(a => a.IsSelected && a.IsCorrectAnswer))}/{Questions.Count}";

    public ICommand SelectAnswerCommand { get; }
    public ICommand NextCommand { get; }
    public ICommand PreviousCommand { get; }
    public ICommand SelectQuestionCommand { get; }
    public ICommand SubmitCommand { get; }
    public ICommand GoBackCommand { get; }

    private async Task LoadAsync()
    {
        if (IsLoading)
        {
            return;
        }

        try
        {
            IsLoading = true;
            StatusText = "Đang tải câu điểm liệt từ API...";

            var items = await _criticalPracticeService.GetCriticalQuestionsAsync();
            Questions.Clear();

            Console.WriteLine($"[CriticalPractice][ViewModel] Received {items.Count} critical questions from service.");

            foreach (var item in items)
            {
                Questions.Add(item);
            }

            if (Questions.Count == 0)
            {
                StatusText = "Không có dữ liệu câu điểm liệt.";
                CurrentIndex = -1;
                return;
            }

            StatusText = $"Đã tải toàn bộ {Questions.Count} câu điểm liệt. Chọn đáp án để kiểm tra ngay.";
            IsSubmitted = false;
            CurrentIndex = 0;
            ((Command)SubmitCommand).ChangeCanExecute();
        }
        catch (UnauthorizedAccessException)
        {
            StatusText = "Phiên đăng nhập hết hạn.";
            await Shell.Current.GoToAsync($"//{nameof(Views.LoginPage)}");
        }
        catch (Exception ex)
        {
            StatusText = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void OnSelectAnswer(CriticalPracticeAnswer? answer)
    {
        if (answer == null || CurrentQuestion == null || IsSubmitted)
        {
            return;
        }

        CurrentQuestion.Answers.ToList().ForEach(item =>
        {
            item.IsSelected = item.Id == answer.Id;
            item.IsCorrect = false;
            item.IsWrong = false;
        });

        StatusText = $"Đã chọn đáp án cho câu {CurrentQuestion.Number}.";
        OnPropertyChanged(nameof(ResultSummaryText));
    }

    private void OnNext()
    {
        if (CurrentIndex < Questions.Count - 1)
        {
            CurrentIndex++;
        }
    }

    private void OnPrevious()
    {
        if (CurrentIndex > 0)
        {
            CurrentIndex--;
        }
    }

    private void OnSelectQuestion(CriticalPracticeQuestion? question)
    {
        if (question == null)
        {
            return;
        }

        var index = Questions.IndexOf(question);
        if (index >= 0)
        {
            CurrentIndex = index;
        }
    }

    private async Task OnSubmitAsync()
    {
        var unanswered = Questions.Count(x => !x.Answers.Any(a => a.IsSelected));
        if (unanswered > 0)
        {
            var confirm = await Application.Current?.MainPage?.DisplayAlert(
                "Xác nhận nộp bài",
                $"Bạn còn {unanswered} câu chưa trả lời. Vẫn nộp bài?",
                "Nộp bài",
                "Tiếp tục làm")!;

            if (!confirm)
            {
                return;
            }
        }

        IsSubmitted = true;

        foreach (var question in Questions)
        {
            var selected = question.Answers.FirstOrDefault(a => a.IsSelected);
            question.IsCorrectlyAnswered = selected?.IsCorrectAnswer == true;
            question.IsWronglyAnswered = selected != null && !selected.IsCorrectAnswer;
            foreach (var answer in question.Answers)
            {
                answer.IsCorrect = answer.IsCorrectAnswer;
                answer.IsWrong = selected != null && answer.Id == selected.Id && !answer.IsCorrectAnswer;
            }
        }

        StatusText = "Đã nộp bài. Chạm vào số câu để xem lại chi tiết đúng/sai.";
        OnPropertyChanged(nameof(ResultSummaryText));
    }

    private async Task OnGoBackAsync()
    {
        if (IsSubmitted)
        {
            await Shell.Current.GoToAsync(nameof(Views.TrafficSignsPage));
            return;
        }

        var page = Shell.Current?.CurrentPage;
        if (page == null)
        {
            await Shell.Current.GoToAsync(nameof(Views.TrafficSignsPage));
            return;
        }

        var confirm = await page.DisplayAlert(
            "Kết thúc ôn tập",
            "Bạn có chắc muốn kết thúc phần ôn điểm liệt và quay lại màn hình ôn tập không?",
            "Xác nhận",
            "Tiếp tục ôn");

        if (!confirm)
        {
            return;
        }

        await Shell.Current.GoToAsync(nameof(Views.TrafficSignsPage));
    }
}
