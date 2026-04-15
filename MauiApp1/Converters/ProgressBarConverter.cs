using System.Globalization;

namespace MauiApp1.Converters;

public class ProgressBarConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is double percentage && parameter is string param)
        {
            // percentage is 0.0 to 1.0
            // param is "filled" or "remaining"
            if (param == "filled")
            {
                return percentage * 100; // Return percentage for filled part
            }
            else if (param == "remaining")
            {
                return (1 - percentage) * 100; // Return remaining percentage
            }
        }
        return 0;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
