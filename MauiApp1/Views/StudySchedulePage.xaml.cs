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
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await _viewModel.InitializeAsync();
    }
}
