namespace HeThongThiBangLai.Api.DTOs.Payments;

public sealed class CreateVnPayOrderRequestDto
{
    public long RegistrationId { get; set; }
}

public sealed class CreateVnPayOrderResponseDto
{
    public long ReceiptId { get; set; }
    public string TransactionRef { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string OrderUrl { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
}

public sealed class VnPayPaymentStatusDto
{
    public long ReceiptId { get; set; }
    public string TransactionRef { get; set; } = string.Empty;
    public long RegistrationId { get; set; }
    public long Amount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
}

public sealed class VnPayReturnResultDto
{
    public long ReceiptId { get; set; }
    public string TransactionRef { get; set; } = string.Empty;
    public long RegistrationId { get; set; }
    public string ResponseCode { get; set; } = string.Empty;
    public string TransactionStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public bool SignatureValid { get; set; }
}

public sealed class VnPayIpnResultDto
{
    public string RspCode { get; set; } = "99";
    public string Message { get; set; } = string.Empty;
}
