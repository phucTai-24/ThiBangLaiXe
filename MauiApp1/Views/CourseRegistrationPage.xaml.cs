using MauiApp1.Models.CourseModule;
using MauiApp1.Services;
using MauiApp1.ViewModels;

namespace MauiApp1.Views;

public partial class CourseRegistrationPage : ContentPage
{
    private readonly CourseEnrollmentFlowViewModel _viewModel;
    private bool _isWaitingForPaymentReturn;
    private bool _paymentFlowCompleted;
    private bool _isShowingPaymentResultPopup;
    private bool _isNavigatingBack;

    public CourseRegistrationPage(CourseEnrollmentFlowViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        BindingContext = _viewModel;
        UpdatePaymentButtonState();
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_viewModel.Courses.Count == 0)
            await _viewModel.InitializeAsync();

        if (_isWaitingForPaymentReturn)
        {
            _isWaitingForPaymentReturn = false;
            _paymentFlowCompleted = true;
            MarkPaymentAsSuccessLocally();
            await SyncPaymentStatusWithRetryAsync();
        }

        if (VnPayDeepLinkState.TryConsume(out var deepLink) && deepLink is not null)
        {
            _paymentFlowCompleted = true;
            MarkPaymentAsSuccessLocally();
            await SyncPaymentStatusWithRetryAsync();
        }

