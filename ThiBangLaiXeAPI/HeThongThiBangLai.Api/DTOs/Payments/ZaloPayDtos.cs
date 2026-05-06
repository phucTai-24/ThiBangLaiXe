namespace HeThongThiBangLai.Api.DTOs.Payments;

public sealed class CreateZaloPayOrderRequestDto
{
    public long RegistrationId { get; set; }
}

public sealed class CreateZaloPayOrderResponseDto
{
    public long ReceiptId { get; set; }
    public string AppTransId { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string OrderUrl { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public int ZaloPayReturnCode { get; set; }
    public string ZaloPayReturnMessage { get; set; } = string.Empty;
}

public sealed class ZaloPayPaymentStatusDto
{
    public long ReceiptId { get; set; }
    public string AppTransId { get; set; } = string.Empty;
    public long RegistrationId { get; set; }
    public long Amount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
}

public sealed class ZaloPayCallbackResultDto
{
    public int ReturnCode { get; set; }
    public string ReturnMessage { get; set; } = string.Empty;
}
