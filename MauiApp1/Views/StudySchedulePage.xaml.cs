using MauiApp1.Models;
using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class StudySchedulePage : ContentPage
{
    private readonly StudyScheduleViewModel _viewModel;

    public StudySchedulePage(StudyScheduleViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        BindingContext = viewModel;
        _ = _viewModel.PreloadAsync();
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await _viewModel.InitializeAsync();
    }

    private async void OnScheduleDetailTapped(object sender, TappedEventArgs e)
    {
        if (sender is not BindableObject bindable || bindable.BindingContext is not StudyScheduleItem item)
            return;

        var detail = string.Join(Environment.NewLine + Environment.NewLine,
            item.CourseName,
            $"Ngày học: {item.WeekdayText} - {item.DateText}",
            $"Thời gian: {item.TimeRange}",
            $"Địa điểm: {item.Location}",
            $"Giảng viên: {item.InstructorName}",
            $"Trạng thái: {item.Status}",
            $"Nội dung: {item.Description}");

        await DisplayAlert(item.SessionTitle, detail, "Đóng");
    }
}
