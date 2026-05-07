using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using HeThongThiBangLai.Api.Common.Exceptions;
using HeThongThiBangLai.Api.Common.Responses;
using HeThongThiBangLai.Api.Data;
using HeThongThiBangLai.Api.DTOs.Payments;
using HeThongThiBangLai.Api.Models;
using HeThongThiBangLai.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HeThongThiBangLai.Api.Services.Payments;

public sealed class VnPayOptions
{
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public string ReturnUrl { get; set; } = "http://localhost:5135/KhoaHoc/VnPayReturn";
    public string MobileReturnUrl { get; set; } = "hethongthibanglai://payments/vnpay/return";
    public string IpnUrl { get; set; } = "http://localhost:5017/api/v1/payments/vnpay/ipn";
    public string Version { get; set; } = "2.1.0";
    public string Command { get; set; } = "pay";
    public string CurrCode { get; set; } = "VND";
    public string Locale { get; set; } = "vn";
    public string OrderType { get; set; } = "other";
    public int ExpireMinutes { get; set; } = 15;
}

public sealed class VnPayPaymentService : IVnPayPaymentService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly VnPayOptions _options;
    private readonly ILogger<VnPayPaymentService> _logger;

    public VnPayPaymentService(ApplicationDbContext dbContext, IOptions<VnPayOptions> options, ILogger<VnPayPaymentService> logger)
    {
        _dbContext = dbContext;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ApiResponse<CreateVnPayOrderResponseDto>> CreateOrderAsync(CreateVnPayOrderRequestDto request, long currentUserId, string? ipAddress = null)
    {
        ValidateOptions();

        var student = await _dbContext.hoc_viens.FirstOrDefaultAsync(item => item.nguoi_dung_id == currentUserId);
        if (student is null)
        {
            throw new NotFoundAppException("Không tìm thấy hồ sơ học viên của tài khoản hiện tại");
        }

        var registration = await _dbContext.dang_ky_khoa_hocs
            .Include(item => item.khoa_hoc)
            .FirstOrDefaultAsync(item => item.id == request.RegistrationId && item.hoc_vien_id == student.id);
        if (registration is null)
        {
            throw new NotFoundAppException("Không tìm thấy đăng ký khóa học");
        }

        if (!string.Equals(registration.trang_thai, "da_duyet", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessRuleAppException("Chỉ có thể thanh toán đăng ký đã được duyệt", "REGISTRATION_NOT_APPROVED");
        }

        var existedPaidReceipt = await _dbContext.phieu_thus.AnyAsync(receipt =>
            receipt.hoc_vien_id == student.id
            && receipt.trang_thai == "da_xac_nhan"
            && receipt.chi_tiet_phieu_thus.Any(detail => detail.ghi_chu != null && detail.ghi_chu.Contains($"DKKH:{registration.id}")));
        if (existedPaidReceipt)
        {
            throw new ConflictAppException("Đăng ký khóa học này đã được thanh toán", "REGISTRATION_ALREADY_PAID");
        }

        var amount = decimal.ToInt64(decimal.Round(registration.khoa_hoc.hoc_phi, 0, MidpointRounding.AwayFromZero));
        if (amount <= 0)
        {
            throw new BusinessRuleAppException("Học phí không hợp lệ", "INVALID_COURSE_FEE");
        }

        var receipt = await GetOrCreatePendingReceiptAsync(student.id, registration, amount, currentUserId);
        var transactionRef = receipt.ma_phieu_thu;
        var createdDate = GetVietnamNow();
        var expireDate = createdDate.AddMinutes(Math.Clamp(_options.ExpireMinutes, 1, 60));
        var vnpAmount = amount * 100;

        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = _options.Version.Trim(),
            ["vnp_Command"] = _options.Command.Trim(),
            ["vnp_TmnCode"] = _options.TmnCode.Trim(),
            ["vnp_Amount"] = vnpAmount.ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = createdDate.ToString("yyyyMMddHHmmss"),
            ["vnp_CurrCode"] = _options.CurrCode.Trim(),
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
            ["vnp_ExpireDate"] = expireDate.ToString("yyyyMMddHHmmss"),
            ["vnp_Locale"] = _options.Locale.Trim(),
            ["vnp_OrderInfo"] = $"Thanh toan hoc phi khoa hoc {registration.khoa_hoc.ten_khoa_hoc}",
            ["vnp_OrderType"] = _options.OrderType.Trim(),
            ["vnp_ReturnUrl"] = _options.ReturnUrl.Trim(),
            ["vnp_TxnRef"] = transactionRef
        };

        var signData = BuildHashData(parameters);
        var secureHash = ComputeHmacSha512(_options.HashSecret.Trim(), signData);
        parameters["vnp_SecureHash"] = secureHash;
        var orderUrl = _options.PaymentUrl.Trim() + "?" + BuildRequestQuery(parameters);

        LogCreateOrderDiagnostics(transactionRef, parameters, signData, secureHash, orderUrl);

        return ApiResponseFactory.Success(new CreateVnPayOrderResponseDto
        {
            ReceiptId = receipt.id,
            TransactionRef = transactionRef,
            Amount = amount,
            OrderUrl = orderUrl,
            PaymentStatus = ToApiPaymentStatus(receipt.trang_thai)
        }, "Tạo đơn thanh toán VNPAY thành công");
    }

    public async Task<VnPayIpnResultDto> HandleIpnAsync(IQueryCollection query)
    {
        var parameters = NormalizeQuery(query);
        if (!parameters.TryGetValue("vnp_TxnRef", out var transactionRef) || string.IsNullOrWhiteSpace(transactionRef))
        {
            return new VnPayIpnResultDto { RspCode = "01", Message = "Order not found" };
        }

        if (!IsValidSignature(parameters))
        {
            return new VnPayIpnResultDto { RspCode = "97", Message = "Invalid signature" };
        }

        var receipt = await _dbContext.phieu_thus.FirstOrDefaultAsync(item => item.ma_phieu_thu == transactionRef);
        if (receipt is null)
        {
            return new VnPayIpnResultDto { RspCode = "01", Message = "Order not found" };
        }

        if (string.Equals(receipt.trang_thai, "da_xac_nhan", StringComparison.OrdinalIgnoreCase))
        {
            return new VnPayIpnResultDto { RspCode = "02", Message = "Order already confirmed" };
        }

        var responseCode = parameters.TryGetValue("vnp_ResponseCode", out var code) ? code : string.Empty;
        var transactionStatus = parameters.TryGetValue("vnp_TransactionStatus", out var status) ? status : string.Empty;

        if (responseCode == "00" && transactionStatus == "00")
        {
            receipt.trang_thai = "da_xac_nhan";
            receipt.nguoi_xac_nhan_id = null;
            await _dbContext.SaveChangesAsync();
            return new VnPayIpnResultDto { RspCode = "00", Message = "Confirm Success" };
        }

        receipt.trang_thai = "that_bai";
        await _dbContext.SaveChangesAsync();
        return new VnPayIpnResultDto { RspCode = "00", Message = "Payment failed recorded" };
    }

    public async Task<ApiResponse<VnPayReturnResultDto>> HandleReturnAsync(IQueryCollection query)
    {
        var parameters = NormalizeQuery(query);
        if (!parameters.TryGetValue("vnp_TxnRef", out var transactionRef) || string.IsNullOrWhiteSpace(transactionRef))
        {
            throw new BusinessRuleAppException("Thiếu mã giao dịch VNPAY", "VNPAY_TXN_REF_MISSING");
        }

        if (!IsValidSignature(parameters))
        {
            throw new BusinessRuleAppException("Chữ ký trả về từ VNPAY không hợp lệ", "VNPAY_INVALID_SIGNATURE");
        }

        var receipt = await _dbContext.phieu_thus
            .Include(item => item.chi_tiet_phieu_thus)
            .FirstOrDefaultAsync(item => item.ma_phieu_thu == transactionRef);
        if (receipt is null)
        {
            throw new NotFoundAppException("Không tìm thấy phiếu thu VNPAY");
        }

        var responseCode = parameters.TryGetValue("vnp_ResponseCode", out var code) ? code : string.Empty;
        var transactionStatus = parameters.TryGetValue("vnp_TransactionStatus", out var status) ? status : string.Empty;

        if (responseCode == "00" && transactionStatus == "00")
        {
            receipt.trang_thai = "da_xac_nhan";
            receipt.nguoi_xac_nhan_id = null;
        }
        else if (!string.Equals(receipt.trang_thai, "da_xac_nhan", StringComparison.OrdinalIgnoreCase))
        {
            receipt.trang_thai = "that_bai";
        }

        await _dbContext.SaveChangesAsync();

        var registrationId = ExtractRegistrationId(receipt.chi_tiet_phieu_thus
            .Select(item => item.ghi_chu)
            .FirstOrDefault(item => item?.Contains("DKKH:") == true));

        return ApiResponseFactory.Success(new VnPayReturnResultDto
        {
            ReceiptId = receipt.id,
            TransactionRef = receipt.ma_phieu_thu,
            RegistrationId = registrationId,
            ResponseCode = responseCode,
            TransactionStatus = transactionStatus,
            PaymentStatus = ToApiPaymentStatus(receipt.trang_thai),
            SignatureValid = true
        }, "Xác nhận kết quả trả về từ VNPAY thành công");
    }

    public async Task<ApiResponse<VnPayPaymentStatusDto>> GetStatusAsync(long receiptId, long currentUserId)
    {
        var student = await _dbContext.hoc_viens.AsNoTracking().FirstOrDefaultAsync(item => item.nguoi_dung_id == currentUserId);
        if (student is null)
        {
            throw new NotFoundAppException("Không tìm thấy hồ sơ học viên của tài khoản hiện tại");
        }

        var receipt = await _dbContext.phieu_thus
            .AsNoTracking()
            .Include(item => item.chi_tiet_phieu_thus)
            .FirstOrDefaultAsync(item => item.id == receiptId && item.hoc_vien_id == student.id);
        if (receipt is null)
        {
            throw new NotFoundAppException("Không tìm thấy phiếu thu");
        }

        var registrationId = ExtractRegistrationId(receipt.chi_tiet_phieu_thus.Select(item => item.ghi_chu).FirstOrDefault(item => item?.Contains("DKKH:") == true));

        return ApiResponseFactory.Success(new VnPayPaymentStatusDto
        {
            ReceiptId = receipt.id,
            TransactionRef = receipt.ma_phieu_thu,
            RegistrationId = registrationId,
            Amount = decimal.ToInt64(decimal.Round(receipt.tong_tien, 0, MidpointRounding.AwayFromZero)),
            PaymentStatus = ToApiPaymentStatus(receipt.trang_thai)
        }, "Lấy trạng thái thanh toán thành công");
    }

    private async Task<phieu_thu> GetOrCreatePendingReceiptAsync(long studentId, dang_ky_khoa_hoc registration, long amount, long currentUserId)
    {
        var existedReceipt = await _dbContext.phieu_thus
            .Include(item => item.chi_tiet_phieu_thus)
            .FirstOrDefaultAsync(receipt =>
                receipt.hoc_vien_id == studentId
                && receipt.trang_thai == "cho_xac_nhan"
                && receipt.chi_tiet_phieu_thus.Any(detail => detail.ghi_chu != null && detail.ghi_chu.Contains($"DKKH:{registration.id}")));
        if (existedReceipt is not null)
        {
            existedReceipt.ma_phieu_thu = GenerateTransactionRef();
            existedReceipt.ngay_thu = DateTime.UtcNow;
            existedReceipt.tong_tien = amount;
            existedReceipt.nguoi_lap_id = currentUserId;

            foreach (var detail in existedReceipt.chi_tiet_phieu_thus)
            {
                detail.so_tien = amount;
                if (!string.IsNullOrWhiteSpace(detail.ghi_chu))
                {
                    detail.ghi_chu = detail.ghi_chu.Replace("ZALOPAY_SANDBOX", "VNPAY_SANDBOX", StringComparison.OrdinalIgnoreCase);
                }
            }

            await _dbContext.SaveChangesAsync();
            return existedReceipt;
        }

        var feeType = await _dbContext.loai_khoan_thus
            .OrderByDescending(item => item.ma_loai == "HOC_PHI")
            .ThenBy(item => item.id)
            .FirstOrDefaultAsync();
        if (feeType is null)
        {
            throw new BusinessRuleAppException("Chưa cấu hình loại khoản thu học phí", "FEE_TYPE_NOT_CONFIGURED");
        }

        var receipt = new phieu_thu
        {
            ma_phieu_thu = GenerateTransactionRef(),
            hoc_vien_id = studentId,
            ngay_thu = DateTime.UtcNow,
            tong_tien = amount,
            trang_thai = "cho_xac_nhan",
            nguoi_lap_id = currentUserId,
            chi_tiet_phieu_thus = new List<chi_tiet_phieu_thu>
            {
                new()
                {
                    loai_khoan_thu_id = feeType.id,
                    so_tien = amount,
                    ghi_chu = $"DKKH:{registration.id};KHOA_HOC:{registration.khoa_hoc_id};VNPAY_SANDBOX"
                }
            }
        };

        _dbContext.phieu_thus.Add(receipt);
        await _dbContext.SaveChangesAsync();
        return receipt;
    }

    private static string GenerateTransactionRef()
    {
        return $"VNP{DateTime.UtcNow:yyMMddHHmmss}{Random.Shared.Next(100000, 999999)}";
    }

    private bool IsValidSignature(IReadOnlyDictionary<string, string> parameters)
    {
        ValidateOptions();

        if (!parameters.TryGetValue("vnp_SecureHash", out var secureHash) || string.IsNullOrWhiteSpace(secureHash))
        {
            return false;
        }

        var filtered = parameters
            .Where(item => !string.Equals(item.Key, "vnp_SecureHash", StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(item.Key, "vnp_SecureHashType", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);

        var signData = BuildHashData(filtered);
        var computedHash = ComputeHmacSha512(_options.HashSecret.Trim(), signData);
        _logger.LogWarning(
            "VNPAY IPN signature check. TxnRef={TxnRef}, SignData={SignData}, ReceivedHash={ReceivedHash}, ComputedHash={ComputedHash}, IsValid={IsValid}",
            parameters.TryGetValue("vnp_TxnRef", out var transactionRef) ? transactionRef : string.Empty,
            signData,
            MaskHash(secureHash),
            MaskHash(computedHash),
            string.Equals(computedHash, secureHash, StringComparison.OrdinalIgnoreCase));

        return string.Equals(computedHash, secureHash, StringComparison.OrdinalIgnoreCase);
    }

    private void LogCreateOrderDiagnostics(
        string transactionRef,
        IReadOnlyDictionary<string, string> parameters,
        string signData,
        string secureHash,
        string orderUrl)
    {
        var safeParameters = parameters
            .Where(item => !string.Equals(item.Key, "vnp_SecureHash", StringComparison.OrdinalIgnoreCase))
            .OrderBy(item => item.Key, StringComparer.Ordinal)
            .ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);

        _logger.LogWarning(
            "VNPAY create-order diagnostics. TxnRef={TxnRef}, TmnCode={TmnCode}, PaymentUrl={PaymentUrl}, HashSecretLength={HashSecretLength}, ParameterKeys={ParameterKeys}, Parameters={Parameters}, SignData={SignData}, SecureHash={SecureHash}, OrderUrl={OrderUrl}",
            transactionRef,
            _options.TmnCode.Trim(),
            _options.PaymentUrl.Trim(),
            _options.HashSecret.Trim().Length,
            string.Join(",", safeParameters.Keys),
            safeParameters,
            signData,
            MaskHash(secureHash),
            MaskSecureHashInUrl(orderUrl));
    }

    private static string MaskHash(string hash)
    {
        if (string.IsNullOrWhiteSpace(hash) || hash.Length <= 16)
        {
            return "***";
        }

        return $"{hash[..8]}...{hash[^8..]}";
    }

    private static string MaskSecureHashInUrl(string url)
    {
        const string key = "vnp_SecureHash=";
        var startIndex = url.IndexOf(key, StringComparison.OrdinalIgnoreCase);
        if (startIndex < 0)
        {
            return url;
        }

        var valueStartIndex = startIndex + key.Length;
        var valueEndIndex = url.IndexOf('&', valueStartIndex);
        if (valueEndIndex < 0)
        {
            return url[..valueStartIndex] + "***";
        }

        return url[..valueStartIndex] + "***" + url[valueEndIndex..];
    }

    private void ValidateOptions()
    {
        if (string.IsNullOrWhiteSpace(_options.TmnCode))
        {
            throw new InvalidOperationException("Missing required configuration: VnPay:TmnCode");
        }

        if (string.IsNullOrWhiteSpace(_options.HashSecret))
        {
            throw new InvalidOperationException("Missing required configuration: VnPay:HashSecret");
        }

        if (string.IsNullOrWhiteSpace(_options.PaymentUrl))
        {
            throw new InvalidOperationException("Missing required configuration: VnPay:PaymentUrl");
        }

        if (string.IsNullOrWhiteSpace(_options.ReturnUrl))
        {
            throw new InvalidOperationException("Missing required configuration: VnPay:ReturnUrl");
        }
    }


    private static Dictionary<string, string> NormalizeQuery(IQueryCollection query)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var item in query)
        {
            if (string.IsNullOrWhiteSpace(item.Key))
            {
                continue;
            }

            result[item.Key] = item.Value.ToString();
        }

        return result;
    }

    private static string BuildHashData(IEnumerable<KeyValuePair<string, string>> parameters)
    {
        return string.Join("&", parameters
            .Where(item => !string.IsNullOrWhiteSpace(item.Value))
            .OrderBy(item => item.Key, StringComparer.Ordinal)
            .Select(item => $"{WebUtility.UrlEncode(item.Key)}={WebUtility.UrlEncode(item.Value)}"));
    }

    private static string BuildRequestQuery(IEnumerable<KeyValuePair<string, string>> parameters)
    {
        return string.Join("&", parameters
            .Where(item => !string.IsNullOrWhiteSpace(item.Value))
            .OrderBy(item => item.Key, StringComparer.Ordinal)
            .Select(item => $"{WebUtility.UrlEncode(item.Key)}={WebUtility.UrlEncode(item.Value)}"));
    }

    private static string ComputeHmacSha512(string key, string inputData)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var inputBytes = Encoding.UTF8.GetBytes(inputData);
        using var hmac = new HMACSHA512(keyBytes);
        var hashBytes = hmac.ComputeHash(inputBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static DateTime GetVietnamNow()
    {
        try
        {
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        }
        catch (TimeZoneNotFoundException)
        {
            return DateTime.UtcNow.AddHours(7);
        }
        catch (InvalidTimeZoneException)
        {
            return DateTime.UtcNow.AddHours(7);
        }
    }

    private static long ExtractRegistrationId(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return 0;
        }

        foreach (var segment in note.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!segment.StartsWith("DKKH:", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var value = segment.Substring("DKKH:".Length);
            if (long.TryParse(value, out var registrationId))
            {
                return registrationId;
            }
        }

        return 0;
    }

    private static string ToApiPaymentStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "UNKNOWN";
        }

        return status.Trim().ToLowerInvariant() switch
        {
            "da_xac_nhan" => "PAID",
            "cho_xac_nhan" => "PENDING",
            "that_bai" => "FAILED",
            _ => status.Trim().ToUpperInvariant()
        };
    }
}
