# ONTHIBANGLAI (MAUI FE) + ASP.NET Core BE

## 1) Tổng quan

Repo hiện có 2 phần chính:

- **Frontend mobile/desktop**: dự án `.NET MAUI` tại [`MauiApp1/MauiApp1`](MauiApp1/MauiApp1)
- **Backend API**: dự án `ASP.NET Core` tại [`ThiBangLaiXe-develop-be/HeThongThiBangLai.Api`](ThiBangLaiXe-develop-be/HeThongThiBangLai.Api)

App FE đang chạy theo hướng **kết nối API thật** cho các luồng chính:

- Auth qua [`ApiAuthService`](MauiApp1/MauiApp1/Services/ApiAuthService.cs:7)
- Thi thử qua [`ApiExamService`](MauiApp1/MauiApp1/Services/ApiExamService.cs:9)
- Ôn tập qua [`ApiPracticeService`](MauiApp1/MauiApp1/Services/ApiPracticeService.cs:10)
- Lịch học qua [`ApiStudyScheduleService`](MauiApp1/MauiApp1/Services/ApiStudyScheduleService.cs:8)

---

## 2) Kiến trúc FE hiện tại

FE đang dùng pattern nhẹ kiểu `MVVM + Services + DI`:

- View: thư mục [`Views`](MauiApp1/MauiApp1/Views)
- ViewModel: thư mục [`ViewModels`](MauiApp1/MauiApp1/ViewModels)
- Service/API client: thư mục [`Services`](MauiApp1/MauiApp1/Services)
- Đăng ký DI: [`MauiProgram.CreateMauiApp()`](MauiApp1/MauiApp1/MauiProgram.cs:11)
- Điều hướng route: [`AppShell`](MauiApp1/MauiApp1/AppShell.xaml.cs:6)

Shell entry hiện tại vào trang login tại [`AppShell.xaml`](MauiApp1/MauiApp1/AppShell.xaml:11).

---

## 3) Trạng thái tích hợp API theo module

### 3.1 Auth

- FE gọi `api/v1/auth/login` và `api/v1/auth/me` trong [`ApiAuthService`](MauiApp1/MauiApp1/Services/ApiAuthService.cs:16)
- Token lưu qua `SecureStorage`

### 3.2 Thi thử

- FE dùng nhóm endpoint `api/v1/sample-exams`, `api/v1/exams/...` trong [`ApiExamService`](MauiApp1/MauiApp1/Services/ApiExamService.cs:19)

### 3.3 Ôn tập

- FE đã chuyển sang API service thật trong [`ApiPracticeService`](MauiApp1/MauiApp1/Services/ApiPracticeService.cs:10)
- Tuy nhiên BE hiện chưa có controller `practice-sessions` tương ứng theo tài liệu

### 3.4 Lịch học

- FE đã chuyển sang API service thật trong [`ApiStudyScheduleService`](MauiApp1/MauiApp1/Services/ApiStudyScheduleService.cs:8)
- Có fallback dữ liệu từ endpoint dashboard, nhưng BE chưa mở đủ bộ API classes/sessions/attendance cho lịch học chi tiết

---

## 4) Cấu hình Base URL FE

Định nghĩa trong [`ApiEndpoints.GetBaseUrl()`](MauiApp1/MauiApp1/Services/ApiEndpoints.cs:5):

- Android emulator: `http://10.0.2.2:5017/`
- Nền tảng khác: `http://localhost:5017/`

Nếu BE chạy cổng khác, sửa trực tiếp file [`ApiEndpoints.cs`](MauiApp1/MauiApp1/Services/ApiEndpoints.cs:1).

---

## 5) Chạy Backend

Backend project chính: [`HeThongThiBangLai.Api.csproj`](ThiBangLaiXe-develop-be/HeThongThiBangLai.Api/HeThongThiBangLai.Api.csproj)

Có thể chạy nhanh bằng script:

- [`start-api.cmd`](ThiBangLaiXe-develop-be/start-api.cmd)
- [`stop-api.cmd`](ThiBangLaiXe-develop-be/stop-api.cmd)

Hoặc chạy trực tiếp bằng `dotnet run` trong thư mục backend.

---

## 6) Chạy Frontend (MAUI)

Project FE: [`MauiApp1.csproj`](MauiApp1/MauiApp1/MauiApp1.csproj)

Ví dụ build Android:

```bash
dotnet build -t:Run -f net9.0-android
```

Lưu ý:

- Cần cài đủ workload MAUI tương ứng target platform.
- Build có thể có warnings nullable/XAML compile nhưng vẫn chạy nếu không có error.

---

## 7) API BE còn thiếu để FE chạy đầy đủ

Theo flow hiện tại và tài liệu [`Demo.docx`](MauiApp1/Demo.docx):

### 7.1 Practice (thiếu nhiều)

Cần có bộ:

- `POST /api/practice-sessions/start`
- `GET /api/practice-sessions/{id}/questions`
- `POST /api/practice-sessions/{id}/answers`
- `POST /api/practice-sessions/{id}/submit`
- `GET /api/practice-sessions/my-history`

### 7.2 Study schedule (thiếu endpoint chi tiết)

Cần có:

- `GET /api/dashboard/student` (nếu bám theo tài liệu demo)
- `GET /api/classes/{id}/sessions`
- `GET /api/sessions/{id}/attendance`
- `GET /api/students/{id}/attendance`

Hiện danh sách controller BE thực tế nằm tại [`Controllers`](ThiBangLaiXe-develop-be/HeThongThiBangLai.Api/Controllers), chưa thấy nhóm route classes/sessions/attendance như tài liệu mô tả.

---

## 8) Cấu trúc thư mục chính

```text
MauiApp1/
├─ MauiApp1/                       # FE MAUI app
│  ├─ Controls/
│  ├─ Converters/
│  ├─ Models/
│  ├─ Services/
│  ├─ ViewModels/
│  ├─ Views/
│  ├─ AppShell.xaml(.cs)
│  ├─ MauiProgram.cs
│  └─ MauiApp1.csproj
├─ ThiBangLaiXe-develop-be/        # BE ASP.NET Core
│  └─ HeThongThiBangLai.Api/
│     ├─ Controllers/
│     ├─ DTOs/
│     ├─ Services/
│     ├─ Repositories/
│     └─ Program.cs
└─ Demo.docx                       # Tài liệu API/flow nghiệp vụ
```

---

## 9) Ghi chú cập nhật

README này phản ánh trạng thái code hiện tại sau các cập nhật:

-   FE đã chuyển từ mock sang API cho `auth/exam/practice/study schedule`
- Một số flow còn phụ thuộc BE hoàn thiện endpoint đúng theo tài liệu

