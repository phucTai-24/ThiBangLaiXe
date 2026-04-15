using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models;

public class Question : INotifyPropertyChanged
{
    private string? _selectedAnswerId;

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; set; } = string.Empty;
    public int Number { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public List<Answer> Answers { get; set; } = new();

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
            OnPropertyChanged(nameof(IsAnswered));
        }
    }

    public bool IsCritical { get; set; } // Câu điểm liệt
    public string Category { get; set; } = string.Empty; // Biển báo, Sa hình, Kỹ thuật lái xe, etc.
    public bool IsAnswered => !string.IsNullOrEmpty(SelectedAnswerId);
    
    // Helper property to get correct answer text
    public string CorrectAnswerText => Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "N/A";

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
