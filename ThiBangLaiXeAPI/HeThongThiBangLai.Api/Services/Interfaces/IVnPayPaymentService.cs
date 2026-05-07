using HeThongThiBangLai.Api.Common.Responses;
using HeThongThiBangLai.Api.DTOs.Payments;

namespace HeThongThiBangLai.Api.Services.Interfaces;

public interface IVnPayPaymentService
{
    Task<ApiResponse<CreateVnPayOrderResponseDto>> CreateOrderAsync(CreateVnPayOrderRequestDto request, long currentUserId, string? ipAddress = null);

    Task<VnPayIpnResultDto> HandleIpnAsync(IQueryCollection query);

    Task<ApiResponse<VnPayReturnResultDto>> HandleReturnAsync(IQueryCollection query);

    Task<ApiResponse<VnPayPaymentStatusDto>> GetStatusAsync(long receiptId, long currentUserId);
}
