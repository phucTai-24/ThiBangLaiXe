using System.Net.Http.Json;
using System.Text.Json;
using MauiApp1.Models;

namespace MauiApp1.Services;

public sealed class ChatService : IChatService
{
    private const string GeminiApiKeyPreferenceKey = "Gemini.ApiKey";
    private const string PolitePivot = "Mình tập trung hỗ trợ ôn thi bằng lái: biển báo, câu điểm liệt, sa hình/tình huống và mẹo học. Bạn hỏi theo các chủ đề đó để mình giúp chính xác hơn nhé!";

    private static readonly string[] PracticeActionKeywords =
    {
        "tạo",
        "tao",
        "create",
        "make",
        "generate",
        "làm",
        "lam",
        "làm bài",
        "lam bai",
        "học",
        "hoc",
        "luyện",
        "luyen",
        "ôn",
        "on",
        "test",
        "practice",
        "bắt đầu",
        "bat dau",
        "cho tôi",
        "cho toi",
        "giúp tôi",
        "giup toi"
    };

    private static readonly string[] PracticeTopicKeywords =
    {
        "biển báo",
        "bien bao",
        "báo hiệu",
        "bao hieu",
        "traffic sign",
        "sa hình",
        "sa hinh",
        "mô phỏng",
        "mo phong",
        "tình huống",
        "tinh huong",
        "simulation",
        "điểm liệt",
        "diem liet",
        "câu liệt",
        "cau liet",
        "câu sai",
        "cau sai",
        "hay sai"
    };

    private static readonly string[] GeminiApiVersions =
    {
        "v1beta",
        "v1"
    };

    private static readonly string[] GeminiModels =
    {
        // Theo yêu cầu hiện tại: thử model gemini-2.0-flash-001.
        "gemini-2.0-flash-001"
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;

    public ChatService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string> SendChatMessageAsync(string userMessage, IReadOnlyList<ChatHistoryMessage> history, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userMessage))
            return SerializeAiResponse(AiResponse.CreateBusyFallback("Tin nhắn người dùng rỗng."));

        if (IsSmallTalk(userMessage))
            return SerializeAiResponse(new AiResponse
            {
                Type = AiResponse.ChatType,
                Message = "Chào bạn 👋. Bạn muốn ôn biển báo, câu điểm liệt, sa hình/tình huống hay tạo phiên luyện tập hôm nay?",
                Practice = null
            });

        var wantsPracticeSession = ShouldCreatePracticeSession(userMessage);
        if (!wantsPracticeSession && !IsOnTopic(userMessage))
            return SerializeAiResponse(new AiResponse
            {
                Type = AiResponse.ChatType,
                Message = PolitePivot,
                Practice = null
            });

        var geminiKey = Preferences.Get(GeminiApiKeyPreferenceKey, string.Empty);
        if (string.IsNullOrWhiteSpace(geminiKey))
            return SerializeAiResponse(CreateLocalResponse(userMessage, wantsPracticeSession));

