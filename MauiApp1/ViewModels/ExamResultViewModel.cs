using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

[QueryProperty(nameof(ExamId), "examId")]
public class ExamResultViewModel : BaseViewModel
{
    private readonly IExamService _examService;
    private Exam? _exam;
    private string _examId = string.Empty;
    private Question? _selectedWrongQuestion;
    private bool _isWrongAnswerPopupOpen;

    public ExamResultViewModel(IExamService examService)
    {
        _examService = examService;
        
        GoHomeCommand = new Command(async () => await OnGoHome());
        ReviewAnswersCommand = new Command(async () => await OnReviewAnswers());
        RetakeExamCommand = new Command(async () => await OnRetakeExam());
        OpenWrongAnswerPopupCommand = new Command<Question>(OnOpenWrongAnswerPopup);
        CloseWrongAnswerPopupCommand = new Command(OnCloseWrongAnswerPopup);
    }

    public string ExamId
    {
        get => _examId;
        set
        {
            if (SetProperty(ref _examId, value))
            {
                _ = LoadExamResultAsync();
            }
        }
    }

    public Exam? Exam
    {
        get => _exam;
        set
        {
            if (SetProperty(ref _exam, value))
            {
                OnPropertyChanged(nameof(Score));
                OnPropertyChanged(nameof(TotalQuestions));
                OnPropertyChanged(nameof(CorrectAnswers));
                OnPropertyChanged(nameof(WrongAnswers));
                OnPropertyChanged(nameof(CriticalErrors));
                OnPropertyChanged(nameof(CriticalErrorMessage));
                OnPropertyChanged(nameof(IsPassed));
                OnPropertyChanged(nameof(PassStatusText));
                OnPropertyChanged(nameof(PassStatusColor));
                OnPropertyChanged(nameof(PassTextColor));
                OnPropertyChanged(nameof(ResultMessage));
                OnPropertyChanged(nameof(ProgressPercentage));
                OnPropertyChanged(nameof(WrongQuestions));
            }
        }
    }

    public int Score => Exam?.CorrectAnswers ?? 0;
    public int TotalQuestions => Exam?.TotalQuestions ?? 0;
    public int CorrectAnswers => Exam?.CorrectAnswers ?? 0;
    public int WrongAnswers => Exam?.WrongAnswers ?? 0;
    
    public int CriticalErrors => Exam?.Questions.Count(q => 
        q.IsCritical && 
        !string.IsNullOrEmpty(q.SelectedAnswerId) && 
        q.Answers.Any(a => a.Id == q.SelectedAnswerId && !a.IsCorrect)) ?? 0;
    
    public bool IsPassed => Exam?.IsPassed ?? false;
    
    public string PassStatusText => IsPassed ? "ĐẠT (PASS)" : "KHÔNG ĐẠT (FAIL)";
    
    public Color PassStatusColor => IsPassed ? Color.FromArgb("#D4E3FF") : Color.FromArgb("#FFF1EF");
    
    public Color PassTextColor => IsPassed ? Color.FromArgb("#005295") : Color.FromArgb("#BA1A1A");
    
    public string ResultMessage => IsPassed
        ? $"Bạn đã vượt qua bài thi sát hạch lý thuyết {Exam?.LicenseType}"
        : $"Bạn chưa đạt yêu cầu. Hãy ôn tập và thử lại!";
    
    public string CriticalErrorMessage => CriticalErrors == 0
        ? "Bạn không sai câu điểm liệt nào"
        : $"Bạn đã sai {CriticalErrors} câu điểm liệt";
    
    public double ProgressPercentage => TotalQuestions > 0 ? (double)CorrectAnswers / TotalQuestions : 0;

    public ObservableCollection<Question> WrongQuestions => new ObservableCollection<Question>(
        Exam?.Questions.Where(q => 
            !string.IsNullOrEmpty(q.SelectedAnswerId) && 
            q.Answers.Any(a => a.Id == q.SelectedAnswerId && !a.IsCorrect)) ?? 
        Enumerable.Empty<Question>());

    public Question? SelectedWrongQuestion
    {
        get => _selectedWrongQuestion;
        set => SetProperty(ref _selectedWrongQuestion, value);
    }

    public bool IsWrongAnswerPopupOpen
    {
        get => _isWrongAnswerPopupOpen;
        set => SetProperty(ref _isWrongAnswerPopupOpen, value);
    }

    public ICommand GoHomeCommand { get; }
    public ICommand ReviewAnswersCommand { get; }
    public ICommand RetakeExamCommand { get; }
    public ICommand OpenWrongAnswerPopupCommand { get; }
    public ICommand CloseWrongAnswerPopupCommand { get; }

    private async Task LoadExamResultAsync()
    {
        if (string.IsNullOrEmpty(ExamId)) return;

        try
        {
            Exam = await _examService.GetExamByIdAsync(ExamId);
        }
        catch (Exception ex)
        {
            await Application.Current?.MainPage?.DisplayAlert("Lỗi", $"Không thể tải kết quả: {ex.Message}", "OK")!;
        }
    }

    private async Task OnGoHome()
    {
        await Shell.Current.GoToAsync(nameof(Views.DashboardPage));
    }
 
    private async Task OnReviewAnswers()
    {
        await Shell.Current.GoToAsync($"{nameof(Views.WrongAnswersPage)}?examId={ExamId}");
    }

    private void OnOpenWrongAnswerPopup(Question? question)
    {
        if (question is null)
            return;

        SelectedWrongQuestion = question;
        IsWrongAnswerPopupOpen = true;
    }

    private void OnCloseWrongAnswerPopup()
    {
        IsWrongAnswerPopupOpen = false;
        SelectedWrongQuestion = null;
    }

    private async Task OnRetakeExam()
    {
        await Shell.Current.GoToAsync(nameof(Views.ExamListPage));
    }
}
