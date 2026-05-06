using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

[QueryProperty(nameof(SampleExamId), "sampleExamId")]
public class MockExamViewModel : BaseViewModel
{
    private readonly IExamService _examService;
    private Exam? _currentExam;
    private Question? _currentQuestion;
    private int _currentQuestionIndex = -1;
    private string _timeRemainingText = "20:00";
    private bool _isLoading;
    private string _sampleExamId = string.Empty;

    public MockExamViewModel(IExamService examService)
    {
        _examService = examService;
        
        PreviousQuestionCommand = new Command(OnPreviousQuestion, () => CanGoPrevious());
        NextQuestionCommand = new Command(OnNextQuestion, () => CanGoNext());
        SelectAnswerCommand = new Command<Answer>(async answer => await OnSelectAnswerAsync(answer));
        SelectQuestionCommand = new Command<int>(OnSelectQuestion);
        SubmitExamCommand = new Command(async () => await OnSubmitExam(), () => CanSubmitExam());
    }

    public string SampleExamId
    {
        get => _sampleExamId;
        set
        {
            if (SetProperty(ref _sampleExamId, value) && !string.IsNullOrWhiteSpace(value))
            {
                _ = LoadExamAsync();
            }
        }
    }

    public Exam? CurrentExam
    {
        get => _currentExam;
        set => SetProperty(ref _currentExam, value);
    }

    public Question? CurrentQuestion
    {
        get => _currentQuestion;
        set => SetProperty(ref _currentQuestion, value);
    }

    public int CurrentQuestionIndex
    {
        get => _currentQuestionIndex;
        set
        {
            if (SetProperty(ref _currentQuestionIndex, value))
            {
                UpdateCurrentQuestion();
                ((Command)PreviousQuestionCommand).ChangeCanExecute();
                ((Command)NextQuestionCommand).ChangeCanExecute();
            }
        }
    }

