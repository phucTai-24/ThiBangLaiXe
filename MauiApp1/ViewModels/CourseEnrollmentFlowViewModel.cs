using System.Collections.ObjectModel;
using MauiApp1.Models.CourseModule;
using MauiApp1.Services;

namespace MauiApp1.ViewModels;

public sealed class CourseEnrollmentFlowViewModel : BaseViewModel
{
    private readonly ICourseModuleService _courseService;

    private bool _isLoading;
    private string _statusMessage = "Sẵn sàng";
    private Course? _selectedCourse;
    private DrivingClass? _selectedClass;
    private StudentRegistration? _registration;
    private Payment? _payment;

    public ObservableCollection<Course> Courses { get; } = new();
    public ObservableCollection<DrivingClass> Classes { get; } = new();

    public string ApprovedBadgeText => Registration?.RegistrationStatus == RegistrationStatus.Confirmed
        ? "Đã đăng ký"
        : string.Empty;

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public Course? SelectedCourse
    {
        get => _selectedCourse;
        set => SetProperty(ref _selectedCourse, value);
    }

    public DrivingClass? SelectedClass
    {
        get => _selectedClass;
        set => SetProperty(ref _selectedClass, value);
    }

    public StudentRegistration? Registration
    {
        get => _registration;
        set
        {
            if (SetProperty(ref _registration, value))
            {
                OnPropertyChanged(nameof(ApprovedBadgeText));
            }
        }
    }

    public Payment? Payment
    {
        get => _payment;
        set => SetProperty(ref _payment, value);
    }

    public CourseEnrollmentFlowViewModel(ICourseModuleService courseService)
    {
        _courseService = courseService;
    }

    public async Task InitializeAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Đang tải khóa học...";

            var courses = await _courseService.GetCoursesAsync();
            var myRegistrations = await _courseService.GetMyRegistrationsAsync();
            var registeredCourseIds = myRegistrations
                .Where(x => x.RegistrationStatus == RegistrationStatus.Confirmed)
                .Select(x => x.CourseId)
                .ToHashSet();

            foreach (var c in courses)
                c.IsRegistered = registeredCourseIds.Contains(c.Id);

            Courses.Clear();
            foreach (var item in courses)
                Courses.Add(item);

