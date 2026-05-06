namespace MauiApp1.Models.Auth;

public sealed class RegisterStudentProfileRequest
{
    public string ho_ten { get; set; } = string.Empty;
    public DateTime? ngay_sinh { get; set; }
    public string? gioi_tinh { get; set; }
    public string? cccd { get; set; }
    public string? dia_chi { get; set; }
    public string? anh_chan_dung { get; set; }
}

