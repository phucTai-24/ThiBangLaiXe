using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class WrongAnswersPage : ContentPage
{
    public WrongAnswersPage(WrongAnswersViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
