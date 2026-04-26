using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

[QueryProperty(nameof(ExamId), "examId")]
public sealed class WrongAnswersViewModel : BaseViewModel
{
    private readonly IExamService _examService;
    private string _examId = string.Empty;
    private string _pageTitle = "Xem bài làm";
    private string _summaryText = "Đang tải bài làm...";
    private bool _isLoading;
    private Question? _currentQuestion;
    private int _currentQuestionIndex = -1;
    private Question? _selectedQuestion;
    private bool _isPopupOpen;

    public WrongAnswersViewModel(IExamService examService)
    {
        _examService = examService;
        GoBackCommand = new Command(async () => await Shell.Current.GoToAsync(".."));
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        RetakeExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.ExamListPage)));
        PreviousQuestionCommand = new Command(OnPreviousQuestion, CanGoPrevious);
        NextQuestionCommand = new Command(OnNextQuestion, CanGoNext);
        SelectQuestionCommand = new Command<int>(OnSelectQuestion);
        OpenQuestionPopupCommand = new Command<Question>(OnOpenQuestionPopup);
        ClosePopupCommand = new Command(OnClosePopup);
    }

    public ObservableCollection<Question> Questions { get; } = new();

    public string ExamId
    {
        get => _examId;
        set
        {
            if (SetProperty(ref _examId, value) && !string.IsNullOrWhiteSpace(value))
                _ = LoadAsync();
        }
    }

    public string PageTitle
    {
        get => _pageTitle;
        set => SetProperty(ref _pageTitle, value);
    }

    public string SummaryText
    {
        get => _summaryText;
        set => SetProperty(ref _summaryText, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public Question? CurrentQuestion
    {
        get => _currentQuestion;
        set
        {
            if (SetProperty(ref _currentQuestion, value))
            {
                OnPropertyChanged(nameof(CurrentQuestionText));
            }
        }
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

    public string CurrentQuestionText => CurrentQuestion is null
        ? "CÂU 00/00"
        : $"CÂU {CurrentQuestion.Number:D2}/{Questions.Count:D2}";

    public Question? SelectedQuestion
    {
        get => _selectedQuestion;
        set => SetProperty(ref _selectedQuestion, value);
    }

    public bool IsPopupOpen
    {
        get => _isPopupOpen;
        set => SetProperty(ref _isPopupOpen, value);
    }

    public ICommand GoBackCommand { get; }
    public ICommand GoHomeCommand { get; }
    public ICommand RetakeExamCommand { get; }
    public ICommand PreviousQuestionCommand { get; }
    public ICommand NextQuestionCommand { get; }
    public ICommand SelectQuestionCommand { get; }
    public ICommand OpenQuestionPopupCommand { get; }
    public ICommand ClosePopupCommand { get; }

    private async Task LoadAsync()
    {
        if (string.IsNullOrWhiteSpace(ExamId))
            return;

        IsLoading = true;

        try
        {
            var exam = await _examService.GetExamByIdAsync(ExamId);

            var wrongQuestions = exam.Questions
                .Where(x => !string.IsNullOrWhiteSpace(x.SelectedAnswerId)
                    && x.Answers.Any(a => a.Id == x.SelectedAnswerId && !a.IsCorrect))
                .OrderBy(x => x.Number)
                .ToList();

            Questions.Clear();
            foreach (var question in wrongQuestions)
                Questions.Add(question);

            CurrentQuestionIndex = Questions.Count > 0 ? 0 : -1;

            PageTitle = string.IsNullOrWhiteSpace(exam.Title) ? "Xem bài làm" : exam.Title;
            SummaryText = Questions.Count == 0
                ? "Bạn không có câu nào làm sai trong bài thi này"
                : $"Có {Questions.Count} câu làm sai • bấm từng câu để xem đáp án đã chọn và đáp án đúng";
        }
        catch (Exception ex)
        {
            SummaryText = $"Không tải được bài làm: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void UpdateCurrentQuestion()
    {
        if (CurrentQuestionIndex >= 0 && CurrentQuestionIndex < Questions.Count)
        {
            CurrentQuestion = Questions[CurrentQuestionIndex];
            return;
        }

        CurrentQuestion = null;
    }

    private bool CanGoPrevious() => CurrentQuestionIndex > 0;

    private bool CanGoNext() => CurrentQuestionIndex >= 0 && CurrentQuestionIndex < Questions.Count - 1;

    private void OnPreviousQuestion()
    {
        if (CanGoPrevious())
            CurrentQuestionIndex--;
    }

    private void OnNextQuestion()
    {
        if (CanGoNext())
            CurrentQuestionIndex++;
    }

    private void OnSelectQuestion(int questionNumber)
    {
        var index = Questions.ToList().FindIndex(x => x.Number == questionNumber);
        if (index >= 0)
            CurrentQuestionIndex = index;
    }

    private void OnOpenQuestionPopup(Question? question)
    {
        if (question is null)
            return;

        SelectedQuestion = question;
        IsPopupOpen = true;
    }

    private void OnClosePopup()
    {
        IsPopupOpen = false;
        SelectedQuestion = null;
    }
}
