using MauiApp1.Models.Entitlements;

namespace MauiApp1.Services;

public interface IEntitlementService
{
    Task<List<EntitlementPackageItem>> GetPackagesAsync();
    Task<List<EntitlementPackageItem>> GetMyRegisteredPackagesAsync();
    Task<CourseDetailItem?> GetCourseDetailAsync(long courseId);
    Task RegisterPackageAsync(long packageId);
}

