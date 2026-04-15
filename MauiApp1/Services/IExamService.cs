using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IExamService
{
    Task<Exam> GetExamAsync(string licenseType = "A1");
    Task<Exam> GetExamByIdAsync(string examId);
    Task<bool> SubmitExamAsync(Exam exam);
    Task<List<Exam>> GetExamHistoryAsync();
}
