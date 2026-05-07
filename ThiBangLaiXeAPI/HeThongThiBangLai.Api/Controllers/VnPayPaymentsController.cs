using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using HeThongThiBangLai.Api.Common.Responses;
using HeThongThiBangLai.Api.DTOs.Payments;
using HeThongThiBangLai.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeThongThiBangLai.Api.Controllers;

[ApiController]
[Route("api/v1/payments/vnpay")]
public sealed class VnPayPaymentsController : ControllerBase
{
    private readonly IVnPayPaymentService _vnPayPaymentService;

    public VnPayPaymentsController(IVnPayPaymentService vnPayPaymentService)
    {
        _vnPayPaymentService = vnPayPaymentService;
    }

    [HttpPost("create-order")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<CreateVnPayOrderResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateVnPayOrderRequestDto request)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _vnPayPaymentService.CreateOrderAsync(request, GetCurrentUserId(), ipAddress);
        return Ok(result);
    }

    [HttpGet("receipts/{receiptId:long}/status")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<VnPayPaymentStatusDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(long receiptId)
    {
        var result = await _vnPayPaymentService.GetStatusAsync(receiptId, GetCurrentUserId());
        return Ok(result);
    }

    [HttpGet("ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> Ipn()
    {
        var result = await _vnPayPaymentService.HandleIpnAsync(Request.Query);
        return Ok(new
        {
            RspCode = result.RspCode,
            Message = result.Message
        });
    }

    [HttpGet("return")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<VnPayReturnResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Return()
    {
        var result = await _vnPayPaymentService.HandleReturnAsync(Request.Query);
        return Ok(result);
    }

    [HttpGet("return/mobile")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> ReturnMobile()
    {
        var result = await _vnPayPaymentService.HandleReturnAsync(Request.Query);
        var data = result.Data;
        var deepLink = BuildMobileReturnDeepLink(data);
        return Redirect(deepLink);
    }

    private static string BuildMobileReturnDeepLink(VnPayReturnResultDto? data)
    {
        var query = new Dictionary<string, string?>
        {
            ["receiptId"] = data?.ReceiptId.ToString(),
            ["transactionRef"] = data?.TransactionRef,
            ["registrationId"] = data?.RegistrationId.ToString(),
            ["responseCode"] = data?.ResponseCode,
            ["transactionStatus"] = data?.TransactionStatus,
            ["paymentStatus"] = data?.PaymentStatus,
            ["signatureValid"] = data?.SignatureValid.ToString().ToLowerInvariant()
        };

        var queryString = string.Join("&", query
            .Where(item => !string.IsNullOrWhiteSpace(item.Value))
            .Select(item => $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(item.Value!)}"));

        return string.IsNullOrWhiteSpace(queryString)
            ? "hethongthibanglai://payments/vnpay/return"
            : $"hethongthibanglai://payments/vnpay/return?{queryString}";
    }

    private long GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return long.TryParse(userIdValue, out var userId) ? userId : 0;
    }
}
