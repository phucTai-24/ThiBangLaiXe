using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

[QueryProperty(nameof(SessionId), "sessionId")]
public class PracticeSessionViewModel : BaseViewModel
{
    private readonly IPracticeService _practiceService;
    private string _sessionId = string.Empty;
    private PracticeSession? _currentSession;
    private PracticeQuestionItem? _currentQuestion;
    private int _currentQuestionIndex = -1;

    public PracticeSessionViewModel(IPracticeService practiceService)
    {
        _practiceService = practiceService;
        Questions = new ObservableCollection<PracticeQuestionItem>();

        PreviousQuestionCommand = new Command(OnPreviousQuestion, () => CurrentQuestionIndex > 0);
        NextQuestionCommand = new Command(OnNextQuestion, () => CurrentSession != null && CurrentQuestionIndex < Questions.Count - 1);
        SelectAnswerCommand = new Command<PracticeAnswerOption>(async answer => await OnSelectAnswerAsync(answer));
        SelectQuestionCommand = new Command<int>(OnSelectQuestion);
        SubmitPracticeCommand = new Command(async () => await OnSubmitPracticeAsync(), () => CurrentSession != null);
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoPracticeHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.TrafficSignsPage)));
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
    }

    public ObservableCollection<PracticeQuestionItem> Questions { get; }

    public string SessionId
    {
        get => _sessionId;
        set
        {
            if (SetProperty(ref _sessionId, value) && !string.IsNullOrWhiteSpace(value))
            {
                _ = LoadSessionAsync();
            }
        }
    }

    public PracticeSession? CurrentSession
    {
        get => _currentSession;
        set => SetProperty(ref _currentSession, value);
    }

    public PracticeQuestionItem? CurrentQuestion
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

    public string CurrentQuestionText => CurrentQuestion != null
        ? $"CÂU {CurrentQuestion.Number:D2}/{CurrentSession?.TotalQuestions:D2}"
        : "CÂU 00/00";

    public string AnsweredQuestionsText => CurrentSession == null
        ? "ĐÃ TRẢ LỜI: 0/0"
        : $"ĐÃ TRẢ LỜI: {Questions.Count(x => x.IsAnswered)}/{CurrentSession.TotalQuestions}";

    public string CorrectQuestionsText => CurrentSession == null
        ? "ĐÚNG: 0"
        : $"ĐÚNG: {Questions.Count(x => x.IsCorrectlyAnswered)}";

    public ICommand PreviousQuestionCommand { get; }
    public ICommand NextQuestionCommand { get; }
    public ICommand SelectAnswerCommand { get; }
    public ICommand SelectQuestionCommand { get; }
    public ICommand SubmitPracticeCommand { get; }
    public ICommand GoHomeCommand { get; }
    public ICommand GoPracticeHomeCommand { get; }
    public ICommand GoMockExamCommand { get; }

    private async Task LoadSessionAsync()
    {
        CurrentSession = await _practiceService.GetPracticeSessionAsync(SessionId);

        Questions.Clear();
        foreach (var question in CurrentSession.Questions)
        {
            Questions.Add(question);
        }

        CurrentQuestionIndex = Questions.Count > 0 ? 0 : -1;
        ((Command)SubmitPracticeCommand).ChangeCanExecute();
        OnPropertyChanged(nameof(AnsweredQuestionsText));
        OnPropertyChanged(nameof(CorrectQuestionsText));
    }

    private void UpdateCurrentQuestion()
    {
        foreach (var question in Questions)
        {
            question.IsCurrent = false;
        }

        if (CurrentQuestionIndex >= 0 && CurrentQuestionIndex < Questions.Count)
        {
            CurrentQuestion = Questions[CurrentQuestionIndex];
            CurrentQuestion.IsCurrent = true;
            OnPropertyChanged(nameof(CurrentQuestionText));
        }
    }

    private void OnPreviousQuestion()
    {
        if (CurrentQuestionIndex > 0)
        {
            CurrentQuestionIndex--;
        }
    }

    private void OnNextQuestion()
    {
        if (CurrentQuestionIndex < Questions.Count - 1)
        {
            CurrentQuestionIndex++;
        }
    }

    private async Task OnSelectAnswerAsync(PracticeAnswerOption? answer)
    {
        if (answer == null || CurrentQuestion == null || CurrentQuestion.IsAnswered || CurrentSession == null)
        {
            return;
        }

        await _practiceService.SubmitAnswerAsync(CurrentSession.Id, CurrentQuestion.Id, answer.Id);
        OnPropertyChanged(nameof(AnsweredQuestionsText));
        OnPropertyChanged(nameof(CorrectQuestionsText));
    }

    private void OnSelectQuestion(int questionNumber)
    {
        var index = Questions.ToList().FindIndex(x => x.Number == questionNumber);
        if (index >= 0)
        {
            CurrentQuestionIndex = index;
        }
    }

    private async Task OnSubmitPracticeAsync()
    {
        if (CurrentSession == null)
        {
            return;
        }

        await _practiceService.SubmitPracticeSessionAsync(CurrentSession.Id);
        await Shell.Current.GoToAsync($"{nameof(Views.PracticeResultPage)}?sessionId={CurrentSession.Id}");
    }
}
