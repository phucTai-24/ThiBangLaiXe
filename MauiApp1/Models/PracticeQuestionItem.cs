using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models;

public class PracticeQuestionItem : INotifyPropertyChanged
{
    private string? _selectedAnswerId;
    private bool _isAnswered;
    private bool _isCorrectlyAnswered;
    private bool _isCurrent;
    private string? _imageUrl;
    private bool _imageLoadFailed;
    private string _explanation = string.Empty;

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; set; } = string.Empty;
    public int Number { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsCritical { get; set; }
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
            OnPropertyChanged(nameof(QuestionImageSource));
            OnPropertyChanged(nameof(HasImage));
            OnPropertyChanged(nameof(IsImageFormatUnsupported));
            OnPropertyChanged(nameof(HasDisplayImage));
            OnPropertyChanged(nameof(ShowImagePlaceholder));
        }
    }

    public bool HasImage => !string.IsNullOrWhiteSpace(ImageUrl);
    public bool IsImageFormatUnsupported => HasImage && IsUnsupportedImageExtension(ImageUrl);
    public bool HasDisplayImage => HasImage && !ImageLoadFailed && !IsImageFormatUnsupported;
    public bool ShowImagePlaceholder => HasImage && (ImageLoadFailed || IsImageFormatUnsupported);
    public ImageSource? QuestionImageSource
    {
        get
        {
            if (!HasDisplayImage)
            {
                return null;
            }

            return Uri.TryCreate(ImageUrl, UriKind.Absolute, out var uri)
                ? ImageSource.FromUri(uri)
                : null;
        }
    }

    private static bool IsUnsupportedImageExtension(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)
            || imageUrl.StartsWith("data:image", StringComparison.OrdinalIgnoreCase)
            || !Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var extension = Path.GetExtension(uri.AbsolutePath)?.ToLowerInvariant();
        return extension is ".svg";
    }

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
            OnPropertyChanged(nameof(QuestionImageSource));
            OnPropertyChanged(nameof(HasDisplayImage));
            OnPropertyChanged(nameof(ShowImagePlaceholder));
        }
    }

    public string Explanation
    {
        get => _explanation;
        set
        {
            if (_explanation == value)
            {
                return;
            }

            _explanation = value ?? string.Empty;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasExplanation));
            OnPropertyChanged(nameof(ShowExplanation));
        }
    }

    public bool HasExplanation => !string.IsNullOrWhiteSpace(Explanation);
    public bool ShowExplanation => IsAnswered && HasExplanation;
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
            OnPropertyChanged(nameof(ShowExplanation));
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
