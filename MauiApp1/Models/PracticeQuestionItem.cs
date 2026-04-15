using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models;

public class PracticeQuestionItem : INotifyPropertyChanged
{
    private string? _selectedAnswerId;
    private bool _isAnswered;
    private bool _isCorrectlyAnswered;
    private bool _isCurrent;

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; set; } = string.Empty;
    public int Number { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsCritical { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public List<PracticeAnswerOption> Answers { get; set; } = new();

    public string? SelectedAnswerId
    {
        get => _selectedAnswerId;
        set
        {
            if (_selectedAnswerId == value)
            {
                return;
            }

            _selectedAnswerId = value;
            OnPropertyChanged();
        }
    }

    public bool IsAnswered
    {
        get => _isAnswered;
        set
        {
            if (_isAnswered == value)
            {
                return;
            }

            _isAnswered = value;
            OnPropertyChanged();
        }
    }

    public bool IsCorrectlyAnswered
    {
        get => _isCorrectlyAnswered;
        set
        {
            if (_isCorrectlyAnswered == value)
            {
                return;
            }

            _isCorrectlyAnswered = value;
            OnPropertyChanged();
        }
    }

    public bool IsCurrent
    {
        get => _isCurrent;
        set
        {
            if (_isCurrent == value)
            {
                return;
            }

            _isCurrent = value;
            OnPropertyChanged();
        }
    }

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
