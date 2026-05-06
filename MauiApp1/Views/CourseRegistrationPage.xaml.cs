using MauiApp1.Models.Entitlements;
using MauiApp1.Models.Auth;
using MauiApp1.Services;
using System.Collections.ObjectModel;
using MauiApp1.Helpers;

namespace MauiApp1.Views;

public partial class CourseRegistrationPage : ContentPage
{
    private readonly IEntitlementService _entitlementService;
    private readonly IAuthService _authService;
    private bool _isLoadingPackages;
    private long? _pendingCourseId;
    private Button? _pendingRegisterButton;
    private CourseDetailItem? _currentCourseDetail;
    private DateTime _currentScheduleWeekStart;

    public ObservableCollection<EntitlementPackageItem> CoursePackages { get; } = new();

    public CourseRegistrationPage(IEntitlementService entitlementService, IAuthService authService)
    {
        _entitlementService = entitlementService;
        _authService = authService;
        InitializeComponent();
        BindingContext = this;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await LoadCoursePackagesAsync();
    }

    private async Task LoadCoursePackagesAsync()
    {
        if (_isLoadingPackages)
            return;

        try
        {
            _isLoadingPackages = true;
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;
            StatusLabel.Text = "Đang tải toàn bộ khóa học...";

            var packages = await _entitlementService.GetPackagesAsync();

            CoursePackages.Clear();
            foreach (var package in packages)
            {
                CoursePackages.Add(package);
            }

            if (CoursePackages.Count == 0)
            {
                StatusLabel.Text = "Hiện chưa có khóa học mở đăng ký.";
            }
            else
            {
                StatusLabel.Text = $"Có {CoursePackages.Count} khóa học mở đăng ký.";
            }

        }
        catch (UnauthorizedAccessException)
        {
            StatusLabel.Text = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Không tải được danh sách khóa học.";
            Console.WriteLine($"[CourseRegistration][Load][Error] {ex.Message}");
        }
        finally
        {
            _isLoadingPackages = false;
            LoadingIndicator.IsVisible = false;
            LoadingIndicator.IsRunning = false;
        }
    }

    private async void OnRegisterCourseClicked(object? sender, EventArgs e)
    {
        if (sender is not Button button || button.CommandParameter is null)
            return;

        if (!long.TryParse(button.CommandParameter.ToString(), out var packageId) || packageId <= 0)
            return;

        try
        {
            button.IsEnabled = false;

            var profile = await _authService.GetCurrentUserProfileAsync();
            if (profile is null)
                throw new UnauthorizedAccessException("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");

            var studentProfile = await _authService.GetCurrentStudentProfileAsync();
            if (studentProfile is null)
            {
                _pendingCourseId = packageId;
                _pendingRegisterButton = button;
                OpenStudentProfileForm(profile);
                StatusLabel.Text = "Vui lòng nhập thông tin học viên để tiếp tục đăng ký khóa học.";
                return;
            }

            await RegisterCourseAsync(packageId);
        }
        catch (UnauthorizedAccessException)
        {
            StatusLabel.Text = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Đăng ký khóa học thất bại.";
            Console.WriteLine($"[CourseRegistration][Register][Error] {ex.Message}");
            await DisplayAlert("Lỗi", ex.Message, "OK");
        }
        finally
        {
            button.IsEnabled = true;
        }
    }

    private async Task RegisterCourseAsync(long packageId)
    {
        await _entitlementService.RegisterPackageAsync(packageId);

        var item = CoursePackages.FirstOrDefault(x => x.Id == packageId);
        if (item != null)
            item.IsRegistered = true;

        StatusLabel.Text = "Đăng ký khóa học thành công.";
    }

