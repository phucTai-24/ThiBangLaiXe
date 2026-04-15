using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class ExamResultPage : ContentPage
{
    public ExamResultPage(ExamResultViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
