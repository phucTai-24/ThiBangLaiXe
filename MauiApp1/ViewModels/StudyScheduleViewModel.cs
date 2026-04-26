using System.Collections.ObjectModel;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public sealed class StudyScheduleViewModel : BaseViewModel
{
    private readonly IStudyScheduleService _studyScheduleService;
    private bool _isInitialized;
    private bool _isBusy;
    private string _courseName = string.Empty;
    private string _progressText = string.Empty;
    private string _nextSessionText = string.Empty;
    private string _attendanceText = string.Empty;
    private string _examReminderText = string.Empty;

    public StudyScheduleViewModel(IStudyScheduleService studyScheduleService)
    {
        _studyScheduleService = studyScheduleService;
        UpcomingItems = new ObservableCollection<StudyScheduleItem>();
        LoadCommand = new Command(async () => await LoadAsync(), () => !IsBusy);
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
        GoPracticeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.TrafficSignsPage)));
        GoProfileCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.ProfilePage)));
    }

    public ObservableCollection<StudyScheduleItem> UpcomingItems { get; }

    public ICommand LoadCommand { get; }
    public ICommand GoHomeCommand { get; }
    public ICommand GoMockExamCommand { get; }
    public ICommand GoPracticeCommand { get; }
    public ICommand GoProfileCommand { get; }

    public bool IsBusy
    {
        get => _isBusy;
        set
        {
            if (SetProperty(ref _isBusy, value))
            {
                ((Command)LoadCommand).ChangeCanExecute();
            }
        }
    }

    public string CourseName
    {
        get => _courseName;
        set => SetProperty(ref _courseName, value);
    }

    public string ProgressText
    {
        get => _progressText;
        set => SetProperty(ref _progressText, value);
    }

    public string NextSessionText
    {
        get => _nextSessionText;
        set => SetProperty(ref _nextSessionText, value);
    }

    public string AttendanceText
    {
        get => _attendanceText;
        set => SetProperty(ref _attendanceText, value);
    }

    public string ExamReminderText
    {
        get => _examReminderText;
        set => SetProperty(ref _examReminderText, value);
    }

    public async Task InitializeAsync()
    {
        if (_isInitialized)
        {
            return;
        }

        await LoadAsync();
        _isInitialized = true;
    }

    private async Task LoadAsync()
    {
        if (IsBusy)
        {
            return;
        }

        IsBusy = true;

        try
        {
            var overview = await _studyScheduleService.GetOverviewAsync();
            var items = await _studyScheduleService.GetUpcomingScheduleAsync();

            CourseName = overview.CourseName;
            ProgressText = overview.ProgressText;
            NextSessionText = overview.NextSessionText;
            AttendanceText = overview.AttendanceText;
            ExamReminderText = overview.ExamReminderText;

            UpcomingItems.Clear();
            foreach (var item in items)
            {
                UpcomingItems.Add(item);
            }
        }
        finally
        {
            IsBusy = false;
        }
    }
}