    public string TimeRemainingText
    {
        get => _timeRemainingText;
        set => SetProperty(ref _timeRemainingText, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string CurrentQuestionText => CurrentQuestion != null 
        ? $"Câu {CurrentQuestion.Number:D2}/{CurrentExam?.TotalQuestions:D2}" 
        : "CÂU 00/00";

    public string AnsweredQuestionsText => CurrentExam != null 
        ? $"Đã trả lời {CurrentExam.AnsweredQuestions}/{CurrentExam.TotalQuestions}" 
        : "ĐÃ TRẢ LỜI: 0/0";

    public ICommand PreviousQuestionCommand { get; }
    public ICommand NextQuestionCommand { get; }
    public ICommand SelectAnswerCommand { get; }
    public ICommand SelectQuestionCommand { get; }
    public ICommand SubmitExamCommand { get; }

    private async Task LoadExamAsync()
    {
        IsLoading = true;
        try
        {
            CurrentExam = await _examService.GetExamAsync(SampleExamId);
            if (CurrentExam != null && CurrentExam.Questions.Any())
            {
                CurrentExam.StartTime ??= DateTime.Now;
                CurrentQuestionIndex = 0;
                StartTimer();
                OnPropertyChanged(nameof(AnsweredQuestionsText));
            }
        }
        catch (UnauthorizedAccessException ex)
        {
            await Application.Current?.MainPage?.DisplayAlert("Phiên đăng nhập", ex.Message, "OK")!;
            await Shell.Current.GoToAsync($"//{nameof(Views.LoginPage)}");
        }
        catch (Exception ex)
        {
            // Log error
            await Application.Current?.MainPage?.DisplayAlert("Lỗi", $"Không thể tải đề thi: {ex.Message}", "OK")!;
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void UpdateCurrentQuestion()
    {
        if (CurrentExam != null && CurrentQuestionIndex >= 0 && CurrentQuestionIndex < CurrentExam.Questions.Count)
        {
            CurrentQuestion = CurrentExam.Questions[CurrentQuestionIndex];
            SyncAnswerSelectionState(CurrentQuestion);
            OnPropertyChanged(nameof(CurrentQuestionText));
        }
    }

    private void SyncAnswerSelectionState(Question question)
    {
        foreach (var answer in question.Answers)
        {
            answer.IsSelected = answer.Id == question.SelectedAnswerId;
        }
    }

    private void StartTimer()
    {
        var timer = Application.Current?.Dispatcher.CreateTimer();
        if (timer == null) return;

        timer.Interval = TimeSpan.FromSeconds(1);
        timer.Tick += (s, e) =>
        {
            if (CurrentExam == null || CurrentExam.IsCompleted)
            {
                timer.Stop();
                return;
            }

            CurrentExam.TimeRemaining--;
            var minutes = CurrentExam.TimeRemaining / 60;
            var seconds = CurrentExam.TimeRemaining % 60;
            TimeRemainingText = $"{minutes:D2}:{seconds:D2}";

            if (CurrentExam.TimeRemaining <= 0)
            {
                timer.Stop();
                _ = OnSubmitExam();
            }
        };
        timer.Start();
    }

    private bool CanGoPrevious() => CurrentQuestionIndex > 0;

    private void OnPreviousQuestion()
    {
        if (CanGoPrevious())
        {
            CurrentQuestionIndex--;
        }
    }

    private bool CanGoNext() => CurrentExam != null && CurrentQuestionIndex < CurrentExam.Questions.Count - 1;

    private void OnNextQuestion()
    {
        if (CanGoNext())
        {
            CurrentQuestionIndex++;
        }
    }

    private async Task OnSelectAnswerAsync(Answer answer)
    {
        if (CurrentQuestion == null || CurrentExam == null) return;

        CurrentQuestion.SelectedAnswerId = answer.Id;
        SyncAnswerSelectionState(CurrentQuestion);

        if (long.TryParse(CurrentExam.SessionId, out var _)
            && long.TryParse(CurrentQuestion.Id, out var questionId)
            && long.TryParse(answer.Id, out var answerId))
        {
            await _examService.SaveAnswerAsync(CurrentExam.SessionId, questionId, answerId);
        }

        OnPropertyChanged(nameof(CurrentQuestion));
        OnPropertyChanged(nameof(AnsweredQuestionsText));
        ((Command)SubmitExamCommand).ChangeCanExecute();
    }

    private void OnSelectQuestion(int questionNumber)
    {
        if (CurrentExam == null) return;

        var index = CurrentExam.Questions.FindIndex(q => q.Number == questionNumber);
        if (index >= 0)
        {
            CurrentQuestionIndex = index;
        }
    }

    private bool CanSubmitExam() => CurrentExam != null && CurrentExam.AnsweredQuestions > 0;

    private async Task OnSubmitExam()
    {
        if (CurrentExam == null) return;

        var unansweredCount = CurrentExam.TotalQuestions - CurrentExam.AnsweredQuestions;
        if (unansweredCount > 0)
        {
            var result = await Application.Current?.MainPage?.DisplayAlert(
                "Xác nhận nộp bài",
                $"Bạn còn {unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài?",
                "Nộp bài",
                "Tiếp tục làm")!;

            if (!result) return;
        }

        CurrentExam.IsCompleted = true;
        CurrentExam.EndTime = DateTime.Now;

        try
        {
            await _examService.SubmitExamAsync(CurrentExam);
        }
        catch (UnauthorizedAccessException ex)
        {
            await Application.Current?.MainPage?.DisplayAlert("Phiên đăng nhập", ex.Message, "OK")!;
            await Shell.Current.GoToAsync($"//{nameof(Views.LoginPage)}");
            return;
        }

        // Navigate to result page
        await Shell.Current.GoToAsync($"{nameof(Views.ExamResultPage)}?examId={CurrentExam.Id}");
    }
}
