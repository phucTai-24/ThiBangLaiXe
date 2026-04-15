using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class TrafficSignsPage : ContentPage
{
    public TrafficSignsPage(PracticeViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
