using MauiApp1.Models.Entitlements;

namespace MauiApp1.Services;

public interface IEntitlementService
{
    Task<List<EntitlementPackageItem>> GetPackagesAsync();
    Task RegisterPackageAsync(long packageId);
}

