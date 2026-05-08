# README Chat AI

Tài liệu này mô tả toàn bộ phần Chat AI trong ứng dụng ONTHIBANGLAI, bao gồm UI overlay, ViewModel, service gọi AI, luồng tạo phiên luyện tập và các lưu ý debug/sửa lỗi đã phát sinh.

## 1. Mục tiêu tính năng

Chat AI là trợ lý học tập nổi trên các màn hình chính của ứng dụng. Người dùng có thể:

- Hỏi các nội dung ôn thi bằng lái như biển báo, câu điểm liệt, sa hình, mẹo học.
- Nhập yêu cầu luyện tập như `luyện 20 câu biển báo`, `ôn câu điểm liệt`, `ôn câu hay sai biển báo`.
- Khi AI nhận diện intent luyện tập, app tự tạo `PracticeSession` và điều hướng sang màn hình luyện tập.

## 2. Các file liên quan

### UI / Control

- `Controls/ChatOverlayView.xaml`
  - Định nghĩa giao diện chat overlay.
  - Gồm `AbsoluteLayout`, popup chat, danh sách message, `Entry` nhập tin nhắn, nút gửi, floating bubble.

- `Controls/ChatOverlayView.xaml.cs`
  - Code-behind xử lý mở/đóng popup, kéo thả floating bubble, gửi tin nhắn, scroll message.
  - Gán `BindingContext` cho `ChatOverlayViewModel`.
  - Có xử lý chống crash khi scroll `CollectionView`.

### ViewModel

- `ViewModels/ChatOverlayViewModel.cs`
  - Quản lý danh sách tin nhắn, trạng thái mở chat, draft message, trạng thái đang gửi.
  - Điều phối luồng gửi message thường hoặc tạo phiên luyện tập.

- `ViewModels/ChatMessageViewModel.cs`
  - Model hiển thị từng bubble chat.
  - Chứa text, sender, màu bubble, alignment.

### Models

- `Models/ChatHistoryMessage.cs`
  - Dạng history gửi cho AI hội thoại.

- `Models/PracticeRequest.cs`
  - Dạng intent request do AI hoặc heuristic sinh ra để tạo phiên luyện tập.
  - Các field chính: `action`, `topic`, `source`, `questionCount`.

- `Models/PracticeSession.cs`
  - Phiên luyện tập được tạo từ yêu cầu chat.

- `Models/PracticeQuestionItem.cs`
  - Câu hỏi được đưa vào phiên luyện tập.

### Services

- `Services/IChatService.cs`
  - Interface xử lý chat AI và parse intent luyện tập.

- `Services/ChatService.cs`
  - Gọi OpenAI/Gemini nếu có API key.
  - Fallback trả lời local nếu không có API key.
  - Nhận diện yêu cầu tạo phiên luyện tập bằng heuristic.

- `Services/IChatPracticeService.cs`
  - Interface tạo phiên luyện tập từ chat.

- `Services/PracticeService.cs`
  - Implement `IChatPracticeService`.
  - Lấy câu hỏi từ API/backend, lọc theo topic, tạo `PracticeSession` local.

- `Services/IPracticeSessionStore.cs` và `Services/PracticeSessionStore.cs`
  - Lưu phiên luyện tập hiện tại để màn hình luyện tập sử dụng.

- `Services/ApiEndpoints.cs`
  - Cấu hình base URL backend cho các API lấy câu hỏi.

### Đăng ký DI

- `MauiProgram.cs`
  - Đăng ký `IChatService -> ChatService`.
  - Đăng ký `IChatPracticeService -> PracticeService`.
  - Đăng ký `IPracticeSessionStore -> PracticeSessionStore`.
  - Đăng ký `ChatOverlayViewModel`.

## 3. Cách ChatOverlay được gắn vào màn hình

`ChatOverlayView` được đặt trong nhiều page, ví dụ:

- `Views/DashboardPage.xaml`
- `Views/ExamListPage.xaml`
- `Views/MockExamPage.xaml`
- `Views/ProfilePage.xaml`
- `Views/PracticeResultPage.xaml`
- `Views/StudySchedulePage.xaml`
- `Views/TrafficSignsPage.xaml`

Thông thường control được đặt cuối `Grid` với `Grid.RowSpan` để nổi lên trên nội dung page.

## 4. Luồng UI

### 4.1 Floating bubble

Floating bubble nằm trong `ChatOverlayView.xaml` với tên `FloatingButton`.

- Tap bubble gọi `OnFloatingButtonTapped`.
- Kéo bubble gọi `OnFloatingButtonPanUpdated`.
- Vị trí bubble được lưu bằng `Preferences` với key:
  - `ChatBubble.TranslationX`
  - `ChatBubble.TranslationY`

### 4.2 Mở/đóng popup

Khi tap bubble:

1. `OnFloatingButtonTapped` gọi `ToggleChatCommand`.
2. `ChatOverlayViewModel.IsChatOpen` đổi trạng thái.
3. `OnViewModelPropertyChanged` trong code-behind gọi `AnimatePopupAsync`.
4. Popup fade/scale để mở hoặc đóng.

### 4.3 Nhập và gửi tin nhắn

