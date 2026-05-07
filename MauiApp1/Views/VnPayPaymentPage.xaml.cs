using MauiApp1.Helpers;
using MauiApp1.Services;

namespace MauiApp1.Views;

[QueryProperty(nameof(RegistrationId), "registrationId")]
public partial class VnPayPaymentPage : ContentPage
{
    private readonly VnPayMobileService _vnPayMobileService;

    private string? _orderUrl;
    private long _receiptId;
    private bool _isLoading;

    public string? RegistrationId
    {
        get => RegistrationIdEntry.Text;
        set
        {
            if (long.TryParse(value, out var registrationId) && registrationId > 0)
                RegistrationIdEntry.Text = registrationId.ToString();
        }
    }

    public VnPayPaymentPage(VnPayMobileService vnPayMobileService)
    {
        _vnPayMobileService = vnPayMobileService;
        InitializeComponent();
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();

        var pendingReceiptId = _vnPayMobileService.GetPendingReceiptId();
        if (pendingReceiptId.HasValue)
        {
            _receiptId = pendingReceiptId.Value;
            ReceiptIdLabel.Text = $"ReceiptId: {_receiptId}";
            CheckStatusButton.IsEnabled = true;
            StatusLabel.Text = "Đã khôi phục receiptId đang chờ thanh toán. Bạn có thể kiểm tra lại trạng thái.";
        }
    }

