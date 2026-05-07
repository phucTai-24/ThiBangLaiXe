using System.Collections.ObjectModel;
using System.Globalization;
using System.Windows.Input;
using MauiApp1.Models;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public sealed class StudyScheduleViewModel : BaseViewModel
{
    private readonly IStudyScheduleService _studyScheduleService;
    private bool _isInitialized;
    private bool _isBusy;
    private string _courseName = "Đang tải lịch học...";
    private string _progressText = "Vui lòng chờ trong giây lát.";
    private string _nextSessionText = "Đang kết nối API lịch học.";
    private string _attendanceText = "--";
    private string _examReminderText = "--";
    private string _weekRangeText = string.Empty;
    private DateTime _selectedWeekStart = GetWeekStart(DateTime.Today);
    private List<StudyScheduleItem> _allItems = new();

    public StudyScheduleViewModel(IStudyScheduleService studyScheduleService)
    {
        _studyScheduleService = studyScheduleService;
        UpcomingItems = new ObservableCollection<StudyScheduleItem>();
        LoadCommand = new Command(async () => await LoadAsync(), () => !IsBusy);
        PreviousWeekCommand = new Command(() => MoveWeek(-1));
        NextWeekCommand = new Command(() => MoveWeek(1));
        CurrentWeekCommand = new Command(() => SetWeek(GetWeekStart(DateTime.Today)));
        GoHomeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.DashboardPage)));
        GoMockExamCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.MockExamPage)));
        GoPracticeCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.TrafficSignsPage)));
        GoProfileCommand = new Command(async () => await Shell.Current.GoToAsync(nameof(Views.ProfilePage)));
    }

    public ObservableCollection<StudyScheduleItem> UpcomingItems { get; }

    public ICommand LoadCommand { get; }
    public ICommand PreviousWeekCommand { get; }
    public ICommand NextWeekCommand { get; }
    public ICommand CurrentWeekCommand { get; }
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

    public string WeekRangeText
    {
        get => _weekRangeText;
        set => SetProperty(ref _weekRangeText, value);
    }

    public Task PreloadAsync() => InitializeAsync();

    public async Task InitializeAsync()
    {
        if (_isInitialized)
        {
            return;
        }

        await LoadAsync();
        _isInitialized = true;
    }

    public Task RefreshAsync()
    {
        _isInitialized = false;
        return InitializeAsync();
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

            _allItems = items;
            SetWeek(_selectedWeekStart);
        }
        catch (Exception ex)
        {
            CourseName = "Không tải được lịch học";
            ProgressText = "API lịch học đang lỗi hoặc tài khoản chưa có quyền truy cập.";
            NextSessionText = ex.Message;
            AttendanceText = "Không có dữ liệu";
            ExamReminderText = "Vui lòng kiểm tra backend /api/v1/admin/schedules.";
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void MoveWeek(int offset)
    {
        SetWeek(_selectedWeekStart.AddDays(offset * 7));
    }

    private void SetWeek(DateTime weekStart)
    {
        _selectedWeekStart = weekStart.Date;
        var weekEnd = _selectedWeekStart.AddDays(6);
        WeekRangeText = $"{_selectedWeekStart:dd/MM} - {weekEnd:dd/MM/yyyy}";

        var weekItems = _allItems
            .Where(item => TryParseDate(item.DateText, out var date) && date >= _selectedWeekStart && date <= weekEnd)
            .OrderBy(item => TryParseDate(item.DateText, out var date) ? date : DateTime.MaxValue)
            .ThenBy(item => item.TimeRange)
            .ToList();

        UpcomingItems.Clear();
        foreach (var item in weekItems)
        {
            UpcomingItems.Add(item);
        }

        if (UpcomingItems.Count == 0)
        {
            UpcomingItems.Add(CreateEmptyWeekItem());
        }
    }

    private StudyScheduleItem CreateEmptyWeekItem()
    {
        return new StudyScheduleItem
        {
            Id = $"empty-week-{_selectedWeekStart:yyyyMMdd}",
            DayBadgeText = "Trống",
            DayBadgeColor = "#5C5C5C",
            DayBadgeBackground = "#ECECEC",
            DateText = _selectedWeekStart.ToString("dd/MM/yyyy"),
            WeekdayText = "Tuần này chưa có lịch học",
            TimeRange = "--:--",
            Location = "Chọn mũi tên để xem tuần khác",
            InstructorName = "",
            CourseName = "Không có buổi học trong tuần đang chọn",
            SessionTitle = "Chưa có lịch trong tuần này",
            Description = "",
            Status = "Trống",
            StatusColor = "#5C5C5C",
            StatusBackground = "#ECECEC",
            AccentEmoji = "📭",
            CardBackground = "#FFFFFF",
            CardStroke = "#14D5C4AB"
        };
    }

    private static DateTime GetWeekStart(DateTime date)
    {
        var diff = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        return date.Date.AddDays(-diff);
    }

    private static bool TryParseDate(string value, out DateTime date)
    {
        return DateTime.TryParseExact(value, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }
}
