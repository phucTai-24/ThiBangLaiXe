using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class PracticeResultPage : ContentPage
{
    public PracticeResultPage(PracticeResultViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
