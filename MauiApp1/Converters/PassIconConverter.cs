using System.Globalization;

namespace MauiApp1.Converters;

public class PassIconConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool isPassed)
        {
            return isPassed ? "✓" : "✗";
        }
        return "✗";
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
