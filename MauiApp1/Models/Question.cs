using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models;

public class Question : INotifyPropertyChanged
{
    private string? _selectedAnswerId;
    private string? _imageUrl;
    private bool _imageLoadFailed;

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; set; } = string.Empty;
    public int Number { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? ImageUrl
    {
        get => _imageUrl;
        set
        {
            var normalized = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
            if (_imageUrl == normalized)
            {
                return;
            }

            _imageUrl = normalized;
            _imageLoadFailed = false;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasImage));
            OnPropertyChanged(nameof(HasDisplayImage));
            OnPropertyChanged(nameof(ShowImagePlaceholder));
            OnPropertyChanged(nameof(QuestionImageSource));
        }
    }

    public bool HasImage => !string.IsNullOrWhiteSpace(ImageUrl);
    public bool HasDisplayImage => HasImage && !ImageLoadFailed;
    public bool ShowImagePlaceholder => HasImage && ImageLoadFailed;
    public ImageSource? QuestionImageSource => HasDisplayImage && Uri.TryCreate(ImageUrl, UriKind.Absolute, out var uri)
        ? ImageSource.FromUri(uri)
        : null;

    public bool ImageLoadFailed
    {
        get => _imageLoadFailed;
        set
        {
            if (_imageLoadFailed == value)
            {
                return;
            }

            _imageLoadFailed = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasDisplayImage));
            OnPropertyChanged(nameof(ShowImagePlaceholder));
            OnPropertyChanged(nameof(QuestionImageSource));
        }
    }

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