    private async void OnCreateOrderClicked(object? sender, EventArgs e)
    {
        if (_isLoading)
            return;

        if (!long.TryParse(RegistrationIdEntry.Text, out var registrationId) || registrationId <= 0)
        {
            await DisplayAlert("Dữ liệu không hợp lệ", "registrationId phải là số nguyên dương.", "OK");
            return;
        }

        try
        {
            SetLoading(true, "Đang tạo đơn VNPAY...");

            var order = await _vnPayMobileService.CreateOrderAsync(registrationId);
            if (order is null)
                throw new InvalidOperationException("Phản hồi tạo đơn bị null.");

            _receiptId = order.ReceiptId;
            _orderUrl = order.OrderUrl;

            ReceiptIdLabel.Text = $"ReceiptId: {order.ReceiptId}";
            TransactionRefLabel.Text = $"TransactionRef: {order.TransactionRef}";
            AmountLabel.Text = $"Amount: {order.Amount:N0}đ";
            PaymentStatusLabel.Text = $"PaymentStatus: {order.PaymentStatus}";

            OpenOrderButton.IsEnabled = !string.IsNullOrWhiteSpace(_orderUrl);
            CheckStatusButton.IsEnabled = _receiptId > 0;
            StatusLabel.Text = "Tạo đơn thành công. Mở VNPAY để thanh toán.";
        }
        catch (UnauthorizedAccessException)
        {
            StatusLabel.Text = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
            await DisplayAlert("Hết phiên", "Bạn cần đăng nhập lại để tiếp tục thanh toán.", "OK");
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Tạo đơn thất bại.";
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
        finally
        {
            SetLoading(false);
        }
    }

    private async void OnOpenOrderClicked(object? sender, EventArgs e)
    {
        if (_isLoading)
            return;

        if (string.IsNullOrWhiteSpace(_orderUrl))
        {
            await DisplayAlert("Thiếu dữ liệu", "Chưa có orderUrl để mở thanh toán.", "OK");
            return;
        }

        try
        {
            SetLoading(true, "Đang mở trang VNPAY...");
            await Launcher.OpenAsync(new Uri(_orderUrl));
            StatusLabel.Text = "Đã mở VNPAY. Ứng dụng sẽ tự kiểm tra trạng thái thanh toán.";
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Không thể mở liên kết thanh toán.";
            await DisplayAlert("Lỗi", ex.Message, "OK");
            return;
        }
        finally
        {
            SetLoading(false);
        }

        await StartAutoPollingAsync();
    }

    private async void OnCheckStatusClicked(object? sender, EventArgs e)
    {
        if (_isLoading)
            return;

        await CheckStatusOnceAsync();
    }

    private async Task StartAutoPollingAsync()
    {
        if (_receiptId <= 0)
        {
            await DisplayAlert("Thiếu dữ liệu", "Không tìm thấy receiptId để polling.", "OK");
            return;
        }

        try
        {
            SetLoading(true, "Đang tự động kiểm tra trạng thái (mỗi 3 giây, tối đa 10 lần)...");
            var finalStatus = await _vnPayMobileService.PollUntilFinalAsync(_receiptId, 10, 3);

            if (finalStatus is null)
            {
                StatusLabel.Text = "Không nhận được trạng thái thanh toán.";
                return;
            }

            UpdatePaymentStatus(finalStatus.PaymentStatus);
            await ShowActivationMessageIfPaidAsync(finalStatus.PaymentStatus);
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Auto polling thất bại.";
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
        finally
        {
            SetLoading(false);
        }
    }

    private async Task CheckStatusOnceAsync()
    {
        if (_receiptId <= 0)
        {
            await DisplayAlert("Thiếu dữ liệu", "Bạn chưa có receiptId để kiểm tra trạng thái.", "OK");
            return;
        }

        try
        {
            SetLoading(true, "Đang kiểm tra trạng thái thanh toán...");
            var status = await _vnPayMobileService.GetReceiptStatusAsync(_receiptId);
            if (status is null)
                throw new InvalidOperationException("Phản hồi kiểm tra trạng thái bị null.");

            UpdatePaymentStatus(status.PaymentStatus);
            await ShowActivationMessageIfPaidAsync(status.PaymentStatus);
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Kiểm tra trạng thái thất bại.";
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
        finally
        {
            SetLoading(false);
        }
    }

    private async Task ShowActivationMessageIfPaidAsync(string? paymentStatus)
    {
        if (string.Equals(paymentStatus, PaymentStatuses.DaThanhToan, StringComparison.OrdinalIgnoreCase))
        {
            StatusLabel.Text = "Thanh toán thành công. Người dùng đã đủ điều kiện kích hoạt khóa học.";
            await DisplayAlert("Thành công", "Trạng thái DaThanhToan. Có thể kích hoạt quyền học khóa học.", "OK");
            return;
        }

        if (string.Equals(paymentStatus, PaymentStatuses.ChoThanhToan, StringComparison.OrdinalIgnoreCase))
        {
            StatusLabel.Text = "Đơn đang chờ thanh toán. User chưa được học khóa học.";
            return;
        }

        if (string.Equals(paymentStatus, PaymentStatuses.ThatBai, StringComparison.OrdinalIgnoreCase))
        {
            StatusLabel.Text = "Thanh toán thất bại. User chưa được học khóa học.";
            await DisplayAlert("Thông báo", "Thanh toán thất bại. Vui lòng thử lại.", "OK");
            return;
        }

        if (string.Equals(paymentStatus, PaymentStatuses.DaHuy, StringComparison.OrdinalIgnoreCase))
        {
            StatusLabel.Text = "Đơn đã hủy. User chưa được học khóa học.";
            await DisplayAlert("Thông báo", "Đơn thanh toán đã bị hủy.", "OK");
            return;
        }

        StatusLabel.Text = $"Trạng thái hiện tại: {paymentStatus ?? "Không xác định"}.";
    }

    private void UpdatePaymentStatus(string? paymentStatus)
    {
        PaymentStatusLabel.Text = $"PaymentStatus: {paymentStatus ?? "-"}";
    }

    private void SetLoading(bool isLoading, string? message = null)
    {
        _isLoading = isLoading;

        LoadingIndicator.IsVisible = isLoading;
        LoadingIndicator.IsRunning = isLoading;

        CreateOrderButton.IsEnabled = !isLoading;
        OpenOrderButton.IsEnabled = !isLoading && !string.IsNullOrWhiteSpace(_orderUrl);
        CheckStatusButton.IsEnabled = !isLoading && _receiptId > 0;

        if (!string.IsNullOrWhiteSpace(message))
            StatusLabel.Text = message;
    }

    private async void OnBackTapped(object? sender, EventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }
}

