using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class PracticeSessionPage : ContentPage
{
    public PracticeSessionPage(PracticeSessionViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
