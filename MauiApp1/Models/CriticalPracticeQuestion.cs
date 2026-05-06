using System.Collections.ObjectModel;
using MauiApp1.ViewModels;

namespace MauiApp1.Models;

public sealed class CriticalPracticeQuestion : BaseViewModel
{
    private bool _isCorrectlyAnswered;
    private bool _isWronglyAnswered;

    public string Id { get; set; } = string.Empty;
    public int Number { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? ImageUrl { get; set; }
    public ObservableCollection<CriticalPracticeAnswer> Answers { get; set; } = [];

    public bool HasImage => !string.IsNullOrWhiteSpace(ImageUrl);
    public bool IsAnswered => Answers.Any(x => x.IsSelected);

    public bool IsCorrectlyAnswered
    {
        get => _isCorrectlyAnswered;
        set => SetProperty(ref _isCorrectlyAnswered, value);
    }

    public bool IsWronglyAnswered
    {
        get => _isWronglyAnswered;
        set => SetProperty(ref _isWronglyAnswered, value);
    }
}

public sealed class CriticalPracticeAnswer : BaseViewModel
{
    private bool _isSelected;
    private bool _isCorrect;
    private bool _isWrong;

    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsCorrectAnswer { get; set; }

    public bool IsSelected
    {
        get => _isSelected;
        set => SetProperty(ref _isSelected, value);
    }

    public bool IsCorrect
    {
        get => _isCorrect;
        set => SetProperty(ref _isCorrect, value);
    }

    public bool IsWrong
    {
        get => _isWrong;
        set => SetProperty(ref _isWrong, value);
    }
}
