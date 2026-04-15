using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models;

public class PracticeAnswerOption : INotifyPropertyChanged
{
    private bool _isSelected;
    private bool _isRevealed;

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public bool IsCorrectAnswer { get; set; }

    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (_isSelected == value)
            {
                return;
            }

            _isSelected = value;
            OnPropertyChanged();
        }
    }

    public bool IsRevealed
    {
        get => _isRevealed;
        set
        {
            if (_isRevealed == value)
            {
                return;
            }

            _isRevealed = value;
            OnPropertyChanged();
        }
    }

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