    private async void OnSubmitStudentProfileClicked(object? sender, EventArgs e)
    {
        if (_pendingCourseId is null)
            return;

        try
        {
            SubmitStudentProfileButton.IsEnabled = false;
            StudentProfileErrorLabel.IsVisible = false;

            var request = BuildStudentProfileRequestFromForm();
            if (request is null)
                return;

            await _authService.RegisterStudentProfileAsync(request);

            var studentProfile = await _authService.GetCurrentStudentProfileAsync();
            if (studentProfile is null)
                throw new InvalidOperationException("Không lấy lại được thông tin học viên sau khi đăng ký.");

            await DisplayAlert(
                "Đăng ký học viên thành công",
                $"Họ tên: {studentProfile.ho_ten}\nCCCD: {(string.IsNullOrWhiteSpace(studentProfile.cccd) ? "Chưa cập nhật" : studentProfile.cccd)}\nĐịa chỉ: {(string.IsNullOrWhiteSpace(studentProfile.dia_chi) ? "Chưa cập nhật" : studentProfile.dia_chi)}",
                "Tiếp tục");

            CloseStudentProfileForm();

            await RegisterCourseAsync(_pendingCourseId.Value);
        }
        catch (Exception ex)
        {
            StudentProfileErrorLabel.Text = ex.Message;
            StudentProfileErrorLabel.IsVisible = true;
            Console.WriteLine($"[CourseRegistration][StudentProfile][Error] {ex.Message}");
        }
        finally
        {
            SubmitStudentProfileButton.IsEnabled = true;
            if (_pendingRegisterButton is not null)
                _pendingRegisterButton.IsEnabled = true;
        }
    }

    private void OnCancelStudentProfileClicked(object? sender, EventArgs e)
    {
        CloseStudentProfileForm();
        if (_pendingRegisterButton is not null)
            _pendingRegisterButton.IsEnabled = true;
        StatusLabel.Text = "Bạn đã hủy nhập thông tin học viên.";
    }

    private async void OnBackTapped(object? sender, EventArgs e)
    {
        await NavigationHelper.GoBackAsync();
    }

