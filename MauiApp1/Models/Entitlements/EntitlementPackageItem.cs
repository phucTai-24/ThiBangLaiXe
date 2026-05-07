using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models.Entitlements;

public sealed class EntitlementPackageItem : INotifyPropertyChanged
{
    private bool _isRegistered;
    private string _registrationBadgeText = "Đã đăng ký";

    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public long RegistrationId { get; set; }
    public string RegistrationStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal TuitionFee { get; set; }

    public string RegistrationBadgeText
    {
        get => _registrationBadgeText;
        set
        {
            if (_registrationBadgeText == value)
                return;

            _registrationBadgeText = value;
            OnPropertyChanged();
        }
    }

    public bool IsRegistered
    {
        get => _isRegistered;
        set
        {
            if (_isRegistered == value)
                return;

            _isRegistered = value;
            OnPropertyChanged();
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

