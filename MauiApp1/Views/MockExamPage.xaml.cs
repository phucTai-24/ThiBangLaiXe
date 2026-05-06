using MauiApp1.ViewModels;
using MauiApp1.Models;

namespace MauiApp1.Views;

public partial class MockExamPage : ContentPage
{
    public MockExamPage(MockExamViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }

    private async void OnBackTapped(object sender, EventArgs e)
    {
        var confirm = await DisplayAlert(
            "Thoát bài thi",
            "Bạn có chắc muốn rời khỏi bài thi thử và quay lại danh sách đề không? Bài làm hiện tại vẫn được lưu theo các đáp án đã chọn.",
            "Xác nhận",
            "Tiếp tục thi");

        if (!confirm)
        {
            return;
        }

        await Shell.Current.GoToAsync(nameof(ExamListPage));
    }

    private async void OnHomeTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(DashboardPage));
    }

    private async void OnPracticeTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync(nameof(TrafficSignsPage));
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

        var question = image.BindingContext is Question boundQuestion
            ? boundQuestion
            : (BindingContext as MockExamViewModel)?.CurrentQuestion;

        if (question == null)
        {
            return;
        }

        if (image.Handler?.PlatformView is null)
        {
            question.ImageLoadFailed = true;
            Console.WriteLine($"[MockExam][Image][Failed] questionId={question.Id} url={question.ImageUrl}");
            return;
        }

        question.ImageLoadFailed = false;
    }
}