Trong `ChatOverlayView.xaml`:

- `Entry` có `x:Name="MessageEntry"`.
- `Entry.Completed="OnMessageEntryCompleted"`.
- Nút gửi có `Clicked="OnSendButtonClicked"`.

Trong `ChatOverlayView.xaml.cs`:

1. `OnSendButtonClicked` hoặc `OnMessageEntryCompleted` gọi chung `SendMessage()`.
2. `SendMessage()` đồng bộ text từ `MessageEntry.Text` sang `ChatOverlayViewModel.DraftMessage`.
3. Nếu message rỗng thì return.
4. Gọi `ChatOverlayViewModel.SendMessageAsync()`.
5. Sau khi ViewModel clear draft, code-behind đồng bộ lại `MessageEntry.Text`.

## 5. Luồng xử lý trong ViewModel

`ChatOverlayViewModel.SendMessageAsync()` gọi `SendMessageSafeAsync()`, sau đó gọi logic lõi trong `SendMessageCoreAsync()`.

### 5.1 Message thường

Nếu `ChatService.ShouldCreatePracticeSession(message)` trả về `false`:

1. Add message của người dùng vào `Messages`.
2. Clear `DraftMessage`.
3. Tạo history từ các message gần đây.
4. Gọi `IChatService.SendChatMessageAsync(message, history)`.
5. Add reply của AI vào `Messages`.

### 5.2 Message yêu cầu luyện tập

Nếu `ChatService.ShouldCreatePracticeSession(message)` trả về `true`:

1. Add message người dùng.
2. Add message `Mình đang phân tích yêu cầu...`.
3. Gọi `IChatService.GetPracticeRequestJsonAsync(message)`.
4. Gọi `IChatService.ParsePracticeRequest(aiJson, message)`.
5. Gọi `IChatPracticeService.CreateSessionAsync(practiceRequest)`.
6. Lưu session vào `IPracticeSessionStore.SetCurrentSession(session)`.
7. Điều hướng sang `PracticeSessionPage` với query `sessionId`.

## 6. Nhận diện intent luyện tập

`ChatService.ShouldCreatePracticeSession` dùng heuristic đơn giản:

### Nhóm động từ luyện tập

Tin nhắn cần có ít nhất một từ/cụm từ như:

- `luyện`
- `ôn`
- `làm bài`
- `tạo phiên`
- `bắt đầu`
- `kiểm tra`
- `test`
- `practice`

### Nhóm chủ đề

Tin nhắn cần có ít nhất một từ/cụm từ như:

- `biển báo`, `báo hiệu`
- `sa hình`, `mô phỏng`, `tình huống`
- `điểm liệt`, `câu liệt`
- `câu sai`, `hay sai`

Chỉ khi có cả động từ luyện tập và chủ đề thì app mới tạo phiên luyện tập.

## 7. Mapping PracticeRequest

`PracticeRequest` gồm:

- `action`: mặc định `create_session`.
- `topic`:
  - `traffic_sign`: biển báo.
  - `simulation`: sa hình / mô phỏng / tình huống.
  - `critical`: câu điểm liệt.
- `source`:
  - `random`: lấy câu ngẫu nhiên theo topic.
  - `wrong`: lấy câu sai, nếu không có thì fallback sang random.
- `questionCount`: số câu, mặc định `20`, giới hạn `1..100`.

Ví dụ JSON hợp lệ:

```json
{"action":"create_session","topic":"traffic_sign","source":"random","questionCount":20}
```

## 8. Tích hợp OpenAI/Gemini

`ChatService` đọc API key theo thứ tự:

### OpenAI

- Preference key: `OpenAI.ApiKey`
- Environment variable: `OPENAI_API_KEY`

### Gemini

- Preference key: `Gemini.ApiKey`
- Environment variable: `GEMINI_API_KEY`

Nếu có OpenAI key, app ưu tiên OpenAI. Nếu không có OpenAI key nhưng có Gemini key, app dùng Gemini. Nếu không có key nào, app dùng fallback local.

## 9. Fallback local

Khi không cấu hình API key hoặc gọi AI thất bại, `ChatService` vẫn trả lời bằng local rule trong `CreateLocalChatReply`.

Các nhóm trả lời local hiện có:

- Biển báo.
- Câu điểm liệt.
- Sa hình / mô phỏng / tình huống.
- Chào hỏi.
- Fallback chung.

Nhờ đó chat vẫn hoạt động offline ở mức cơ bản.

## 10. Luồng tạo phiên luyện tập

`PracticeService.CreateSessionAsync` thực hiện:

1. Normalize topic và source.
2. Nếu source là `wrong`, gọi `GetWrongQuestionsAsync`.
3. Nếu source là `random`, gọi `GetQuestionsByTopicAsync`.
4. Nếu source `wrong` không có câu, fallback sang random.
5. Shuffle câu hỏi bằng `Random.Shared.Next()`.
6. Take số lượng theo `questionCount`.
7. Clone câu hỏi để đưa vào session.
8. Tạo `PracticeSession` với id prefix `ai-chat-`.
9. Lưu local session bằng `IPracticeService.SaveLocalPracticeSessionAsync`.

