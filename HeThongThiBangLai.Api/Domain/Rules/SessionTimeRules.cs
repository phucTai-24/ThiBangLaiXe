using HeThongThiBangLai.Api.Domain.Constants;

namespace HeThongThiBangLai.Api.Domain.Rules;

public interface ISessionTimeRules
{
    bool IsSessionExpired(DateTime startTime, int durationMinutes);
    TimeSpan GetRemainingTime(DateTime startTime, int durationMinutes);
}

public class SessionTimeRules : ISessionTimeRules
{
    public bool IsSessionExpired(DateTime startTime, int durationMinutes)
    {
        var expiryTime = startTime.AddMinutes(durationMinutes);
        return DateTime.UtcNow > expiryTime;
    }

    public TimeSpan GetRemainingTime(DateTime startTime, int durationMinutes)
    {
        var remaining = startTime.AddMinutes(durationMinutes) - DateTime.UtcNow;
        return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
    }
}