        var geminiResponse = await TryCallGeminiAsync(userMessage, history, geminiKey, wantsPracticeSession, cancellationToken);
        return geminiResponse.IsSuccess && !string.IsNullOrWhiteSpace(geminiResponse.Content)
            ? geminiResponse.Content
            : SerializeAiResponse(CreateLocalResponse(userMessage, wantsPracticeSession, geminiResponse.ErrorMessage));
    }

    public AiResponse ParseAiResponse(string aiResponseJson)
    {
        try
        {
            var json = ExtractJsonObject(aiResponseJson);
            var response = JsonSerializer.Deserialize<AiResponse>(json, JsonOptions);
            return NormalizeAiResponse(response);
        }
        catch
        {
            return string.IsNullOrWhiteSpace(aiResponseJson)
                ? AiResponse.CreateBusyFallback("AI response rỗng trước khi parse.")
                : new AiResponse
                {
                    Type = AiResponse.ChatType,
                    Message = aiResponseJson.Trim(),
                    Practice = null
                };
        }
    }

    private async Task<GeminiCallResult> TryCallGeminiAsync(string userMessage, IReadOnlyList<ChatHistoryMessage> history, string apiKey, bool wantsPracticeSession, CancellationToken cancellationToken)
    {
        try
        {
            var payload = BuildGeminiRequestPayload(userMessage, history, wantsPracticeSession);
            var attemptedErrors = new List<string>();

            foreach (var apiVersion in GeminiApiVersions)
            {
                foreach (var model in GeminiModels)
                {
                    var parsed = await CallGeminiModelAsync(apiVersion, model, apiKey, payload, cancellationToken);
                    if (parsed.IsSuccess && !string.IsNullOrWhiteSpace(parsed.Content))
                        return parsed;

                    attemptedErrors.Add(parsed.ErrorMessage ?? $"{apiVersion}/{model}: response rỗng.");
                }
            }

            return GeminiCallResult.Fail($"Không có Gemini model nào khả dụng cho key hiện tại. Đã thử: {string.Join(" | ", attemptedErrors)}");
        }
        catch (Exception ex)
        {
            return GeminiCallResult.Fail($"Exception khi gọi Gemini: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private async Task<GeminiCallResult> CallGeminiModelAsync(string apiVersion, string model, string apiKey, object payload, CancellationToken cancellationToken)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/{apiVersion}/models/{model}:generateContent?key={Uri.EscapeDataString(apiKey)}";
        using var response = await SendWithRateLimitBackoffAsync(endpoint, payload, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            var statusCode = (int)response.StatusCode;

            if (errorBody.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase)
                || errorBody.Contains("API key expired", StringComparison.OrdinalIgnoreCase)
                || errorBody.Contains("invalid API key", StringComparison.OrdinalIgnoreCase))
            {
                return GeminiCallResult.Fail($"{apiVersion}/{model}: API key không hợp lệ hoặc đã hết hạn. Vào Cài đặt -> Gemini API Key để dán key mới từ AI Studio.");
            }

            if (statusCode == 403
                || errorBody.Contains("PERMISSION_DENIED", StringComparison.OrdinalIgnoreCase)
                || errorBody.Contains("permission", StringComparison.OrdinalIgnoreCase))
            {
                return GeminiCallResult.Fail($"{apiVersion}/{model}: Key hợp lệ nhưng chưa có quyền dùng model này (hoặc project chưa bật Generative Language API / billing). Thử model khác hoặc kiểm tra quyền project trên Google Cloud.");
            }

            if (statusCode == 429 || errorBody.Contains("rate", StringComparison.OrdinalIgnoreCase))
                return GeminiCallResult.Fail($"{apiVersion}/{model}: Bạn hỏi hơi nhanh rồi. Chờ vài giây rồi hỏi tiếp giúp mình nhé.");

            if (statusCode == 503 || errorBody.Contains("UNAVAILABLE", StringComparison.OrdinalIgnoreCase))
                return GeminiCallResult.Fail($"{apiVersion}/{model}: Máy chủ Gemini đang đông người dùng.");

            if (statusCode is 404 or 410)
                return GeminiCallResult.Fail($"{apiVersion}/{model}: model không khả dụng cho key hiện tại.");

            return GeminiCallResult.Fail($"{apiVersion}/{model}: HTTP {statusCode} {response.ReasonPhrase}. Body: {TrimForDebug(errorBody)}");
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        return ParseGeminiResponse(document, apiVersion, model);
    }

    private async Task<HttpResponseMessage> SendWithRateLimitBackoffAsync(string endpoint, object payload, CancellationToken cancellationToken)
    {
        var delays = new[] { 0, 1200, 2500, 5000 }; // ms
        HttpResponseMessage? lastResponse = null;

        for (var attempt = 0; attempt < delays.Length; attempt++)
        {
            if (attempt > 0)
                await Task.Delay(delays[attempt], cancellationToken);

            lastResponse?.Dispose();
            lastResponse = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);

            if ((int)lastResponse.StatusCode != 429)
                return lastResponse;
        }

        return lastResponse!;
    }

    private static object BuildGeminiRequestPayload(string userMessage, IReadOnlyList<ChatHistoryMessage> history, bool wantsPracticeSession)
    {
        var systemPrompt = BuildSystemPrompt(wantsPracticeSession);
        var contents = BuildGeminiContents(userMessage, history);

        // Đưa system prompt vào đầu hội thoại như user text để tương thích rộng với nhiều model/version.
        contents.Insert(0, new
        {
            role = "user",
            parts = new[]
            {
                new { text = systemPrompt }
            }
        });

        return new
        {
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 360
            },
            contents
        };
    }

    private static List<object> BuildGeminiContents(string userMessage, IReadOnlyList<ChatHistoryMessage> history)
    {
        var recentHistory = history
            .Where(message => !string.IsNullOrWhiteSpace(message.Text))
            .TakeLast(10)
            .ToList();

        var firstUserIndex = recentHistory.FindIndex(message => message.IsFromUser);
        if (firstUserIndex > 0)
            recentHistory = recentHistory.Skip(firstUserIndex).ToList();
        else if (firstUserIndex < 0)
            recentHistory.Clear();

        if (recentHistory.Count == 0 || !string.Equals(recentHistory[^1].Text.Trim(), userMessage.Trim(), StringComparison.Ordinal))
        {
            recentHistory.Add(new ChatHistoryMessage
            {
                Text = userMessage.Trim(),
                IsFromUser = true
            });
        }

        return recentHistory
            .Select(message => (object)new
            {
                role = message.IsFromUser ? "user" : "model",
                parts = new[]
                {
                    new { text = message.Text.Trim() }
                }
            })
            .ToList();
    }

    private static GeminiCallResult ParseGeminiResponse(JsonDocument document, string apiVersion, string model)
    {
        if (document.RootElement.TryGetProperty("promptFeedback", out var promptFeedback)
            && promptFeedback.TryGetProperty("blockReason", out var blockReason)
            && !string.IsNullOrWhiteSpace(blockReason.GetString()))
        {
            return GeminiCallResult.Fail($"{apiVersion}/{model}: Gemini chặn prompt vì {blockReason.GetString()}.");
        }

        if (!document.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return GeminiCallResult.Fail($"{apiVersion}/{model}: Gemini response không có candidates. Body: {TrimForDebug(document.RootElement.GetRawText())}");

        var candidate = candidates[0];
        if (candidate.TryGetProperty("finishReason", out var finishReason) && string.Equals(finishReason.GetString(), "SAFETY", StringComparison.OrdinalIgnoreCase))
            return GeminiCallResult.Fail($"{apiVersion}/{model}: Gemini chặn vì safety. Body: {TrimForDebug(candidate.GetRawText())}");

        if (!candidate.TryGetProperty("content", out var content)
            || !content.TryGetProperty("parts", out var parts)
            || parts.GetArrayLength() == 0
            || !parts[0].TryGetProperty("text", out var text))
        {
            return GeminiCallResult.Fail($"{apiVersion}/{model}: Gemini response thiếu content.parts[0].text. Body: {TrimForDebug(document.RootElement.GetRawText())}");
        }

        var resultText = text.GetString();
        return string.IsNullOrWhiteSpace(resultText)
            ? GeminiCallResult.Fail($"{apiVersion}/{model}: Gemini content text rỗng. Body: {TrimForDebug(document.RootElement.GetRawText())}")
            : GeminiCallResult.Ok(resultText);
    }

    private static string BuildSystemPrompt(bool wantsPracticeSession)
    {
        if (wantsPracticeSession)
        {
            return """
Bạn là trợ lý AI tiếng Việt trong app ôn thi bằng lái xe.

Yêu cầu người dùng đã được app phân loại là TẠO PHIÊN LUYỆN TẬP.
Chỉ trả về JSON hợp lệ, không giải thích, không markdown.

JSON format:
{
  "type": "practice",
  "message": "...",
  "practice": {
    "topic": "traffic_sign | simulation | critical",
    "source": "wrong | random",
    "questionCount": number
  }
}

Mapping rules:
- 'biển báo', 'bien bao', 'báo hiệu', 'bao hieu' → topic = traffic_sign
- 'sa hình', 'sa hinh', 'tình huống', 'tinh huong', 'mô phỏng', 'mo phong' → topic = simulation
- 'điểm liệt', 'diem liet', 'câu liệt', 'cau liet' → topic = critical
- 'hay sai', 'ôn sai', 'on sai', 'câu sai', 'cau sai' → source = wrong
- otherwise source = random
- If the user says a number, use that number for questionCount.
- If no number is requested, use questionCount = 20.
- Clamp questionCount to the range 1..100.
""";
        }

        return """
Bạn là trợ lý AI tiếng Việt trong app ôn thi bằng lái xe.

Nhiệm vụ:
- Hiểu tiếng Việt tự nhiên, kể cả không dấu, viết tắt, sai chính tả nhẹ.
- Chỉ hỗ trợ học lý thuyết lái xe: biển báo, câu điểm liệt, sa hình/tình huống, mẹo học và luật giao thông cơ bản.
- Trả lời tự nhiên như gia sư, bám sát đúng câu người dùng vừa hỏi.
- Nếu là câu hỏi đúng/sai hoặc được/không được (ví dụ: "biển cấm rẽ trái có được quay đầu không"), phải trả lời trực tiếp ngay ở câu đầu: "Được" hoặc "Không được", rồi mới giải thích ngắn.
- Ưu tiên nêu căn cứ theo nhóm biển báo hoặc nguyên tắc giao thông cốt lõi, không trả lời chung chung.
- Trả lời ngắn gọn 2-5 câu, rõ ràng, ưu tiên gạch đầu dòng khi cần.
- Nếu câu hỏi lạc đề, lịch sự kéo về chủ đề ôn thi bằng lái.
- Nếu thiếu dữ kiện (không thấy hình biển cụ thể), nói rõ giả định hợp lý trước khi trả lời.

App đã phân loại tin nhắn này là CHAT thường, không phải tạo phiên luyện tập.
Luôn trả về JSON hợp lệ, không giải thích ngoài JSON, không markdown.

JSON format:
{
  "type": "chat",
  "message": "...",
  "practice": null
}
""";
    }

    private static bool ShouldCreatePracticeSession(string userMessage)
    {
        var normalized = NormalizeText(userMessage);
        var hasActionKeyword = PracticeActionKeywords.Any(keyword => normalized.Contains(NormalizeText(keyword), StringComparison.Ordinal));
        var hasTopicKeyword = PracticeTopicKeywords.Any(keyword => normalized.Contains(NormalizeText(keyword), StringComparison.Ordinal));
        return hasActionKeyword && hasTopicKeyword;
    }

    private static bool IsSmallTalk(string text)
    {
        var normalized = NormalizeText(text);
        var smallTalkKeywords = new[]
        {
            "xin chao",
            "chao",
            "hello",
            "hi",
            "alo",
            "cam on",
            "thanks",
            "thank you",
            "ok",
            "oke",
            "okay",
            "tam biet",
            "bye",
            "goodbye",
            "haha",
            "hihi"
        };

        return smallTalkKeywords.Any(keyword => normalized == keyword || normalized.StartsWith(keyword + " ", StringComparison.Ordinal));
    }

    private static bool IsOnTopic(string text)
    {
        var normalized = NormalizeText(text);
        var topicKeywords = new[]
        {
            "bang lai",
            "lai xe",
            "giao thong",
            "luat",
            "bien bao",
            "bao hieu",
            "bien cam",
            "bien nguy hiem",
            "bien hieu lenh",
            "bien chi dan",
            "diem liet",
            "cau liet",
            "sa hinh",
            "mo phong",
            "tinh huong",
            "toc do",
            "nong do con",
            "ma tuy",
            "duong sat",
            "nhuong duong",
            "uu tien",
            "den tin hieu",
            "ly thuyet",
            "meo hoc",
            "on thi",
            "thi thu",
            "luyen",
            "cau hoi",
            "dap an",
            "a1",
            "a2",
            "b1",
            "b2"
        };

        return topicKeywords.Any(keyword => normalized.Contains(keyword, StringComparison.Ordinal));
    }

    private static AiResponse CreateLocalResponse(string userMessage, bool wantsPracticeSession, string? debugReason = null)
    {
        if (wantsPracticeSession)
        {
            return new AiResponse
            {
                Type = AiResponse.PracticeType,
                Message = "Mình sẽ tạo phiên luyện tập phù hợp cho bạn.",
                Practice = CreateHeuristicPracticeRequest(userMessage)
            };
        }

        return new AiResponse
        {
            Type = AiResponse.ChatType,
            Message = CreateLocalChatReply(userMessage, debugReason),
            Practice = null
        };
    }

    private static PracticeRequest CreateHeuristicPracticeRequest(string userMessage)
    {
        var normalized = NormalizeText(userMessage);
        var request = PracticeRequest.CreateDefault();

        if (ContainsAny(normalized, "diem liet", "cau liet", "critical"))
            request.Topic = "critical";
        else if (ContainsAny(normalized, "sa hinh", "mo phong", "tinh huong", "simulation"))
            request.Topic = "simulation";
        else
            request.Topic = "traffic_sign";

        request.Source = ContainsAny(normalized, "hay sai", "on sai", "cau sai", "wrong") ? "wrong" : PracticeRequest.DefaultSource;
        request.QuestionCount = ExtractRequestedQuestionCount(normalized);
        return NormalizePracticeRequest(request);
    }

    private static string CreateLocalChatReply(string userMessage, string? debugReason)
    {
        var normalized = NormalizeText(userMessage);
        string reply;

        if (ContainsAny(normalized, "xin chao", "hello", "hi", "chao"))
            reply = "Chào bạn! Mình có thể giải thích biển báo, câu điểm liệt, sa hình và gợi ý cách ôn thi bằng lái.";
        else if (ContainsAny(normalized, "bien bao", "bao hieu", "bien cam", "bien nguy hiem"))
            reply = "Với biển báo, bạn nên nhớ theo nhóm: biển cấm thường viền đỏ, biển nguy hiểm hình tam giác vàng, biển hiệu lệnh nền xanh và biển chỉ dẫn thường nền xanh lam.";
        else if (ContainsAny(normalized, "diem liet", "cau liet"))
            reply = "Câu điểm liệt là nhóm câu bắt buộc phải đúng. Khi ôn, hãy ưu tiên các nội dung về nồng độ cồn, ma túy, tốc độ, đường sắt, nhường đường và hành vi bị nghiêm cấm.";
        else if (ContainsAny(normalized, "sa hinh", "mo phong", "tinh huong"))
            reply = "Với sa hình/tình huống, hãy xét thứ tự ưu tiên: xe ưu tiên, biển báo/đèn tín hiệu, đường ưu tiên, bên phải không vướng, rồi hướng rẽ.";
        else
            reply = "Bạn có thể hỏi mình về mẹo học lý thuyết, biển báo, câu điểm liệt hoặc nhập như: 'luyện 20 câu biển báo' để tạo phiên ôn tập.";

        return string.IsNullOrWhiteSpace(debugReason) ? reply : $"{reply}\n\n[Debug] {BuildCompactDebugMessage(debugReason)}";
    }

    private static string BuildCompactDebugMessage(string debugReason)
    {
        if (string.IsNullOrWhiteSpace(debugReason))
            return "unknown";

        var normalized = debugReason.Replace("\r", " ").Replace("\n", " ");

        // Nếu là lỗi tổng hợp sau khi fallback nhiều model, lấy lỗi đầu tiên để phản ánh đúng nguyên nhân gốc.
        const string attemptedMarker = "Đã thử:";
        var attemptedIndex = normalized.IndexOf(attemptedMarker, StringComparison.OrdinalIgnoreCase);
        if (attemptedIndex >= 0)
        {
            var attempted = normalized[(attemptedIndex + attemptedMarker.Length)..].Trim();
            var firstError = attempted.Split("|", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(firstError))
                normalized = firstError;
        }

        if (normalized.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("API key expired", StringComparison.OrdinalIgnoreCase))
            return "API_KEY_INVALID";

        if (normalized.Contains("không hợp lệ", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("het han", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("hết hạn", StringComparison.OrdinalIgnoreCase))
            return "API_KEY_INVALID";

        if (normalized.Contains("INVALID_ARGUMENT", StringComparison.OrdinalIgnoreCase))
        {
            var message = ExtractGoogleErrorMessage(normalized);
            return string.IsNullOrWhiteSpace(message)
                ? "INVALID_ARGUMENT"
                : $"INVALID_ARGUMENT: {message}";
        }

        if (normalized.Contains("không có candidates", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("thiếu content.parts", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("content text rỗng", StringComparison.OrdinalIgnoreCase))
            return "INVALID_RESPONSE_FORMAT";

        if (normalized.Contains("PERMISSION_DENIED", StringComparison.OrdinalIgnoreCase))
            return "PERMISSION_DENIED";

        if (normalized.Contains("chưa có quyền", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("billing", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("Generative Language API", StringComparison.OrdinalIgnoreCase))
            return "PERMISSION_DENIED";

        if (normalized.Contains("MODEL_NOT_FOUND", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("not found", StringComparison.OrdinalIgnoreCase))
            return "MODEL_NOT_FOUND";

        if (normalized.Contains("model không khả dụng", StringComparison.OrdinalIgnoreCase))
            return "MODEL_NOT_AVAILABLE";

        if (normalized.Contains("UNAVAILABLE", StringComparison.OrdinalIgnoreCase))
            return "UNAVAILABLE";

        if (normalized.Contains("rate", StringComparison.OrdinalIgnoreCase))
            return "RATE_LIMIT";

        if (normalized.Contains("hỏi hơi nhanh", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("cho vai giay", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("chờ vài giây", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("hoi nhanh", StringComparison.OrdinalIgnoreCase))
            return "RATE_LIMIT";

        if (normalized.Contains("Exception khi gọi Gemini", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("Exception", StringComparison.OrdinalIgnoreCase))
        {
            var compactException = normalized;
            if (compactException.Length > 120)
                compactException = compactException[..120] + "...";
            return $"EXCEPTION: {compactException}";
        }

        var reasonMatch = System.Text.RegularExpressions.Regex.Match(
            normalized,
            "\"reason\"\\s*:\\s*\"([A-Z0-9_]+)\"",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (reasonMatch.Success)
            return reasonMatch.Groups[1].Value.ToUpperInvariant();

        var httpMatch = System.Text.RegularExpressions.Regex.Match(normalized, @"\bHTTP\s+(\d{3})\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (httpMatch.Success)
            return $"HTTP {httpMatch.Groups[1].Value}";

        // Fallback cuối: luôn trả về mẩu lỗi gốc rút gọn để không bị mù thông tin.
        var compact = normalized.Trim();
        if (compact.Length > 120)
            compact = compact[..120] + "...";
        return string.IsNullOrWhiteSpace(compact) ? "UNKNOWN_ERROR" : $"UNKNOWN_ERROR: {compact}";
    }

    private static string? ExtractGoogleErrorMessage(string normalized)
    {
        if (string.IsNullOrWhiteSpace(normalized))
            return null;

        var msgMatch = System.Text.RegularExpressions.Regex.Match(
            normalized,
            "\"message\"\\s*:\\s*\"([^\"]+)\"",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        if (!msgMatch.Success)
            return null;

        var message = msgMatch.Groups[1].Value.Trim();
        if (message.Length > 90)
            message = message[..90] + "...";

        return message;
    }

    private static int ExtractRequestedQuestionCount(string normalizedMessage)
    {
        var match = System.Text.RegularExpressions.Regex.Match(normalizedMessage, @"\b\d{1,3}\b");
        if (!match.Success || !int.TryParse(match.Value, out var count))
            return PracticeRequest.DefaultQuestionCount;

        return Math.Clamp(count, 1, 100);
    }

    private static bool ContainsAny(string normalizedValue, params string[] keywords)
    {
        return keywords.Any(keyword => normalizedValue.Contains(keyword, StringComparison.Ordinal));
    }

    private static AiResponse NormalizeAiResponse(AiResponse? response)
    {
        if (response == null)
            return AiResponse.CreateBusyFallback();

        response.Type = string.Equals(response.Type, AiResponse.PracticeType, StringComparison.OrdinalIgnoreCase)
            ? AiResponse.PracticeType
            : AiResponse.ChatType;

        if (string.IsNullOrWhiteSpace(response.Message))
            response.Message = response.Type == AiResponse.PracticeType
                ? "Mình sẽ tạo phiên luyện tập phù hợp cho bạn."
                : "Hiện tại AI đang bận, bạn thử lại sau nhé!";

        if (response.Type == AiResponse.PracticeType)
            response.Practice = NormalizePracticeRequest(response.Practice);
        else
            response.Practice = null;

        return response;
    }

    private static PracticeRequest NormalizePracticeRequest(PracticeRequest? request)
    {
        request ??= PracticeRequest.CreateDefault();
        request.Action = PracticeRequest.DefaultAction;
        request.Topic = request.Topic?.Trim().ToLowerInvariant() switch
        {
            "simulation" or "critical" or "traffic_sign" => request.Topic.Trim().ToLowerInvariant(),
            "traffic-sign" or "traffic signs" or "traffic_signs" => "traffic_sign",
            _ => PracticeRequest.DefaultTopic
        };
        request.Source = string.Equals(request.Source, "wrong", StringComparison.OrdinalIgnoreCase) ? "wrong" : PracticeRequest.DefaultSource;
        request.QuestionCount = request.QuestionCount is >= 1 and <= 100 ? request.QuestionCount : PracticeRequest.DefaultQuestionCount;
        return request;
    }

    private static string ExtractJsonObject(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return SerializeAiResponse(AiResponse.CreateBusyFallback("AI response rỗng trước khi parse."));

        var raw = value.Trim();

        // Bóc code fence nếu model trả về ```json ... ```
        if (raw.StartsWith("```", StringComparison.Ordinal))
        {
            var firstLineEnd = raw.IndexOf('\n');
            if (firstLineEnd > 0)
                raw = raw[(firstLineEnd + 1)..];

            var fenceEnd = raw.LastIndexOf("```", StringComparison.Ordinal);
            if (fenceEnd > 0)
                raw = raw[..fenceEnd];
        }

        // Tìm object JSON cân bằng dấu ngoặc nhọn đầu tiên.
        var start = raw.IndexOf('{');
        if (start < 0)
            return raw;

        var depth = 0;
        var inString = false;
        var escaped = false;

        for (var i = start; i < raw.Length; i++)
        {
            var ch = raw[i];

            if (inString)
            {
                if (escaped)
                {
                    escaped = false;
                    continue;
                }

                if (ch == '\\')
                {
                    escaped = true;
                    continue;
                }

                if (ch == '"')
                    inString = false;

                continue;
            }

            if (ch == '"')
            {
                inString = true;
                continue;
            }

            if (ch == '{')
                depth++;
            else if (ch == '}')
                depth--;

            if (depth == 0)
                return raw[start..(i + 1)];
        }

        // Nếu JSON bị cắt cụt, trả nguyên để nhánh catch xử lý fallback an toàn.
        return raw;
    }

    private static string SerializeAiResponse(AiResponse response)
    {
        return JsonSerializer.Serialize(response, JsonOptions);
    }

    private static string TrimForDebug(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "<empty>";

        var normalized = value.Replace("\r", " ").Replace("\n", " ").Trim();
        return normalized.Length <= 800 ? normalized : normalized[..800] + "...";
    }

    private static string NormalizeText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var normalized = value.Trim().ToLowerInvariant();
        normalized = normalized
            .Replace("đ", "d")
            .Replace("á", "a").Replace("à", "a").Replace("ả", "a").Replace("ã", "a").Replace("ạ", "a")
            .Replace("ă", "a").Replace("ắ", "a").Replace("ằ", "a").Replace("ẳ", "a").Replace("ẵ", "a").Replace("ặ", "a")
            .Replace("â", "a").Replace("ấ", "a").Replace("ầ", "a").Replace("ẩ", "a").Replace("ẫ", "a").Replace("ậ", "a")
            .Replace("é", "e").Replace("è", "e").Replace("ẻ", "e").Replace("ẽ", "e").Replace("ẹ", "e")
            .Replace("ê", "e").Replace("ế", "e").Replace("ề", "e").Replace("ể", "e").Replace("ễ", "e").Replace("ệ", "e")
            .Replace("í", "i").Replace("ì", "i").Replace("ỉ", "i").Replace("ĩ", "i").Replace("ị", "i")
            .Replace("ó", "o").Replace("ò", "o").Replace("ỏ", "o").Replace("õ", "o").Replace("ọ", "o")
            .Replace("ô", "o").Replace("ố", "o").Replace("ồ", "o").Replace("ổ", "o").Replace("ỗ", "o").Replace("ộ", "o")
            .Replace("ơ", "o").Replace("ớ", "o").Replace("ờ", "o").Replace("ở", "o").Replace("ỡ", "o").Replace("ợ", "o")
            .Replace("ú", "u").Replace("ù", "u").Replace("ủ", "u").Replace("ũ", "u").Replace("ụ", "u")
            .Replace("ư", "u").Replace("ứ", "u").Replace("ừ", "u").Replace("ử", "u").Replace("ữ", "u").Replace("ự", "u")
            .Replace("ý", "y").Replace("ỳ", "y").Replace("ỷ", "y").Replace("ỹ", "y").Replace("ỵ", "y");

        return normalized;
    }

    private sealed class GeminiCallResult
    {
        private GeminiCallResult(bool isSuccess, string? content, string? errorMessage)
        {
            IsSuccess = isSuccess;
            Content = content;
            ErrorMessage = errorMessage;
        }

        public bool IsSuccess { get; }

        public string? Content { get; }

        public string? ErrorMessage { get; }

        public static GeminiCallResult Ok(string content)
        {
            return new GeminiCallResult(true, content, null);
        }

        public static GeminiCallResult Fail(string errorMessage)
        {
            return new GeminiCallResult(false, null, errorMessage);
        }
    }
}
