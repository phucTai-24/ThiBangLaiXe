using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace MauiApp1.Services;

public sealed class VnPayMobileService
{
    private const string PendingReceiptPreferenceKey = "vnpay_pending_receipt_id";
    private const string PendingRegistrationPreferenceKey = "vnpay_pending_registration_id";

    private readonly HttpClient _httpClient;
    private readonly ITokenStore _tokenStore;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public VnPayMobileService(HttpClient httpClient, ITokenStore tokenStore)
    {
        _httpClient = httpClient;
        _tokenStore = tokenStore;
    }

    public async Task<CreateVnPayOrderResponseDto> CreateOrderAsync(long registrationId, CancellationToken cancellationToken = default)
    {
        if (registrationId <= 0)
            throw new ArgumentOutOfRangeException(nameof(registrationId), "registrationId không hợp lệ.");

        await AttachAuthHeaderAsync(cancellationToken);

        var response = await _httpClient.PostAsJsonAsync(
            "api/v1/payments/vnpay/create-order",
            new CreateVnPayOrderRequestDto { RegistrationId = registrationId },
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Tạo đơn VNPAY thất bại ({(int)response.StatusCode}): {ExtractError(body)}");
        }

        var dto = await response.Content.ReadFromJsonAsync<CreateVnPayOrderResponseDto>(JsonOptions, cancellationToken);
        if (dto is null)
            throw new InvalidOperationException("API trả về dữ liệu rỗng khi tạo đơn VNPAY.");

        if (dto.ReceiptId <= 0)
            throw new InvalidOperationException("receiptId không hợp lệ từ API.");

        if (string.IsNullOrWhiteSpace(dto.OrderUrl))
            throw new InvalidOperationException("orderUrl rỗng từ API.");

        SavePendingReceipt(dto.ReceiptId, registrationId);
        return dto;
    }

    public async Task<VnPayReceiptStatusDto> GetReceiptStatusAsync(long receiptId, CancellationToken cancellationToken = default)
    {
        if (receiptId <= 0)
            throw new ArgumentOutOfRangeException(nameof(receiptId), "receiptId không hợp lệ.");

        await AttachAuthHeaderAsync(cancellationToken);

        var response = await _httpClient.GetAsync($"api/v1/payments/vnpay/receipts/{receiptId}/status", cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Lấy trạng thái thanh toán thất bại ({(int)response.StatusCode}): {ExtractError(body)}");
        }

        var dto = await response.Content.ReadFromJsonAsync<VnPayReceiptStatusDto>(JsonOptions, cancellationToken);
        if (dto is null)
            throw new InvalidOperationException("API trả về dữ liệu rỗng khi kiểm tra trạng thái thanh toán.");

        if (string.Equals(dto.PaymentStatus, PaymentStatuses.DaThanhToan, StringComparison.OrdinalIgnoreCase))
            ClearPendingReceipt();

        return dto;
    }

    public async Task<VnPayReceiptStatusDto?> PollUntilFinalAsync(
        long receiptId,
        int maxAttempts = 10,
        int delaySeconds = 3,
        CancellationToken cancellationToken = default)
    {
        if (maxAttempts <= 0)
            throw new ArgumentOutOfRangeException(nameof(maxAttempts));

        if (delaySeconds <= 0)
            throw new ArgumentOutOfRangeException(nameof(delaySeconds));

        VnPayReceiptStatusDto? latest = null;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            latest = await GetReceiptStatusAsync(receiptId, cancellationToken);

            if (IsFinalStatus(latest.PaymentStatus))
                return latest;

            if (attempt < maxAttempts)
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds), cancellationToken);
        }

        return latest;
    }

    public long? GetPendingReceiptId()
    {
        var value = Preferences.Default.Get(PendingReceiptPreferenceKey, 0L);
        return value > 0 ? value : null;
    }

    public long? GetPendingRegistrationId()
    {
        var value = Preferences.Default.Get(PendingRegistrationPreferenceKey, 0L);
        return value > 0 ? value : null;
    }

    public void SavePendingReceipt(long receiptId, long registrationId)
    {
        if (receiptId <= 0)
            return;

        Preferences.Default.Set(PendingReceiptPreferenceKey, receiptId);

        if (registrationId > 0)
            Preferences.Default.Set(PendingRegistrationPreferenceKey, registrationId);
    }

    public void ClearPendingReceipt()
    {
        Preferences.Default.Remove(PendingReceiptPreferenceKey);
        Preferences.Default.Remove(PendingRegistrationPreferenceKey);
    }

    public static bool IsFinalStatus(string? paymentStatus)
    {
        return string.Equals(paymentStatus, PaymentStatuses.DaThanhToan, StringComparison.OrdinalIgnoreCase)
               || string.Equals(paymentStatus, PaymentStatuses.ThatBai, StringComparison.OrdinalIgnoreCase)
               || string.Equals(paymentStatus, PaymentStatuses.DaHuy, StringComparison.OrdinalIgnoreCase);
    }

    private async Task AttachAuthHeaderAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var token = await _tokenStore.GetAccessTokenAsync();
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static string ExtractError(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
            return "Không có thông tin lỗi từ máy chủ.";

        try
        {
            var wrapped = JsonSerializer.Deserialize<ApiErrorEnvelope>(responseBody, JsonOptions);
            return wrapped?.Message
                   ?? wrapped?.Errors?.FirstOrDefault()?.Detail
                   ?? responseBody;
        }
        catch
        {
            return responseBody;
        }
    }

    private sealed class ApiErrorEnvelope
    {
        public string? Message { get; set; }
        public List<ApiErrorItem>? Errors { get; set; }
    }

    private sealed class ApiErrorItem
    {
        public string? Detail { get; set; }
    }
}

public sealed class CreateVnPayOrderRequestDto
{
    public long RegistrationId { get; set; }
}

public sealed class CreateVnPayOrderResponseDto
{
    public long ReceiptId { get; set; }
    public string TransactionRef { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string OrderUrl { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
}

public sealed class VnPayReceiptStatusDto
{
    public long ReceiptId { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime? PaidAtUtc { get; set; }
}

public static class PaymentStatuses
{
    public const string DaThanhToan = "DaThanhToan";
    public const string ChoThanhToan = "ChoThanhToan";
    public const string ThatBai = "ThatBai";
    public const string DaHuy = "DaHuy";
}

