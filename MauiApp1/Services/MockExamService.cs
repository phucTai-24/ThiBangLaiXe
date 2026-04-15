using MauiApp1.Models;

namespace MauiApp1.Services;

public class MockExamService : IExamService
{
    private readonly List<Exam> _examHistory = new();

    public Task<Exam> GetExamAsync(string licenseType = "A1")
    {
        var exam = new Exam
        {
            Id = Guid.NewGuid().ToString(),
            Title = $"Đề thi thử {licenseType}",
            LicenseType = licenseType,
            TimeLimit = 1200,
            TimeRemaining = 1200,
            Questions = GenerateMockQuestions()
        };

        return Task.FromResult(exam);
    }

    public Task<Exam> GetExamByIdAsync(string examId)
    {
        var exam = _examHistory.FirstOrDefault(e => e.Id == examId);
        return Task.FromResult(exam ?? new Exam());
    }

    public Task<bool> SubmitExamAsync(Exam exam)
    {
        exam.IsCompleted = true;
        exam.EndTime = DateTime.Now;
        _examHistory.Add(exam);
        return Task.FromResult(true);
    }

    public Task<List<Exam>> GetExamHistoryAsync()
    {
        return Task.FromResult(_examHistory);
    }

    private List<Question> GenerateMockQuestions()
    {
        return new List<Question>
        {
            new Question
            {
                Id = "q1",
                Number = 1,
                Text = "Khái niệm 'phương tiện giao thông cơ giới đường bộ' được hiểu như thế nào?",
                Category = "Khái niệm và quy tắc",
                IsCritical = false,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q1a1", Label = "A", Text = "Gồm xe ô tô, máy kéo, xe mô tô hai bánh, xe mô tô ba bánh, xe gắn máy, xe cơ giới dùng cho người khuyết tật và các loại xe tương tự", IsCorrect = true },
                    new Answer { Id = "q1a2", Label = "B", Text = "Gồm xe ô tô, máy kéo, rơ moóc hoặc sơ mi rơ moóc được kéo bởi xe ô tô, máy kéo", IsCorrect = false },
                    new Answer { Id = "q1a3", Label = "C", Text = "Gồm tất cả các loại xe có động cơ chạy trên đường bộ", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q2",
                Number = 2,
                Text = "Người điều khiển phương tiện tham gia giao thông trong hầm đường bộ ngoài việc phải tuân thủ các quy tắc giao thông còn phải thực hiện những quy định nào dưới đây?",
                Category = "Quy tắc giao thông",
                IsCritical = true,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q2a1", Label = "A", Text = "Xe cơ giới, xe máy chuyên dùng phải bật đèn; xe thô sơ phải bật đèn hoặc có vật phát sáng báo hiệu; chỉ được dừng xe, đỗ xe ở nơi quy định", IsCorrect = true },
                    new Answer { Id = "q2a2", Label = "B", Text = "Xe cơ giới phải bật đèn ngay cả khi đường hầm sáng; phải cho xe chạy với tốc độ tối thiểu 5 km/h", IsCorrect = false },
                    new Answer { Id = "q2a3", Label = "C", Text = "Xe máy chuyên dùng phải bật đèn ngay cả khi đường hầm sáng; phải cho xe chạy với tốc độ tối đa 30 km/h", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q3",
                Number = 3,
                Text = "Trên đường có nhiều làn đường cho xe đi cùng chiều được phân biệt bằng vạch kẻ phân làn đường, người lái xe phải cho xe đi như thế nào?",
                Category = "Quy tắc giao thông",
                IsCritical = false,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q3a1", Label = "A", Text = "Cho xe đi trên bất kỳ làn đường nào nếu không có xe phía trước; khi cần thiết phải chuyển làn đường, người lái xe phải quan sát xe phía trước để đảm bảo an toàn", IsCorrect = false },
                    new Answer { Id = "q3a2", Label = "B", Text = "Phải cho xe đi trong một làn đường; khi cần thiết phải chuyển làn đường, người lái xe phải có tín hiệu báo trước và phải đảm bảo an toàn", IsCorrect = true },
                    new Answer { Id = "q3a3", Label = "C", Text = "Phải cho xe đi trong làn đường bên phải; khi cần thiết phải chuyển làn đường, người lái xe phải quan sát xe phía trước để đảm bảo an toàn", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q4",
                Number = 4,
                Text = "Khi điều khiển xe mô tô hai bánh, xe gắn máy, những hành vi nào dưới đây bị nghiêm cấm?",
                Category = "Quy tắc giao thông",
                IsCritical = true,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q4a1", Label = "A", Text = "Buông cả hai tay; sử dụng xe để kéo, đẩy xe khác, vật khác; sử dụng chân chống của xe quệt xuống đường khi xe đang chạy", IsCorrect = true },
                    new Answer { Id = "q4a2", Label = "B", Text = "Buông một tay; sử dụng xe để chở người hoặc hàng hóa; để chân chạm xuống đất khi xe đang chạy", IsCorrect = false },
                    new Answer { Id = "q4a3", Label = "C", Text = "Đội mũ bảo hiểm; chạy xe đúng tốc độ quy định và chấp hành đúng quy tắc giao thông đường bộ", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q5",
                Number = 5,
                Text = "Biển nào báo hiệu 'Giao nhau với đường ưu tiên'?",
                Category = "Biển báo giao thông",
                IsCritical = false,
                ImageUrl = "traffic_sign_priority.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q5a1", Label = "A", Text = "Biển 1", IsCorrect = false },
                    new Answer { Id = "q5a2", Label = "B", Text = "Biển 2", IsCorrect = true },
                    new Answer { Id = "q5a3", Label = "C", Text = "Biển 3", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q6",
                Number = 6,
                Text = "Biển nào cấm xe mô tô hai bánh đi vào?",
                Category = "Biển báo giao thông",
                IsCritical = false,
                ImageUrl = "traffic_sign_motorcycle.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q6a1", Label = "A", Text = "Biển 1", IsCorrect = true },
                    new Answer { Id = "q6a2", Label = "B", Text = "Biển 2", IsCorrect = false },
                    new Answer { Id = "q6a3", Label = "C", Text = "Biển 3", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q7",
                Number = 7,
                Text = "Khi gặp biển nào xe được phép quay đầu nhưng không được rẽ trái?",
                Category = "Biển báo giao thông",
                IsCritical = false,
                ImageUrl = "traffic_sign_turn.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q7a1", Label = "A", Text = "Biển 1", IsCorrect = false },
                    new Answer { Id = "q7a2", Label = "B", Text = "Biển 2", IsCorrect = true },
                    new Answer { Id = "q7a3", Label = "C", Text = "Không biển nào", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q8",
                Number = 8,
                Text = "Tại nơi đường giao nhau, khi đèn điều khiển giao thông có tín hiệu màu vàng, người điều khiển xe phải chấp hành như thế nào?",
                Category = "Quy tắc giao thông",
                IsCritical = true,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q8a1", Label = "A", Text = "Phải cho xe dừng lại trước vạch dừng, trường hợp đã đi quá vạch dừng hoặc đã quá gần vạch dừng nếu dừng lại thấy nguy hiểm thì được đi tiếp", IsCorrect = true },
                    new Answer { Id = "q8a2", Label = "B", Text = "Giảm tốc độ cho xe vượt qua nhanh trước khi đèn chuyển sang tín hiệu đỏ", IsCorrect = false },
                    new Answer { Id = "q8a3", Label = "C", Text = "Tăng tốc độ cho xe vượt qua nhanh trước khi đèn chuyển sang tín hiệu đỏ", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q9",
                Number = 9,
                Text = "Người lái xe phải làm gì khi điều khiển xe vào đường cao tốc?",
                Category = "Quy tắc giao thông",
                IsCritical = false,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q9a1", Label = "A", Text = "Phải có tín hiệu xin vào và phải nhường đường cho xe đang chạy trên đường, khi thấy an toàn mới cho xe nhập vào dòng xe ở làn đường sát mép ngoài", IsCorrect = true },
                    new Answer { Id = "q9a2", Label = "B", Text = "Phải có tín hiệu xin vào và phải nhường đường cho xe đang chạy trên đường, khi thấy an toàn mới cho xe nhập vào dòng xe ở làn đường phía trong", IsCorrect = false },
                    new Answer { Id = "q9a3", Label = "C", Text = "Quan sát xe phía trước và cho xe nhập vào dòng xe ở làn đường phù hợp", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q10",
                Number = 10,
                Text = "Khi điều khiển xe mô tô tay ga xuống đường dốc dài, độ dốc cao, người lái xe cần thực hiện các thao tác nào dưới đây để đảm bảo an toàn?",
                Category = "Kỹ thuật lái xe",
                IsCritical = false,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q10a1", Label = "A", Text = "Giữ tay ga ở mức độ phù hợp, sử dụng phanh trước và phanh sau để giảm tốc độ", IsCorrect = true },
                    new Answer { Id = "q10a2", Label = "B", Text = "Nhả hết tay ga, tắt động cơ, sử dụng phanh trước và phanh sau để giảm tốc độ", IsCorrect = false },
                    new Answer { Id = "q10a3", Label = "C", Text = "Sử dụng phanh trước để giảm tốc độ kết hợp với tắt chìa khóa điện của xe", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q11",
                Number = 11,
                Text = "Khi quay đầu xe, người lái xe cần phải quan sát và thực hiện các thao tác nào để đảm bảo an toàn giao thông?",
                Category = "Kỹ thuật lái xe",
                IsCritical = false,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q11a1", Label = "A", Text = "Quan sát biển báo hiệu để biết nơi được phép quay đầu; quan sát kỹ địa hình nơi chọn để quay đầu; lựa chọn quỹ đạo quay đầu xe cho thích hợp; quay đầu xe với tốc độ thấp; thường xuyên báo tín hiệu để người, xe xung quanh được biết; nếu quay đầu xe ở nơi nguy hiểm thì đưa đầu xe về phía nguy hiểm đưa đuôi xe về phía an toàn", IsCorrect = true },
                    new Answer { Id = "q11a2", Label = "B", Text = "Quan sát biển báo hiệu để biết nơi được phép quay đầu; quan sát kỹ địa hình nơi chọn để quay đầu; lựa chọn quỹ đạo quay đầu xe; quay đầu xe với tốc độ nhanh; thường xuyên báo tín hiệu để người, xe xung quanh được biết; nếu quay đầu xe ở nơi nguy hiểm thì đưa đuôi xe về phía nguy hiểm và đầu xe về phía an toàn", IsCorrect = false },
                    new Answer { Id = "q11a3", Label = "C", Text = "Không cần quan sát biển báo hiệu; quan sát kỹ địa hình nơi chọn để quay đầu; lựa chọn quỹ đạo quay đầu xe; quay đầu xe với tốc độ nhanh; thường xuyên báo tín hiệu để người, xe xung quanh được biết; nếu quay đầu xe ở nơi nguy hiểm thì đưa đuôi xe về phía nguy hiểm và đầu xe về phía an toàn", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q12",
                Number = 12,
                Text = "Để báo hiệu cho xe phía trước biết xe mô tô của bạn muốn vượt, bạn phải có tín hiệu như thế nào dưới đây?",
                Category = "Kỹ thuật lái xe",
                IsCritical = false,
                Answers = new List<Answer>
                {
                    new Answer { Id = "q12a1", Label = "A", Text = "Bật đèn sang trái, khi đủ điều kiện an toàn vượt qua xe phía trước", IsCorrect = false },
                    new Answer { Id = "q12a2", Label = "B", Text = "Bật đèn sang phải, khi đủ điều kiện an toàn vượt qua xe phía trước", IsCorrect = false },
                    new Answer { Id = "q12a3", Label = "C", Text = "Bật đèn pha hoặc đèn cos, khi đủ điều kiện an toàn vượt qua xe phía trước", IsCorrect = true }
                }
            },
            new Question
            {
                Id = "q13",
                Number = 13,
                Text = "Biển nào báo hiệu 'Đường hai chiều'?",
                Category = "Biển báo giao thông",
                IsCritical = false,
                ImageUrl = "traffic_sign_twoway.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q13a1", Label = "A", Text = "Biển 1", IsCorrect = true },
                    new Answer { Id = "q13a2", Label = "B", Text = "Biển 2", IsCorrect = false },
                    new Answer { Id = "q13a3", Label = "C", Text = "Biển 3", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q14",
                Number = 14,
                Text = "Biển nào chỉ dẫn nơi bắt đầu đoạn đường dành cho người đi bộ?",
                Category = "Biển báo giao thông",
                IsCritical = false,
                ImageUrl = "traffic_sign_pedestrian.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q14a1", Label = "A", Text = "Biển 1", IsCorrect = false },
                    new Answer { Id = "q14a2", Label = "B", Text = "Biển 2", IsCorrect = true },
                    new Answer { Id = "q14a3", Label = "C", Text = "Biển 3", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q15",
                Number = 15,
                Text = "Vạch kẻ đường nào dưới đây là vạch phân chia hai chiều xe chạy (vạch tim đường)?",
                Category = "Vạch kẻ đường",
                IsCritical = false,
                ImageUrl = "road_marking.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q15a1", Label = "A", Text = "Vạch 1", IsCorrect = true },
                    new Answer { Id = "q15a2", Label = "B", Text = "Vạch 2", IsCorrect = false },
                    new Answer { Id = "q15a3", Label = "C", Text = "Vạch 3", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q16",
                Number = 16,
                Text = "Xe nào được quyền đi trước trong trường hợp này?",
                Category = "Sa hình",
                IsCritical = false,
                ImageUrl = "situation_1.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q16a1", Label = "A", Text = "Mô tô", IsCorrect = true },
                    new Answer { Id = "q16a2", Label = "B", Text = "Xe con", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q17",
                Number = 17,
                Text = "Theo hướng mũi tên, những hướng nào xe mô tô được phép đi?",
                Category = "Sa hình",
                IsCritical = false,
                ImageUrl = "situation_2.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q17a1", Label = "A", Text = "Cả ba hướng", IsCorrect = false },
                    new Answer { Id = "q17a2", Label = "B", Text = "Hướng 1 và 2", IsCorrect = true },
                    new Answer { Id = "q17a3", Label = "C", Text = "Hướng 1 và 3", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q18",
                Number = 18,
                Text = "Trong tình huống dưới đây, xe nào được quyền đi trước?",
                Category = "Sa hình",
                IsCritical = false,
                ImageUrl = "situation_3.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q18a1", Label = "A", Text = "Xe con", IsCorrect = false },
                    new Answer { Id = "q18a2", Label = "B", Text = "Xe mô tô", IsCorrect = true }
                }
            },
            new Question
            {
                Id = "q19",
                Number = 19,
                Text = "Trong tình huống dưới đây, thứ tự xe đi như thế nào là đúng quy tắc giao thông?",
                Category = "Sa hình",
                IsCritical = false,
                ImageUrl = "situation_4.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q19a1", Label = "A", Text = "Xe con, xe mô tô, xe tải", IsCorrect = false },
                    new Answer { Id = "q19a2", Label = "B", Text = "Xe mô tô, xe tải, xe con", IsCorrect = true },
                    new Answer { Id = "q19a3", Label = "C", Text = "Xe tải, xe mô tô, xe con", IsCorrect = false }
                }
            },
            new Question
            {
                Id = "q20",
                Number = 20,
                Text = "Các xe đi theo hướng mũi tên, xe nào vi phạm quy tắc giao thông?",
                Category = "Sa hình",
                IsCritical = false,
                ImageUrl = "situation_5.png",
                Answers = new List<Answer>
                {
                    new Answer { Id = "q20a1", Label = "A", Text = "Xe con, xe tải, xe khách", IsCorrect = false },
                    new Answer { Id = "q20a2", Label = "B", Text = "Xe tải, xe khách, xe mô tô", IsCorrect = false },
                    new Answer { Id = "q20a3", Label = "C", Text = "Xe khách, xe mô tô, xe con", IsCorrect = true }
                }
            }
        };
    }
}
