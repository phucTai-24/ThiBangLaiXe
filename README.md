# ONTHIBANGLAI - README dự án

## 1. Tổng quan
Đây là dự án ứng dụng **.NET MAUI** đa nền tảng phục vụ ôn thi bằng lái xe máy, tên hiển thị là **ONTHIBANGLAI**. Ứng dụng hiện đang ở mức **prototype giao diện + điều hướng cơ bản**, tập trung vào trải nghiệm học viên với các màn hình đăng nhập, bảng điều khiển, danh sách bộ đề và thi thử.

Từ việc đọc cấu hình và mã nguồn hiện có, dự án hướng đến các nền tảng:
- Android
- iOS
- MacCatalyst
- Windows (khi build trên Windows)

## 2. Thông tin kỹ thuật chính
- Framework: .NET MAUI / .NET 9
- Kiểu dự án: Single Project MAUI
- Tên assembly: `ONTHIBANGLAI`
- Application ID: `com.companyname.onthibanglai`
- Logging debug đã được bật ở môi trường Debug
- Xác thực hiện tại dùng dịch vụ giả lập (`MockAuthService`)

## 3. Hiện trạng chức năng
### Đã có
1. **Khởi tạo ứng dụng bằng DI container**
   - Đăng ký `AppController`
   - Đăng ký `AuthController`
   - Đăng ký `IAuthService` với triển khai `MockAuthService`
   - Đăng ký `AppShell`

2. **Shell navigation cơ bản**
   - Điểm vào mặc định hiện tại là màn hình đăng nhập
   - Có đăng ký route cho nhiều màn hình trong app

3. **Các màn hình giao diện đã dựng khá đầy đủ**
   - Trang giới thiệu / main landing
   - Đăng nhập
   - Dashboard học viên
   - Danh sách bộ đề
   - Thi thử
   - Ngoài ra còn có các màn hình như onboarding, register, forgot password, profile, settings, history, notification, exam result...

4. **Xác thực giả lập**
   - Đăng nhập thành công nếu username/email và password không rỗng
   - Chưa có kết nối API thật, database hoặc token auth

### Chưa thấy hoàn thiện
- Chưa có backend thật
- Chưa có lưu trữ dữ liệu người dùng
- Chưa thấy mô hình câu hỏi thi thật hoặc dữ liệu đề thi thật
- Chưa thấy logic chấm điểm hoàn chỉnh
- Chưa thấy persistence cho tiến độ học
- Nhiều màn hình đang mang tính trình diễn UI nhiều hơn là nghiệp vụ hoàn chỉnh

## 4. Cấu trúc thư mục chính
```text
MauiApp1/
├─ Controllers/        # Điều hướng và logic controller mức ứng dụng
├─ Models/             # Model dữ liệu
├─ Platforms/          # Mã riêng cho từng nền tảng
├─ Resources/          # Splash, styles, fonts, images...
├─ Services/           # Interface và service nghiệp vụ
├─ Views/              # Các trang XAML giao diện
├─ App.xaml            # Tài nguyên ứng dụng
├─ App.xaml.cs         # Khởi tạo window chính
├─ AppShell.xaml       # Shell root của app
├─ AppShell.xaml.cs    # Đăng ký route điều hướng
├─ MauiProgram.cs      # Cấu hình DI và bootstrapping
└─ MauiApp1.csproj     # Cấu hình project MAUI
```

## 5. Các thành phần nổi bật đã đọc
### 5.1 Khởi tạo ứng dụng
Dự án khởi tạo app trong `MauiProgram.cs`, sử dụng dependency injection để quản lý controller, service và shell.

### 5.2 Điều hướng
`AppShell.xaml.cs` đăng ký route cho nhiều trang như:
- `MainPage`
- `OnboardingPage`
- `LoginPage`
- `RegisterPage`
- `ForgotPasswordPage`
- `DashboardPage`
- `ExamListPage`
- `TrafficSignsPage`
- `MockExamPage`
- `WrongAnswersPage`
- `ExamResultPage`
- `HistoryPage`
- `ProfilePage`
- `NotificationPage`
- `SettingsPage`

### 5.3 Xác thực
`MockAuthService` đang là service đăng nhập giả lập. Logic hiện tại chỉ kiểm tra dữ liệu đầu vào không rỗng và delay ngắn để mô phỏng thao tác bất đồng bộ.

### 5.4 Giao diện
Các file XAML cho thấy nhóm phát triển đang đầu tư mạnh vào phần nhìn:
- Tông màu vàng nâu / kem đồng bộ
- Dùng nhiều `Border`, `Grid`, `VerticalStackLayout`
- Dashboard thể hiện tiến độ học, lịch học, hồ sơ, gợi ý ôn tập
- Trang danh sách bộ đề thể hiện trạng thái đã xong / đang làm / khóa
- Trang thi thử đã mô phỏng bộ câu hỏi, tiến trình làm bài và thời gian