## 11. Backend endpoints liên quan

Trong `PracticeService`, các endpoint chính:

- `api/v1/questions/with-answers?page=1&pageSize=...&status=approved&includeCorrectAnswer=true&topicCode=...`
- `api/v1/questions`
- `api/v1/wrong-questions?page=1&pageSize=500&includeCorrectAnswer=true`
- `api/v1/wrong-questions`

Topic code được mapping:

- `traffic_sign` -> `CD_BH`
- `simulation` -> `CD_SH`
- `critical` -> `CD_LIET`

## 12. Các lỗi đã gặp và cách xử lý

### 12.1 Nút gửi không click được

Nguyên nhân: `AbsoluteLayout` trong `ChatOverlayView.xaml` từng đặt `InputTransparent="True"`, có thể làm touch event của các control con không chạy.

Cách sửa:

- Gỡ `InputTransparent="True"` khỏi `AbsoluteLayout`.
- Giữ `CascadeInputTransparent="False"`.
- Đảm bảo `ChatPopup` có `InputTransparent="False"`.

### 12.2 Entry hoặc Button không gửi đúng nội dung mới nhất

Nguyên nhân: Text binding của `Entry` có thể chưa update kịp khi người dùng nhấn nút gửi.

Cách sửa:

- Đặt `x:Name="MessageEntry"` cho Entry.
- Trước khi gửi, đọc trực tiếp `MessageEntry.Text` và gán vào `DraftMessage`.

### 12.3 Nhấn gửi bị thoát app

Nguyên nhân có khả năng cao: `CollectionView.ScrollTo` được gọi ngay khi message mới add vào `ObservableCollection`, trong khi item/layout chưa render xong.

Cách sửa:

- Delay ngắn trước khi scroll.
- Bọc `ScrollTo` bằng `try/catch`.
- Kiểm tra lại `Messages.Count` trước khi scroll.
- Bọc event handler gửi bằng `try/catch` để exception không thoát app.

## 13. Debug log hiện có

Trong `ChatOverlayView.xaml.cs`:

- `Console.WriteLine("Send clicked")`
- `Console.WriteLine("Entry completed")`
- `Console.WriteLine($"Chat scroll failed: {ex.Message}")`
- `Console.WriteLine($"Button send failed: {ex.Message}")`
- `Console.WriteLine($"Entry send failed: {ex.Message}")`

Các log này giúp xác định:

- Button có nhận click không.
- Entry Completed có chạy không.
- Có lỗi khi scroll không.
- Có lỗi khi gửi message không.

## 14. Kiểm thử thủ công

### Test mở/đóng chat

1. Mở page có `ChatOverlayView`.
2. Tap floating bubble.
3. Popup phải mở.
4. Tap nút `×` hoặc bubble đang mở.
5. Popup phải đóng.

### Test gửi message thường

1. Mở chat.
2. Nhập `xin chào`.
3. Nhấn nút gửi.
4. Message của user xuất hiện.
5. AI trả lời local hoặc từ provider.
6. App không crash.

### Test Entry Completed

1. Mở chat.
2. Nhập `mẹo nhớ biển báo`.
3. Nhấn phím Send/Enter trên keyboard.
4. Message phải được gửi.

### Test tạo phiên luyện tập

1. Mở chat.
2. Nhập `luyện 20 câu biển báo`.
3. App thêm message đang phân tích.
4. App tạo session.
5. App điều hướng sang `PracticeSessionPage`.

### Test fallback câu sai

1. Nhập `ôn câu hay sai biển báo`.
2. App ưu tiên wrong questions.
3. Nếu không có câu sai, app fallback random.

## 15. Build kiểm tra

Do project target nhiều framework gồm Android/iOS/MacCatalyst/Windows, trên Windows nếu thiếu workload iOS thì build toàn solution có thể báo lỗi workload.

Lệnh build Windows target đã dùng để kiểm tra chat:

```bat
dotnet build MauiApp1\MauiApp1\MauiApp1.csproj -f net9.0-windows10.0.19041.0 -p:TargetFrameworks=net9.0-windows10.0.19041.0
```

Kết quả gần nhất: build thành công, không có lỗi biên dịch. Các warning hiện tại là warning sẵn có về nullable converter và XAML compiled binding, không chặn build.

## 16. Lưu ý bảo trì

- Không đặt `InputTransparent="True"` ở layout cha bao toàn bộ chat nếu muốn các control con nhận touch.
- Không gọi `CollectionView.ScrollTo` quá sớm ngay khi collection thay đổi nếu chưa đảm bảo UI đã render item.
- Nếu thêm AI provider mới, nên bổ sung trong `IChatService`/`ChatService`, không đưa logic gọi API trực tiếp vào ViewModel.
- Nếu thêm intent mới, cập nhật đồng bộ:
  - `ShouldCreatePracticeSession`
  - `CreateHeuristicRequest`
  - `NormalizeRequest`
  - `PracticeService.NormalizeTopic`
  - Mapping topic code backend nếu cần.
- Không lưu API key trực tiếp vào source code. Nên dùng `Preferences`, secure config hoặc environment variable.
