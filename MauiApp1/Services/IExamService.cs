using MauiApp1.Models.Exams;
using MauiApp1.Models;

namespace MauiApp1.Services;

public interface IExamService
{
    Task<List<SampleExamItem>> GetSampleExamsAsync(CancellationToken cancellationToken = default);
    Task<Exam> GetExamAsync(string sampleExamId = "1");
    Task<Exam> GetExamByIdAsync(string examId);
    Task<bool> SaveAnswerAsync(string sessionId, long questionId, long answerId, CancellationToken cancellationToken = default);
    Task<bool> SubmitExamAsync(Exam exam);
    Task<List<Exam>> GetExamHistoryAsync();
}