    private async void OnCourseDetailClicked(object? sender, EventArgs e)
    {
        if (sender is not Button button || button.CommandParameter is null)
            return;

        if (!long.TryParse(button.CommandParameter.ToString(), out var courseId) || courseId <= 0)
            return;

        try
        {
            button.IsEnabled = false;
            StatusLabel.Text = "Đang tải chi tiết khóa học...";

            var detail = await _entitlementService.GetCourseDetailAsync(courseId);
            if (detail is null)
            {
                await DisplayAlert("Thông báo", "Không lấy được chi tiết khóa học.", "OK");
                return;
            }

            ShowCourseDetail(detail);
            StatusLabel.Text = $"Có {CoursePackages.Count} khóa học mở đăng ký.";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CourseRegistration][Detail][Error] {ex.Message}");
            await DisplayAlert("Lỗi", "Không tải được chi tiết khóa học.", "OK");
        }
        finally
        {
            button.IsEnabled = true;
        }
    }

    private void ShowCourseDetail(CourseDetailItem detail)
    {
        DetailTitleLabel.Text = detail.TenKhoaHoc;
        DetailSubtitleLabel.Text = $"{detail.MaKhoaHoc} • {detail.LoaiBangLai} • {detail.TrangThai}";
        DetailFeeLabel.Text = $"{detail.HocPhi:N0}đ";
        DetailSessionsLabel.Text = $"{detail.SoBuoiHoc} buổi";
        DetailCapacityLabel.Text = $"Sĩ số: {detail.SoLuongHienTai}/{detail.SoLuongToiDa} học viên";
        DetailDescriptionLabel.Text = string.IsNullOrWhiteSpace(detail.MoTa) ? "Chưa có mô tả chi tiết." : detail.MoTa;
        DetailTeacherLabel.Text = detail.GiaoVienChinh is null
            ? "Chưa phân công giảng viên"
            : $"{detail.GiaoVienChinh.HoTen} • {detail.GiaoVienChinh.SoDienThoai ?? "Chưa có SĐT"}";
        DetailDateRangeLabel.Text = $"{FormatDate(detail.NgayBatDau)} - {FormatDate(detail.NgayKetThuc)}";

        _currentCourseDetail = detail;
        _currentScheduleWeekStart = GetWeekStart(detail.NgayBatDau ?? DateTime.Today);
        RenderScheduleWeek();

        CourseDetailOverlay.IsVisible = true;
    }

    private void OnCloseCourseDetailClicked(object? sender, EventArgs e)
    {
        CourseDetailOverlay.IsVisible = false;
    }

    private void OnPreviousScheduleWeekClicked(object? sender, EventArgs e)
    {
        if (_currentCourseDetail is null)
            return;

        _currentScheduleWeekStart = _currentScheduleWeekStart.AddDays(-7);
        RenderScheduleWeek();
    }

    private void OnNextScheduleWeekClicked(object? sender, EventArgs e)
    {
        if (_currentCourseDetail is null)
            return;

        _currentScheduleWeekStart = _currentScheduleWeekStart.AddDays(7);
        RenderScheduleWeek();
    }

    private void RenderScheduleWeek()
    {
        if (_currentCourseDetail is null)
            return;

        DetailSchedulesLayout.Children.Clear();

        var weekEnd = _currentScheduleWeekStart.AddDays(6);
        ScheduleWeekLabel.Text = $"{_currentScheduleWeekStart:dd/MM} - {weekEnd:dd/MM/yyyy}";

        PreviousScheduleWeekButton.IsEnabled = !_currentCourseDetail.NgayBatDau.HasValue
            || _currentScheduleWeekStart > GetWeekStart(_currentCourseDetail.NgayBatDau.Value);
        NextScheduleWeekButton.IsEnabled = !_currentCourseDetail.NgayKetThuc.HasValue
            || weekEnd < _currentCourseDetail.NgayKetThuc.Value.Date;

        if (_currentCourseDetail.LichHocMau.Count == 0)
        {
            DetailSchedulesLayout.Children.Add(CreateEmptyScheduleCard("Chưa có lịch học mẫu."));
            return;
        }

        DetailSchedulesLayout.Children.Add(CreateScheduleTable(_currentCourseDetail, _currentScheduleWeekStart));
    }

    private static string FormatDate(DateTime? value)
    {
        return value.HasValue ? value.Value.ToString("dd/MM/yyyy") : "Chưa cập nhật";
    }

    private static View CreateEmptyScheduleCard(string message)
    {
        return new Border
        {
            BackgroundColor = Color.FromArgb("#F8FAFC"),
            Stroke = Color.FromArgb("#E2E8F0"),
            StrokeThickness = 1,
            StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 18 },
            Padding = 14,
            Content = new Label
            {
                Text = message,
                TextColor = Color.FromArgb("#64748B"),
                FontSize = 13
            }
        };
    }

    private static View CreateScheduleTable(CourseDetailItem detail, DateTime weekStart)
    {
        var table = new VerticalStackLayout
        {
            Spacing = 10
        };

        var days = Enumerable.Range(0, 7)
            .Select(offset => weekStart.AddDays(offset))
            .ToArray();
        var sessions = new[] { "Sáng", "Chiều", "Tối" };

        foreach (var date in days)
        {
            var day = ToVietnameseDayOfWeek(date.DayOfWeek);
            var daySchedules = detail.LichHocMau
                .Where(x => x.ThuTrongTuan == day)
                .OrderBy(x => x.GioBatDau)
                .ToList();

            var isInCourseRange = IsDateInCourseRange(date, detail.NgayBatDau, detail.NgayKetThuc);
            table.Children.Add(CreateDayScheduleRow(date, sessions, isInCourseRange ? daySchedules : new List<CourseScheduleItem>(), isInCourseRange));
        }

        return table;
    }

    private static View CreateDayScheduleRow(DateTime date, string[] sessions, List<CourseScheduleItem> daySchedules, bool isInCourseRange)
    {
        var day = ToVietnameseDayOfWeek(date.DayOfWeek);
        var grid = new Grid
        {
            ColumnDefinitions =
            {
                new ColumnDefinition { Width = new GridLength(72) },
                new ColumnDefinition { Width = GridLength.Star }
            },
            ColumnSpacing = 8
        };

        grid.Children.Add(new Border
        {
            BackgroundColor = isInCourseRange ? Color.FromArgb("#EEF2FF") : Color.FromArgb("#F8FAFC"),
            StrokeThickness = 0,
            StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 18 },
            Padding = new Thickness(6, 10),
            Content = new VerticalStackLayout
            {
                Spacing = 2,
                HorizontalOptions = LayoutOptions.Center,
                VerticalOptions = LayoutOptions.Center,
                Children =
                {
                    new Label
                    {
                        Text = FormatVietnameseDay(day),
                        FontFamily = "OpenSans-Semibold",
                        FontSize = 14,
                        TextColor = isInCourseRange ? Color.FromArgb("#3730A3") : Color.FromArgb("#94A3B8"),
                        HorizontalTextAlignment = TextAlignment.Center
                    },
                    new Label
                    {
                        Text = date.ToString("dd/MM"),
                        FontSize = 11,
                        TextColor = isInCourseRange ? Color.FromArgb("#64748B") : Color.FromArgb("#CBD5E1"),
                        HorizontalTextAlignment = TextAlignment.Center
                    }
                }
            }
        });

        var sessionGrid = new Grid
        {
            ColumnDefinitions =
            {
                new ColumnDefinition { Width = GridLength.Star },
                new ColumnDefinition { Width = GridLength.Star },
                new ColumnDefinition { Width = GridLength.Star }
            },
            ColumnSpacing = 6
        };

        for (var index = 0; index < sessions.Length; index++)
        {
            var sessionName = sessions[index];
            var schedule = daySchedules.FirstOrDefault(x => GetSessionName(x.GioBatDau) == sessionName);
            var cell = CreateScheduleCell(sessionName, schedule, isInCourseRange);
            Grid.SetColumn(cell, index);
            sessionGrid.Children.Add(cell);
        }

        Grid.SetColumn(sessionGrid, 1);
        grid.Children.Add(sessionGrid);

        return grid;
    }

    private static View CreateScheduleCell(string sessionName, CourseScheduleItem? schedule, bool isInCourseRange)
    {
        var hasSchedule = schedule is not null && isInCourseRange;

        return new Border
        {
            BackgroundColor = hasSchedule ? Color.FromArgb("#FFFFFF") : Color.FromArgb("#F8FAFC"),
            Stroke = hasSchedule ? Color.FromArgb("#DCEAFE") : Color.FromArgb("#E2E8F0"),
            StrokeThickness = 1,
            StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 16 },
            Padding = new Thickness(6, 8),
            Content = new VerticalStackLayout
            {
                Spacing = 3,
                Children =
                {
                    new Label
                    {
                        Text = sessionName,
                        FontFamily = "OpenSans-Semibold",
                        FontSize = 11,
                        TextColor = hasSchedule ? Color.FromArgb("#1E40AF") : Color.FromArgb("#94A3B8"),
                        HorizontalTextAlignment = TextAlignment.Center
                    },
                    new Label
                    {
                        Text = hasSchedule ? $"⏰ {schedule!.GioBatDau}-{schedule.GioKetThuc}" : "—",
                        FontSize = 10,
                        TextColor = hasSchedule ? Color.FromArgb("#334155") : Color.FromArgb("#CBD5E1"),
                        HorizontalTextAlignment = TextAlignment.Center,
                        LineBreakMode = LineBreakMode.NoWrap
                    },
                    new Label
                    {
                        Text = hasSchedule ? $"📍 {(string.IsNullOrWhiteSpace(schedule!.DiaDiem) ? "Chưa có" : schedule.DiaDiem)}" : "Trống",
                        FontSize = 9,
                        TextColor = hasSchedule ? Color.FromArgb("#64748B") : Color.FromArgb("#CBD5E1"),
                        HorizontalTextAlignment = TextAlignment.Center,
                        LineBreakMode = LineBreakMode.NoWrap
                    }
                }
            }
        };
    }

    private static string GetSessionName(string gioBatDau)
    {
        if (!TimeSpan.TryParse(gioBatDau, out var time))
            return "Tối";

        if (time.Hours < 12)
            return "Sáng";

        if (time.Hours < 18)
            return "Chiều";

        return "Tối";
    }

    private static bool IsDateInCourseRange(DateTime date, DateTime? startDate, DateTime? endDate)
    {
        if (startDate.HasValue && date.Date < startDate.Value.Date)
            return false;

        if (endDate.HasValue && date.Date > endDate.Value.Date)
            return false;

        return true;
    }

    private static DateTime GetWeekStart(DateTime value)
    {
        var offset = value.DayOfWeek == DayOfWeek.Sunday ? -6 : DayOfWeek.Monday - value.DayOfWeek;
        return value.Date.AddDays(offset);
    }

    private static int ToVietnameseDayOfWeek(DayOfWeek dayOfWeek)
    {
        return dayOfWeek == DayOfWeek.Sunday ? 8 : (int)dayOfWeek + 1;
    }

    private static View CreateScheduleCard(CourseScheduleItem schedule, int index)
    {
        var accentColors = new[] { "#2563EB", "#7C3AED", "#059669", "#EA580C" };
        var softColors = new[] { "#EFF6FF", "#F5F3FF", "#ECFDF5", "#FFF7ED" };
        var accent = Color.FromArgb(accentColors[index % accentColors.Length]);
        var soft = Color.FromArgb(softColors[index % softColors.Length]);

        return new Border
        {
            BackgroundColor = Colors.White,
            Stroke = Color.FromArgb("#E9EEF5"),
            StrokeThickness = 1,
            StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 22 },
            Padding = 0,
            Shadow = new Shadow
            {
                Brush = Brush.Black,
                Opacity = 0.08f,
                Radius = 10,
                Offset = new Point(0, 4)
            },
            Content = new Grid
            {
                ColumnDefinitions =
                {
                    new ColumnDefinition { Width = new GridLength(86) },
                    new ColumnDefinition { Width = GridLength.Star }
                },
                Children =
                {
                    new Border
                    {
                        BackgroundColor = soft,
                        StrokeThickness = 0,
                        StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = new CornerRadius(22, 0, 22, 0) },
                        Padding = new Thickness(10, 16),
                        Content = new VerticalStackLayout
                        {
                            Spacing = 2,
                            HorizontalOptions = LayoutOptions.Center,
                            VerticalOptions = LayoutOptions.Center,
                            Children =
                            {
                                new Label
                                {
                                    Text = "Ngày",
                                    FontSize = 11,
                                    TextColor = Color.FromArgb("#64748B"),
                                    HorizontalTextAlignment = TextAlignment.Center
                                },
                                new Label
                                {
                                    Text = FormatVietnameseDay(schedule.ThuTrongTuan),
                                    FontFamily = "OpenSans-Semibold",
                                    FontSize = 17,
                                    TextColor = accent,
                                    HorizontalTextAlignment = TextAlignment.Center
                                }
                            }
                        }
                    },
                    CreateScheduleInfoLayout(schedule)
                }
            }
        };
    }

    private static VerticalStackLayout CreateScheduleInfoLayout(CourseScheduleItem schedule)
    {
        var layout = new VerticalStackLayout
        {
                        Padding = new Thickness(14, 12),
                        Spacing = 8,
                        VerticalOptions = LayoutOptions.Center,
                        Children =
                        {
                            new HorizontalStackLayout
                            {
                                Spacing = 8,
                                Children =
                                {
                                    new Label { Text = "⏰", FontSize = 15, VerticalTextAlignment = TextAlignment.Center },
                                    new Label
                                    {
                                        Text = $"{schedule.GioBatDau} - {schedule.GioKetThuc}",
                                        FontFamily = "OpenSans-Semibold",
                                        FontSize = 15,
                                        TextColor = Color.FromArgb("#1E293B"),
                                        VerticalTextAlignment = TextAlignment.Center
                                    }
                                }
                            },
                            new HorizontalStackLayout
                            {
                                Spacing = 8,
                                Children =
                                {
                                    new Label { Text = "📍", FontSize = 14, VerticalTextAlignment = TextAlignment.Center },
                                    new Label
                                    {
                                        Text = string.IsNullOrWhiteSpace(schedule.DiaDiem) ? "Chưa có phòng học" : schedule.DiaDiem,
                                        FontSize = 13,
                                        TextColor = Color.FromArgb("#64748B"),
                                        VerticalTextAlignment = TextAlignment.Center
                                    }
                                }
                            }
                        }
        };

        Grid.SetColumn(layout, 1);
        return layout;
    }

    private static string FormatVietnameseDay(int day)
    {
        return day == 8 ? "CN" : $"Thứ {day}";
    }

    private void OpenStudentProfileForm(MauiApp1.Models.Auth.MeResponse profile)
    {
        FullNameEntry.Text = string.IsNullOrWhiteSpace(profile.ho_ten) ? profile.ten_dang_nhap : profile.ho_ten;
        DateOfBirthEntry.Text = profile.ngay_sinh?.ToString("yyyy-MM-dd") ?? string.Empty;
        CccdEntry.Text = profile.cccd ?? string.Empty;
        AddressEditor.Text = profile.dia_chi ?? string.Empty;
        AvatarUrlEntry.Text = profile.anh_chan_dung ?? string.Empty;
        GenderPicker.SelectedItem = NormalizeGender(profile.gioi_tinh);
        StudentProfileErrorLabel.IsVisible = false;
        StudentProfileOverlay.IsVisible = true;
    }

    private void CloseStudentProfileForm()
    {
        StudentProfileOverlay.IsVisible = false;
        _pendingCourseId = null;
        _pendingRegisterButton = null;
    }

    private RegisterStudentProfileRequest? BuildStudentProfileRequestFromForm()
    {
        var fullName = FullNameEntry.Text?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(fullName))
        {
            StudentProfileErrorLabel.Text = "Họ tên là bắt buộc.";
            StudentProfileErrorLabel.IsVisible = true;
            return null;
        }

        DateTime? birthDate = null;
        if (!string.IsNullOrWhiteSpace(DateOfBirthEntry.Text))
        {
            if (!DateTime.TryParse(DateOfBirthEntry.Text, out var parsedDate))
            {
                StudentProfileErrorLabel.Text = "Ngày sinh không đúng định dạng yyyy-MM-dd.";
                StudentProfileErrorLabel.IsVisible = true;
                return null;
            }

            birthDate = parsedDate.Date;
        }

        var cccd = CccdEntry.Text?.Trim();
        if (!string.IsNullOrWhiteSpace(cccd) && cccd.Length is < 9 or > 20)
        {
            StudentProfileErrorLabel.Text = "CCCD phải từ 9 đến 20 ký tự.";
            StudentProfileErrorLabel.IsVisible = true;
            return null;
        }

        var avatar = AvatarUrlEntry.Text?.Trim();
        if (!string.IsNullOrWhiteSpace(avatar) && !Uri.TryCreate(avatar, UriKind.Absolute, out _))
        {
            StudentProfileErrorLabel.Text = "Ảnh chân dung phải là URL hợp lệ.";
            StudentProfileErrorLabel.IsVisible = true;
            return null;
        }

        return new RegisterStudentProfileRequest
        {
            ho_ten = fullName,
            ngay_sinh = birthDate,
            gioi_tinh = GenderPicker.SelectedItem?.ToString(),
            cccd = string.IsNullOrWhiteSpace(cccd) ? null : cccd,
            dia_chi = string.IsNullOrWhiteSpace(AddressEditor.Text) ? null : AddressEditor.Text.Trim(),
            anh_chan_dung = string.IsNullOrWhiteSpace(avatar) ? null : avatar
        };
    }

    private static string? NormalizeGender(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "nam" => "Nam",
            "nu" => "Nữ",
            "nữ" => "Nữ",
            "khac" => "Khác",
            "khác" => "Khác",
            _ => null
        };
    }
}

