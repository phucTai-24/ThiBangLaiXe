namespace MauiApp1.Views;

public partial class PaymentResultPage : ContentPage
{
    private bool _isNavigatingBack;

    public PaymentResultPage(string statusTitle, decimal amount, string courseName, string className, string detail)
    {
        InitializeComponent();

        BindingContext = new
        {
            StatusTitle = statusTitle,
            AmountText = $"{amount:N0}đ",
            CourseText = $"Khóa học: {courseName}",
            ClassText = $"Lớp học: {className}",
            DetailText = detail
        };
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await BackToCourseRegistrationAsync();
    }

    protected override bool OnBackButtonPressed()
    {
        _ = BackToCourseRegistrationAsync();
        return true;
    }

    private async Task BackToCourseRegistrationAsync()
    {
        if (_isNavigatingBack)
            return;

        _isNavigatingBack = true;

        try
        {
            var navigation = Shell.Current?.Navigation ?? Navigation;
            var previousPage = navigation.NavigationStack.Count >= 2
                ? navigation.NavigationStack[^2]
                : null;

            if (previousPage is not null)
            {
                await navigation.PopAsync(false);
                return;
            }

            await Shell.Current.GoToAsync(nameof(CourseRegistrationPage));
        }
        catch
        {
            try
            {
                await Shell.Current.GoToAsync(nameof(CourseRegistrationPage));
            }
            catch
            {
                // Không ném lỗi ra ngoài để tránh app bị kill khi back fail.
            }
        }
    }
}

