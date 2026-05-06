using MauiApp1.ViewModels;
using MauiApp1.Models;

namespace MauiApp1.Views;

public partial class PracticeSessionPage : ContentPage
{
    public PracticeSessionPage(PracticeSessionViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }

    private void OnQuestionImageHandlerChanged(object? sender, EventArgs e)
    {
        if (sender is not Image image)
        {
            return;
        }

        image.Loaded -= OnQuestionImageLoaded;
        image.Loaded += OnQuestionImageLoaded;
    }

    private void OnQuestionImageLoaded(object? sender, EventArgs e)
    {
        if (sender is not Image image)
        {
            return;
        }

        var question = image.BindingContext is PracticeQuestionItem boundQuestion
            ? boundQuestion
            : (BindingContext as PracticeSessionViewModel)?.CurrentQuestion;

        if (question == null)
        {
            return;
        }

        if (image.Handler?.PlatformView is null)
        {
            question.ImageLoadFailed = true;
            Console.WriteLine($"[Practice][Image][Failed] questionId={question.Id} url={question.ImageUrl}");
            return;
        }

        question.ImageLoadFailed = false;
    }
}
