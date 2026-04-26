using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using System.Windows.Input;
using MauiApp1.Models.Exams;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public sealed class ExamListViewModel : BaseViewModel
{
    private readonly IExamService _examService;
    private readonly List<SampleExamItem> _allExams = new();
    private bool _isLoading;
    private string _headerText = "Đang tải danh sách đề thi...";
    private string _selectedLicenseType = "Tất cả";

    public ExamListViewModel(IExamService examService)
    {
        _examService = examService;
        LoadCommand = new Command(async () => await LoadAsync());
        StartExamCommand = new Command<SampleExamItem>(async item => await StartExamAsync(item));
    }

    public ObservableCollection<SampleExamItem> Exams { get; } = new();
    public ObservableCollection<string> LicenseTypes { get; } = new();

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string HeaderText
    {
        get => _headerText;
        set => SetProperty(ref _headerText, value);
    }

    public string SelectedLicenseType
    {
        get => _selectedLicenseType;
        set
        {
            if (SetProperty(ref _selectedLicenseType, value))
                ApplyFilter();
        }
    }

    public ICommand LoadCommand { get; }
    public ICommand StartExamCommand { get; }

    public async Task LoadAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;

        try
        {
            var exams = await _examService.GetSampleExamsAsync();

            _allExams.Clear();
            _allExams.AddRange(exams);

            BuildLicenseTypes();
            if (!LicenseTypes.Contains(SelectedLicenseType))
                SelectedLicenseType = "Tất cả";

            ApplyFilter();
        }
        catch (Exception ex)
        {
            HeaderText = $"Không tải được danh sách đề thi: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private static async Task StartExamAsync(SampleExamItem? item)
    {
        if (item is null)
            return;

        await Shell.Current.GoToAsync($"{nameof(Views.MockExamPage)}?sampleExamId={item.Id}");
    }

    private void BuildLicenseTypes()
    {
        var found = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var exam in _allExams)
        {
            var name = exam.Name?.ToUpperInvariant() ?? string.Empty;

            if (name.Contains("A1")) found.Add("A1");
            if (name.Contains("A2")) found.Add("A2");
            if (name.Contains("B1")) found.Add("B1");
            if (name.Contains("B2")) found.Add("B2");
            if (Regex.IsMatch(name, @"\bC\b")) found.Add("C");
            if (name.Contains("A1/A") || Regex.IsMatch(name, @"\bA\b")) found.Add("A");
        }

        var order = new[] { "Tất cả", "A", "A1", "A2", "B1", "B2", "C" };

        LicenseTypes.Clear();
        LicenseTypes.Add("Tất cả");

        foreach (var type in order.Where(x => x != "Tất cả" && found.Contains(x)))
            LicenseTypes.Add(type);
    }

    private void ApplyFilter()
    {
        var filtered = _allExams
            .Where(x => MatchLicenseType(x, SelectedLicenseType))
            .ToList();

        Exams.Clear();
        foreach (var exam in filtered)
            Exams.Add(exam);

        HeaderText = Exams.Count == 0
            ? $"Không có bộ đề thi thử cho loại {SelectedLicenseType}."
            : SelectedLicenseType == "Tất cả"
                ? $"Hiện có {Exams.Count} bộ đề thi thử từ API"
                : $"Hiện có {Exams.Count} bộ đề loại {SelectedLicenseType}";
    }

    private static bool MatchLicenseType(SampleExamItem item, string selectedType)
    {
        if (string.IsNullOrWhiteSpace(selectedType) || selectedType == "Tất cả")
            return true;

        var name = item.Name?.ToUpperInvariant() ?? string.Empty;

        return selectedType switch
        {
            "A1" => name.Contains("A1"),
            "A2" => name.Contains("A2"),
            "B1" => name.Contains("B1"),
            "B2" => name.Contains("B2"),
            "C" => Regex.IsMatch(name, @"\bC\b"),
            "A" => name.Contains("A1/A") || Regex.IsMatch(name, @"\bA\b"),
            _ => true
        };
    }
}
