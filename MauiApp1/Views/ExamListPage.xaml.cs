using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class ExamListPage : ContentPage
{
    private readonly ExamListViewModel _viewModel;

    public ExamListPage(ExamListViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = _viewModel = viewModel;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await _viewModel.LoadAsync();
    }
}
