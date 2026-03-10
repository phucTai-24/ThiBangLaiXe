namespace HeThongThiBangLai.Api.DTOs;

public class cau_hoi_dto
{
    public long id { get; set; }
    public long chu_de_id { get; set; }
    public string noi_dung { get; set; }
    public string loai_cau_hoi { get; set; }
    public string? muc_do { get; set; }
    public bool la_cau_diem_liet { get; set; }
    public string trang_thai { get; set; }
}
