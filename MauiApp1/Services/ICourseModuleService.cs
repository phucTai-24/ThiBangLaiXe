using MauiApp1.Models.CourseModule;

namespace MauiApp1.Services;

public interface ICourseModuleService
{
    Task<List<Course>> GetCoursesAsync(string? search = null, string? licenseType = null, CancellationToken cancellationToken = default);
    Task<Course?> GetCourseByIdAsync(long courseId, CancellationToken cancellationToken = default);
    Task<List<DrivingClass>> GetClassesByCourseIdAsync(long courseId, CancellationToken cancellationToken = default);
    Task<List<DrivingClass>> GetOpenClassesAsync(CancellationToken cancellationToken = default);
    Task<DrivingClass?> GetClassByIdAsync(long classId, CancellationToken cancellationToken = default);
    Task<List<StudySchedule>> GetMySchedulesAsync(CancellationToken cancellationToken = default);
    Task<StudentRegistration> CreateRegistrationAsync(CreateRegistrationRequest request, CancellationToken cancellationToken = default);
    Task<StudentRegistration?> GetRegistrationByIdAsync(long registrationId, CancellationToken cancellationToken = default);
    Task<StudentRegistration?> FindMyRegistrationAsync(long courseId, long classId, CancellationToken cancellationToken = default);
    Task<StudentRegistration?> FindMyRegistrationByCourseAsync(long courseId, CancellationToken cancellationToken = default);
    Task<List<StudentRegistration>> GetMyRegistrationsAsync(CancellationToken cancellationToken = default);
    Task<Payment> CreateVnPayPaymentUrlAsync(long registrationId, CancellationToken cancellationToken = default);
    Task<Payment> GetPaymentStatusAsync(long paymentId, CancellationToken cancellationToken = default);
    Task<List<Payment>> GetMyPaymentsAsync(CancellationToken cancellationToken = default);
}

