using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MauiApp1.Models.Entitlements;

public sealed class EntitlementPackageItem : INotifyPropertyChanged
{
    private bool _isRegistered;

    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }

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