            StatusMessage = Courses.Count == 0 ? "Chưa có khóa học mở" : $"{Courses.Count} khóa học đang mở";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi tải khóa học: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task SelectCourseAsync(Course course)
    {
        SelectedCourse = course;
        SelectedClass = null;
        Registration = null;
        Payment = null;

        IsLoading = true;
        StatusMessage = "Đang tải lớp học...";
        try
        {
            var classes = await _courseService.GetClassesByCourseIdAsync(course.Id);
            Classes.Clear();
            foreach (var item in classes)
                Classes.Add(item);
            StatusMessage = Classes.Count == 0 ? "Khóa học chưa có lớp" : "Chọn lớp phù hợp để đăng ký";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi tải lớp: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public void SelectClass(DrivingClass drivingClass)
    {
        SelectedClass = drivingClass;
        Registration = null;
        Payment = null;
        StatusMessage = drivingClass.AvailableSlots > 0 ? "Lớp hợp lệ, mời nhập thông tin" : "Lớp đã hết chỗ";
    }

    public async Task<bool> LoadExistingRegistrationForSelectedClassAsync()
    {
        if (SelectedCourse is null || SelectedClass is null)
            return false;

        try
        {
            IsLoading = true;
            var existing = await _courseService.FindMyRegistrationAsync(SelectedCourse.Id, SelectedClass.Id);
            if (existing is null)
                return false;

            Registration = existing;
            StatusMessage = existing.RegistrationStatus == RegistrationStatus.Confirmed
                ? "Đăng ký đã được admin duyệt. Bạn có thể thanh toán."
                : "Đã tìm thấy đăng ký hiện có cho lớp đã chọn.";
            return true;
        }
        catch
        {
            return false;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task<bool> SubmitRegistrationAsync(CreateRegistrationRequest request)
    {
        if (SelectedCourse is null || SelectedClass is null)
        {
            StatusMessage = "Vui lòng chọn khóa học và lớp học";
            return false;
        }

        if (Registration is not null)
        {
            StatusMessage = "Bạn đã tạo phiếu đăng ký cho lớp này. Vui lòng chuyển sang bước thanh toán.";
            return false;
        }

        request.CourseId = SelectedCourse.Id;
        request.ClassId = SelectedClass.Id;

        try
        {
            IsLoading = true;
            Registration = await _courseService.CreateRegistrationAsync(request);
            StatusMessage = "Đăng ký thành công, chuyển sang bước thanh toán";
            return true;
        }
        catch (Exception ex)
        {
            StatusMessage = ex.Message;
            return false;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task<bool> CreatePaymentAsync()
    {
        await RefreshRegistrationForVnPayAsync();

        if (Registration is null)
        {
            StatusMessage = "Không tìm thấy đăng ký để thanh toán";
            return false;
        }

        if (Registration.RegistrationStatus != RegistrationStatus.Confirmed)
        {
            StatusMessage = "Đăng ký chưa được admin duyệt. Vui lòng chờ duyệt trước khi thanh toán.";
            return false;
        }

        try
        {
            IsLoading = true;
            Payment = await _courseService.CreateVnPayPaymentUrlAsync(Registration.Id);
            StatusMessage = "Đã tạo URL VNPAY, mở trình duyệt để thanh toán";
            return true;
        }
        catch (Exception ex)
        {
            StatusMessage = ex.Message;
            return false;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task RefreshPaymentAsync()
    {
        if (Payment is null)
            return;

        try
        {
            IsLoading = true;
            Payment = await _courseService.GetPaymentStatusAsync(Payment.Id);
            if (Payment.Status == PaymentStatus.Paid)
                StatusMessage = "Thanh toán thành công";
            else if (Payment.Status == PaymentStatus.Failed)
                StatusMessage = "Thanh toán thất bại";
            else
                StatusMessage = "Thanh toán đang xử lý";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task RefreshRegistrationForVnPayAsync()
    {
        if (SelectedCourse is null)
            return;

        var existing = SelectedClass is not null
            ? await _courseService.FindMyRegistrationAsync(SelectedCourse.Id, SelectedClass.Id)
            : null;

        if (existing?.RegistrationStatus == RegistrationStatus.Confirmed)
        {
            Registration = existing;
            return;
        }

        var courseRegistration = await _courseService.FindMyRegistrationByCourseAsync(SelectedCourse.Id);
        if (courseRegistration is not null)
        {
            Registration = courseRegistration;
        }
        else if (existing is not null)
        {
            Registration = existing;
        }
    }

    public async Task RefreshApprovalAndCourseStateAsync()
    {
        if (SelectedCourse is null || SelectedClass is null)
            return;

        try
        {
            IsLoading = true;

            var existing = await _courseService.FindMyRegistrationAsync(SelectedCourse.Id, SelectedClass.Id);
            if (existing is not null)
            {
                Registration = existing;

                var selectedCourse = Courses.FirstOrDefault(x => x.Id == existing.CourseId);
                if (selectedCourse is not null)
                    selectedCourse.IsRegistered = existing.RegistrationStatus == RegistrationStatus.Confirmed;

                StatusMessage = existing.RegistrationStatus == RegistrationStatus.Confirmed
                    ? "Đăng ký đã được duyệt. Trạng thái khóa học: Đã đăng ký"
                    : "Đăng ký đang chờ admin duyệt";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Không thể làm mới trạng thái duyệt: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task<bool> IsSelectedCourseRegisteredAsync()
    {
        if (SelectedCourse is null)
            return false;

        var local = Courses.FirstOrDefault(x => x.Id == SelectedCourse.Id);
        if (local?.IsRegistered == true)
            return true;

        try
        {
            var myRegistrations = await _courseService.GetMyRegistrationsAsync();
            var isRegistered = myRegistrations.Any(x =>
                x.CourseId == SelectedCourse.Id &&
                x.RegistrationStatus == RegistrationStatus.Confirmed);

            if (local is not null)
                local.IsRegistered = isRegistered;

            return isRegistered;
        }
        catch
        {
            return local?.IsRegistered == true;
        }
    }
}

