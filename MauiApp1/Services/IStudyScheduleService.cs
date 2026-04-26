using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IStudyScheduleService
{
    Task<StudyScheduleOverview> GetOverviewAsync();
    Task<List<StudyScheduleItem>> GetUpcomingScheduleAsync();
}