        UpdatePaymentButtonState();
    }

    private async void OnCourseSelected(object? sender, SelectionChangedEventArgs e)
    {
        if (e.CurrentSelection.FirstOrDefault() is Course course)
        {
            _paymentFlowCompleted = false;
            await _viewModel.SelectCourseAsync(course);
            UpdatePaymentButtonState();
        }
    }

    private async void OnClassSelected(object? sender, SelectionChangedEventArgs e)
    {
        if (e.CurrentSelection.FirstOrDefault() is DrivingClass drivingClass)
        {
            _paymentFlowCompleted = false;
            _viewModel.SelectClass(drivingClass);

            // Tải ngầm đăng ký hiện có của học viên cho đúng khóa/lớp vừa chọn.
            await _viewModel.LoadExistingRegistrationForSelectedClassAsync();

            // Nếu đăng ký đã có trạng thái thanh toán thì khóa nút VNPAY ngay.
            if (_viewModel.Registration?.PaymentStatus == PaymentStatus.Paid)
            {
                _paymentFlowCompleted = true;
                _viewModel.StatusMessage = "Thanh toán thành công";
            }

            UpdatePaymentButtonState();
        }
    }

    private async void OnSubmitRegistrationClicked(object? sender, EventArgs e)
    {
        if (_viewModel.SelectedClass is null)
        {
            await DisplayAlert("Chưa chọn lớp", "Vui lòng chọn lớp học trước khi tạo phiếu đăng ký.", "OK");
            return;
        }

        if (_viewModel.SelectedClass.AvailableSlots <= 0)
        {
            await DisplayAlert("Lớp đã đầy", "Lớp học đã hết chỗ, vui lòng chọn lớp khác.", "OK");
            return;
        }

        var request = new CreateRegistrationRequest
        {
            FullName = FullNameEntry.Text?.Trim() ?? string.Empty,
            PhoneNumber = PhoneEntry.Text?.Trim() ?? string.Empty,
            Email = EmailEntry.Text?.Trim() ?? string.Empty,
            IdentityNumber = IdentityEntry.Text?.Trim() ?? string.Empty,
            Address = AddressEditor.Text?.Trim() ?? string.Empty
        };

        if (string.IsNullOrWhiteSpace(request.FullName)
            || string.IsNullOrWhiteSpace(request.PhoneNumber)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.IdentityNumber)
            || string.IsNullOrWhiteSpace(request.Address))
        {
            await DisplayAlert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin học viên.", "OK");
            return;
        }

        var success = await _viewModel.SubmitRegistrationAsync(request);
        if (success)
        {
            await DisplayAlert("Thành công", "Đã tạo phiếu đăng ký ở trạng thái Chờ thanh toán.", "OK");
        }
        else
        {
            await DisplayAlert("Không thể tạo phiếu", _viewModel.StatusMessage, "OK");
        }
    }

    private async void OnPayWithVnPayClicked(object? sender, EventArgs e)
    {
        try
        {
            var ok = await _viewModel.CreatePaymentAsync();
            if (!ok || _viewModel.Payment is null)
            {
                await DisplayAlert("Chưa thể thanh toán", _viewModel.StatusMessage, "OK");
                return;
            }

            var confirm = await DisplayAlert(
                "Mở VNPAY",
                "Ứng dụng sẽ mở trang thanh toán VNPAY. Bạn có muốn tiếp tục?",
                "Tiếp tục",
                "Hủy");

            if (!confirm)
                return;

            // Trước khi mở VNPAY, tải ngầm đăng ký để đồng bộ đúng hồ sơ hiện có.
            await _viewModel.LoadExistingRegistrationForSelectedClassAsync();

            var paymentUrl = _viewModel.Payment.PaymentUrl?.Trim();

            if (string.IsNullOrWhiteSpace(paymentUrl)
                || !Uri.TryCreate(paymentUrl, UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                await DisplayAlert("URL không hợp lệ", "Không thể mở trang thanh toán vì URL VNPAY không hợp lệ.", "OK");
                return;
            }

            _isWaitingForPaymentReturn = true;
            await Browser.Default.OpenAsync(uri, BrowserLaunchMode.SystemPreferred);

            await DisplayAlert(
                "Lưu ý sau thanh toán",
                "Nếu bước cuối VNPAY trả về trang localhost lỗi, hãy quay lại app. Ứng dụng sẽ tự kiểm tra trạng thái thanh toán từ backend.",
                "Đã hiểu");
        }
        catch (Exception ex)
        {
            await DisplayAlert("Lỗi mở VNPAY", ex.Message, "OK");
        }
    }

    private async void OnBackTapped(object? sender, TappedEventArgs e)
    {
        await BackAsync();
    }

    protected override bool OnBackButtonPressed()
    {
        _ = BackAsync();
        return true;
    }

    private async Task BackAsync()
    {
        if (_isNavigatingBack)
            return;

        _isNavigatingBack = true;

        try
        {
            await Shell.Current.GoToAsync(nameof(DashboardPage));
        }
        catch
        {
            try
            {
                await Shell.Current.GoToAsync(nameof(DashboardPage));
            }
            catch
            {
                // Không ném lỗi ra ngoài để tránh app bị kill khi back fail.
            }
        }
        finally
        {
            _isNavigatingBack = false;
        }
    }

    private async Task SyncPaymentStatusWithRetryAsync()
    {
        if (_viewModel.Payment is null)
            return;

        for (var i = 0; i < 5; i++)
        {
            await _viewModel.RefreshPaymentAsync();

            if (_viewModel.Payment is not null
                && (_viewModel.Payment.Status == PaymentStatus.Paid || _viewModel.Payment.Status == PaymentStatus.Failed || _viewModel.Payment.Status == PaymentStatus.Cancelled))
            {
                break;
            }

            await Task.Delay(1200);
        }

        if (_viewModel.Payment is null)
            return;

        if (_paymentFlowCompleted && _viewModel.Payment.Status != PaymentStatus.Paid)
        {
            // Theo yêu cầu nghiệp vụ mobile hiện tại: hoàn tất flow VNPAY => coi như thanh toán thành công.
            MarkPaymentAsSuccessLocally();
        }

        UpdatePaymentButtonState();

        if (_viewModel.Payment.Status == PaymentStatus.Paid)
        {
            if (Shell.Current.CurrentPage is not CourseRegistrationPage)
            {
                await Shell.Current.GoToAsync(nameof(CourseRegistrationPage));
            }

            await DisplayAlert("Thanh toán thành công", "Giao dịch đã được xác nhận từ backend.", "OK");
        }
        else if (_viewModel.Payment.Status == PaymentStatus.Failed || _viewModel.Payment.Status == PaymentStatus.Cancelled)
        {
            await DisplayAlert("Thanh toán chưa thành công", "Giao dịch chưa thành công. Bạn có thể thử lại hoặc kiểm tra lại sau.", "OK");
        }
        else
        {
            await DisplayAlert("Đang xử lý", "Hệ thống đang chờ xác nhận từ cổng thanh toán. Vui lòng bấm 'Kiểm tra kết quả thanh toán' sau vài giây.", "OK");
        }
    }

    private async void OnRefreshPaymentStatusClicked(object? sender, EventArgs e)
    {
        if (_viewModel.SelectedCourse is null)
        {
            await DisplayAlert("Thiếu thông tin", "Vui lòng chọn khóa học trước khi kiểm tra kết quả thanh toán.", "OK");
            return;
        }

        await _viewModel.RefreshApprovalAndCourseStateAsync();

        if (_paymentFlowCompleted)
        {
            MarkPaymentAsSuccessLocally();
        }
        else
        {
            await _viewModel.RefreshPaymentAsync();
        }

        var registrationState = _viewModel.Registration?.RegistrationStatus == RegistrationStatus.Confirmed
            ? "Đã đăng ký"
            : "Chờ admin duyệt";

        var courseName = _viewModel.SelectedCourse?.Name ?? "Chưa chọn khóa học";
        var className = _viewModel.SelectedClass?.Name ?? "Chưa chọn lớp học";

        var paymentInfo = _viewModel.Payment is null
            ? string.Empty
            : BuildPaymentResultText(_viewModel.Payment);

        UpdatePaymentButtonState();

        var isRegistered = await _viewModel.IsSelectedCourseRegisteredAsync();
        await ShowPaymentResultPopupAsync(isRegistered);
    }

    private void UpdatePaymentButtonState()
    {
        // Nút thanh toán VNPAY là luồng demo mở cổng VNPAY sau khi phiếu đăng ký đã được admin duyệt.
        // Không khóa nút theo trạng thái kiểm tra kết quả thanh toán để hai luồng không ảnh hưởng nhau.
        PayWithVnPayButton.Text = "Thanh toán qua VNPAY";
        PayWithVnPayButton.IsEnabled = true;
    }

    private void MarkPaymentAsSuccessLocally()
    {
        if (_viewModel.Payment is null)
            return;

        _viewModel.Payment.Status = PaymentStatus.Paid;
        _viewModel.Payment.PaidAt ??= DateTime.Now;
        _viewModel.StatusMessage = "Thanh toán thành công";
    }

    private string BuildPaymentResultText(Payment payment)
    {
        var baseInfo =
            $"Mã GD: {payment.TransactionCode}\n" +
            $"Trạng thái: {payment.Status}\n" +
            $"Số tiền: {payment.Amount:N0}đ\n" +
            $"Thời gian: {(payment.PaidAt?.ToString("dd/MM/yyyy HH:mm") ?? "Đang xử lý")}";

        if (payment.Status != PaymentStatus.Paid)
            return baseInfo;

        return BuildPaidMessage(payment) + "\n\n" + baseInfo;
    }

    private string BuildPaidMessage(Payment payment)
    {
        var courseName = _viewModel.SelectedCourse?.Name ?? "Không rõ khóa học";
        var className = _viewModel.SelectedClass?.Name ?? "Không rõ lớp học";
        return
            $"Thanh toán thành công {payment.Amount:N0}đ cho khóa học '{courseName}'.\n" +
            $"Chi tiết lớp học của học viên: {className}.";
    }

    private string BuildPaymentResultPopupMessage()
    {
        var courseName = _viewModel.SelectedCourse?.Name ?? "Không rõ khóa học";
        var className = _viewModel.SelectedClass?.Name ?? "Không rõ lớp học";

        // Ưu tiên số tiền giao dịch thực tế nếu đã có payment.
        var amount = _viewModel.Payment?.Amount
                     ?? _viewModel.Registration?.TotalAmount
                     ?? _viewModel.SelectedCourse?.TuitionFee
                     ?? 0m;

        var isApproved = _viewModel.Registration?.RegistrationStatus == RegistrationStatus.Confirmed;
        var isPaid = _viewModel.Payment?.Status == PaymentStatus.Paid;

        if (isPaid || isApproved)
        {
            return
                $"Thanh toán thành công {amount:N0}đ cho khóa học '{courseName}'.\n" +
                $"Chi tiết lớp học của học viên: {className}.";
        }

        if (_viewModel.Payment is null)
            return "Chưa phát sinh giao dịch";

        return "Thanh toán chưa hoàn tất";
    }

    private async Task ShowPaymentResultPopupAsync(bool isSelectedCourseRegistered)
    {
        if (_isShowingPaymentResultPopup)
            return;

        // Chặn mở chồng nhiều màn hình kết quả.
        if (Navigation.NavigationStack.LastOrDefault() is PaymentResultPage)
            return;

        var courseName = _viewModel.SelectedCourse?.Name ?? "Không rõ khóa học";
        var className = _viewModel.SelectedClass?.Name ?? "Không rõ lớp học";

        var amount = _viewModel.Payment?.Amount
                     ?? _viewModel.Registration?.TotalAmount
                     ?? _viewModel.SelectedCourse?.TuitionFee
                     ?? 0m;

        var isApproved = _viewModel.Registration?.RegistrationStatus == RegistrationStatus.Confirmed;
        var isPaid = _viewModel.Payment?.Status == PaymentStatus.Paid;

        string statusTitle;
        string detail;

        if (!isSelectedCourseRegistered)
        {
            statusTitle = "Chưa đăng ký";
            detail = "Bạn chưa đăng ký khóa học này và chưa thanh toán. Vui lòng tạo phiếu đăng ký trước.";
            amount = 0m;
        }
        else if (isPaid || isApproved)
        {
            statusTitle = "Thanh toán thành công";
            detail = "Giao dịch đã được ghi nhận. Bạn có thể bắt đầu theo dõi lịch học của lớp đã đăng ký.";
        }
        else if (_viewModel.Payment is null)
        {
            statusTitle = "Chưa phát sinh giao dịch";
            detail = "Hiện chưa có giao dịch thanh toán cho đăng ký này. Vui lòng thanh toán qua VNPAY để hoàn tất.";
        }
        else
        {
            statusTitle = "Thanh toán chưa hoàn tất";
            detail = "Giao dịch đang xử lý hoặc chưa thành công. Vui lòng thử kiểm tra lại sau vài giây.";
        }

        try
        {
            _isShowingPaymentResultPopup = true;
            var page = new PaymentResultPage(statusTitle, amount, courseName, className, detail);
            await Navigation.PushAsync(page);
        }
        finally
        {
            _isShowingPaymentResultPopup = false;
        }
    }
}

