namespace MauiApp1.Models.Entitlements;

public sealed class CourseDetailItem
{
    public long CourseId { get; set; }
    public string MaKhoaHoc { get; set; } = string.Empty;
    public string TenKhoaHoc { get; set; } = string.Empty;
    public string LoaiBangLai { get; set; } = string.Empty;
    public string? MoTa { get; set; }
    public decimal HocPhi { get; set; }
    public int SoBuoiHoc { get; set; }
    public int SoLuongToiDa { get; set; }
    public int SoLuongHienTai { get; set; }
    public DateTime? NgayBatDau { get; set; }
    public DateTime? NgayKetThuc { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public string? HinhAnh { get; set; }
    public CourseTeacherItem? GiaoVienChinh { get; set; }
    public List<CourseScheduleItem> LichHocMau { get; set; } = new();
}

public sealed class CourseTeacherItem
{
    public long TeacherId { get; set; }
    public string HoTen { get; set; } = string.Empty;
    public string? SoDienThoai { get; set; }
}

public sealed class CourseScheduleItem
{
    public int ThuTrongTuan { get; set; }
    public string GioBatDau { get; set; } = string.Empty;
    public string GioKetThuc { get; set; } = string.Empty;
    public string? DiaDiem { get; set; }
}

