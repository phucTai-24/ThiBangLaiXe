using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MauiApp1.Models.Auth;
using MauiApp1.Models.Entitlements;
using MauiApp1.Models.Exams;

namespace MauiApp1.Services;

public sealed class ApiEntitlementService : IEntitlementService
{
    private readonly HttpClient _httpClient;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiEntitlementService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<EntitlementPackageItem>> GetPackagesAsync()
    {
        await AttachAuthHeaderAsync();

        var wrapped = await GetWithFallbackAsync<ApiResponse<PagedResponse<EntitlementPackageDto>>>(
            "api/v1/entitlements/packages?page=1&pageSize=50&isActive=true");

        if (wrapped?.Data?.Items is { Count: > 0 } items)
        {
            return items.Select(x => new EntitlementPackageItem
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                Description = x.Description ?? "Gói học theo hệ thống",
                IsActive = x.IsActive,
                IsRegistered = false
            }).ToList();
        }

        return new List<EntitlementPackageItem>();
    }

    public async Task RegisterPackageAsync(long packageId)
    {
        await AttachAuthHeaderAsync();

        var userIdText = await SecureStorage.Default.GetAsync("user_id");
        if (!long.TryParse(userIdText, out var userId) || userId <= 0)
            throw new InvalidOperationException("Không tìm thấy user_id hợp lệ để đăng ký khóa học.");

        var payload = new GrantUserEntitlementRequestDto
        {
            UserId = userId,
            PackageId = packageId,
            EffectiveFrom = DateTime.UtcNow,
            ExpiresAt = null,
            Source = "mobile_app",
            Note = "Đăng ký từ dashboard học viên"
        };

        var response = await _httpClient.PostAsJsonAsync("api/v1/entitlements/user-entitlements/grant", payload);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Đăng ký khóa học thất bại ({(int)response.StatusCode}): {body}");
        }
    }

    private async Task<T?> GetWithFallbackAsync<T>(params string[] endpoints) where T : class
    {
        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);
                if (!response.IsSuccessStatusCode)
                    continue;

                var content = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrWhiteSpace(content))
                    continue;

                var parsed = JsonSerializer.Deserialize<T>(content, JsonOptions);
                if (parsed is not null)
                    return parsed;
            }
            catch
            {
                // ignore and try next endpoint
            }
        }

        return default;
    }

    private async Task AttachAuthHeaderAsync()
    {
        var token = await SecureStorage.Default.GetAsync("access_token");
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Bạn chưa đăng nhập hoặc phiên đã hết hạn.");

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private sealed class EntitlementPackageDto
    {
        public long Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }

    private sealed class GrantUserEntitlementRequestDto
    {
        public long UserId { get; set; }
        public long PackageId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string Source { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}

