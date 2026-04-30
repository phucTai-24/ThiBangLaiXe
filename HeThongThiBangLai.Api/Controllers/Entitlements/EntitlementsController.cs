using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using HeThongThiBangLai.Api.Common.Responses;
using HeThongThiBangLai.Api.DTOs.Entitlements;
using HeThongThiBangLai.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeThongThiBangLai.Api.Controllers.Entitlements;

[ApiController]
[Route("api/v1/entitlements")]
[Authorize]
[Produces("application/json")]
public class EntitlementsController : ControllerBase
{
    private readonly IEntitlementPackageService _entitlementPackageService;
    private readonly IUserEntitlementService _userEntitlementService;

    public EntitlementsController(IEntitlementPackageService entitlementPackageService, IUserEntitlementService userEntitlementService)
    {
        _entitlementPackageService = entitlementPackageService;
        _userEntitlementService = userEntitlementService;
    }

    [HttpGet("packages")]
    [ProducesResponseType(typeof(ApiResponse<PagedList<EntitlementPackageDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPackages([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, [FromQuery] bool? isActive = null)
    {
        var result = await _entitlementPackageService.GetListAsync(page, pageSize, search, isActive);
        return Ok(result);
    }

    [HttpGet("packages/{id}")]
    [ProducesResponseType(typeof(ApiResponse<EntitlementPackageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPackageById(long id)
    {
        var result = await _entitlementPackageService.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("packages")]
    [ProducesResponseType(typeof(ApiResponse<EntitlementPackageDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreatePackage([FromBody] CreateEntitlementPackageRequestDto request)
    {
        var result = await _entitlementPackageService.CreateAsync(request);
        return CreatedAtAction(nameof(GetPackageById), new { id = result.Data?.Id }, result);
    }

    [HttpPut("packages/{id}")]
    [ProducesResponseType(typeof(ApiResponse<EntitlementPackageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePackage(long id, [FromBody] UpdateEntitlementPackageRequestDto request)
    {
        var result = await _entitlementPackageService.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("packages/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeletePackage(long id)
    {
        await _entitlementPackageService.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<PagedList<UserEntitlementDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyEntitlements([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetCurrentUserId();
        var result = await _userEntitlementService.GetListAsync(page, pageSize, userId, null);
        return Ok(result);
    }

    [HttpGet("user-entitlements")]
    [Authorize(Policy = "CanGrantEntitlement")]
    [ProducesResponseType(typeof(ApiResponse<PagedList<UserEntitlementDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserEntitlements([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] long? userId = null, [FromQuery] string? status = null)
    {
        var result = await _userEntitlementService.GetListAsync(page, pageSize, userId, status);
        return Ok(result);
    }

    [HttpGet("user-entitlements/{id}")]
    [ProducesResponseType(typeof(ApiResponse<UserEntitlementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserEntitlementById(long id)
    {
        var result = await _userEntitlementService.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("user-entitlements/grant")]
    [Authorize(Policy = "CanGrantEntitlement")]
    [ProducesResponseType(typeof(ApiResponse<UserEntitlementDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> GrantUserEntitlement([FromBody] GrantUserEntitlementRequestDto request)
    {
        var result = await _userEntitlementService.GrantAsync(request, GetCurrentUserId());
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPatch("user-entitlements/{id}/status")]
    [Authorize(Policy = "CanGrantEntitlement")]
    [ProducesResponseType(typeof(ApiResponse<UserEntitlementDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateUserEntitlementStatus(long id, [FromBody] UpdateUserEntitlementStatusRequestDto request)
    {
        var result = await _userEntitlementService.UpdateStatusAsync(id, request);
        return Ok(result);
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!long.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Token khong hop le hoac thieu thong tin nguoi dung.");

        return userId;
    }
}
