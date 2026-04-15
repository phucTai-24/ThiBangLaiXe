using System.Globalization;

namespace MauiApp1.Converters;

public class ProgressConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is int answeredCount)
        {
            // Assuming 20 questions total, calculate width for progress bar
            // Max width should be around 300-350 for mobile screens
            return (answeredCount / 20.0) * 300;
        }
        return 0;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
