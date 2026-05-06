using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class CriticalPracticePage : ContentPage
{
    public CriticalPracticePage(CriticalPracticeViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
