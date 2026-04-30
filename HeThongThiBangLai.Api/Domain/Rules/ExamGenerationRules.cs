namespace HeThongThiBangLai.Api.Domain.Rules;

public interface IExamGenerationRules
{
    bool CanGenerateExam(int availableQuestions, int requiredQuestions);
    bool ValidateTopicDistribution(Dictionary<long, int> topicRequirements, Dictionary<long, int> availableQuestions);
}

public class ExamGenerationRules : IExamGenerationRules
{
    public bool CanGenerateExam(int availableQuestions, int requiredQuestions)
    {
        return availableQuestions >= requiredQuestions;
    }

    public bool ValidateTopicDistribution(
        Dictionary<long, int> topicRequirements, 
        Dictionary<long, int> availableQuestions)
    {
        foreach (var requirement in topicRequirements)
        {
            if (!availableQuestions.TryGetValue(requirement.Key, out var available) 
                || available < requirement.Value)
            {
                return false;
            }
        }
        return true;
    }
}