## 6. Luồng sử dụng hiện tại có thể suy ra
1. Mở ứng dụng
2. Vào màn hình đăng nhập
3. Nhập thông tin bất kỳ không rỗng
4. Qua dashboard
5. Từ dashboard hoặc navigation có thể đi đến danh sách bộ đề, thi thử, hồ sơ, lịch sử, cài đặt...

## 7. Hướng dẫn mở và chạy dự án
### Yêu cầu
- Visual Studio 2022 hoặc mới hơn có cài workload **.NET MAUI**
- .NET SDK phù hợp với `global.json`
- Android SDK / Windows SDK tùy nền tảng muốn chạy

### Mở solution
Mở file:
- `MauiApp1.sln`

### Chạy trên Visual Studio
1. Mở solution
2. Chọn target platform mong muốn: Android / Windows / iOS (nếu môi trường hỗ trợ)
3. Restore packages
4. Build và Run

### Chạy bằng CLI tham khảo
Có thể dùng các lệnh kiểu:
```bash
dotnet restore
dotnet build MauiApp1.sln
```

Nếu chạy trên Windows target MAUI, cần môi trường đã cài đủ workload và SDK liên quan.

## 8. Đánh giá nhanh trạng thái dự án
### Điểm mạnh
- Cấu trúc thư mục rõ ràng
- Có phân tách `Views`, `Controllers`, `Services`, `Models`
- UI hiện đại, khá chỉn chu
- Đã có DI và điều hướng cơ bản
- Có định hướng rõ cho một app ôn thi bằng lái

### Điểm cần bổ sung
- Thêm dữ liệu thật cho câu hỏi, bộ đề, biển báo
- Hoàn thiện nghiệp vụ đăng nhập/đăng ký/quên mật khẩu
- Kết nối API hoặc local storage
- Bổ sung viewmodel/state management nếu app tiếp tục mở rộng
- Viết tài liệu dữ liệu và luồng nghiệp vụ chi tiết hơn
- Bổ sung test

## 9. Tiến độ dự án
Dưới đây là đánh giá tiến độ dựa trên mã nguồn hiện có, mang tính ước lượng:

| Hạng mục | Tiến độ ước lượng | Ghi chú |
|---|---:|---|
| Khởi tạo cấu trúc dự án MAUI | 100% | Đã hoàn chỉnh |
| Thiết kế giao diện tổng thể | 80% | Nhiều màn hình đã dựng khá đầy đủ |
| Điều hướng giữa các màn hình | 70% | Route đã đăng ký, cần kiểm tra luồng thực tế đầy đủ |
| Xác thực người dùng | 30% | Mới là mock service |
| Nghiệp vụ ôn thi / dữ liệu đề thi | 35% | Có UI nhưng chưa thấy logic dữ liệu hoàn thiện |
| Quản lý tiến độ học tập | 40% | Có hiển thị UI, chưa thấy persistence rõ ràng |
| Tích hợp backend / API | 10% | Chưa thấy triển khai thực tế |
| Hoàn thiện sản phẩm để phát hành | 45% | Đang ở mức prototype chức năng + UI |

### Tổng tiến độ chung
**Khoảng 45% - 55%**

Nhận định: dự án đã đi khá xa ở phần **UI/UX và khung ứng dụng**, nhưng phần **nghiệp vụ thật, dữ liệu thật và hoàn thiện sản phẩm** vẫn còn nhiều việc.

## 10. Đề xuất bước tiếp theo
1. Chuẩn hóa luồng đăng nhập và điều hướng sau đăng nhập
2. Tạo dữ liệu mẫu cho câu hỏi, đề thi, biển báo dưới dạng JSON hoặc SQLite
3. Xây dựng service quản lý đề thi và kết quả thi
4. Lưu tiến độ học viên cục bộ
5. Hoàn thiện trang kết quả, lịch sử, câu sai
6. Tách logic khỏi code-behind nếu muốn mở rộng theo MVVM
7. Thêm tài liệu kiến trúc và checklist release

## 11. Các file quan trọng nên xem đầu tiên
- `MauiApp1/MauiProgram.cs`
- `MauiApp1/MauiApp1.csproj`
- `MauiApp1/App.xaml.cs`
- `MauiApp1/AppShell.xaml`
- `MauiApp1/AppShell.xaml.cs`
- `MauiApp1/Controllers/AuthController.cs`
- `MauiApp1/Services/MockAuthService.cs`
- `MauiApp1/Views/LoginPage.xaml`
- `MauiApp1/Views/DashboardPage.xaml`
- `MauiApp1/Views/ExamListPage.xaml`
- `MauiApp1/Views/MockExamPage.xaml`

## 12. Ghi chú
README này được tạo dựa trên việc đọc cấu trúc thư mục và một số file mã nguồn cốt lõi hiện có trong repository. Vì chưa kiểm thử toàn bộ flow runtime trong tài liệu này, một số đánh giá về tiến độ và mức độ hoàn thiện là **ước lượng kỹ thuật dựa trên mã nguồn hiện tại**.
