using HeThongThiBangLai.Api.Domain.Constants;

namespace HeThongThiBangLai.Api.Domain.Rules;

public interface IExamScoringRules
{
    bool IsPassing(int correctAnswers, int totalQuestions);
    bool HasCriticalQuestionFailure(List<long> criticalQuestionIds, List<long> incorrectQuestionIds);
}

public class ExamScoringRules : IExamScoringRules
{
    public bool IsPassing(int correctAnswers, int totalQuestions)
    {
        if (totalQuestions == 0) return false;
        
        var percentage = (correctAnswers * 100.0) / totalQuestions;
        return percentage >= ExamConstants.PassingScorePercentage;
    }

    public bool HasCriticalQuestionFailure(List<long> criticalQuestionIds, List<long> incorrectQuestionIds)
    {
        if (criticalQuestionIds.Count == 0) return false;
        
        return criticalQuestionIds.Any(cqId => incorrectQuestionIds.Contains(cqId));
    }
}
