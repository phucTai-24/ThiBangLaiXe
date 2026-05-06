/*
    Script: 13_approve_all_student_registrations.sql
    Mục đích: Phê duyệt tất cả học viên đã đăng ký mà chưa cần xây dựng giao diện phê duyệt.

    Các bảng được xử lý:
      1. dang_ky_khoa_hoc  - đăng ký khóa học
      2. dang_ky_du_thi    - đăng ký dự thi
      3. ho_so_dang_ky     - hồ sơ đăng ký của học viên

    Ghi chú:
      - Không tự gán nguoi_duyet_id vì script không biết chính xác tài khoản admin/người duyệt hợp lệ.
      - Giữ nguyên nguoi_duyet_id hiện có nếu đã có dữ liệu.
      - Chỉ cập nhật những bản ghi chưa ở trạng thái da_duyet.
*/

SET NOCOUNT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @ApprovedAt DATETIME = GETDATE();

    /* Phê duyệt tất cả đăng ký khóa học của học viên */
    UPDATE dang_ky_khoa_hoc
    SET
        trang_thai = 'da_duyet',
        ngay_duyet = ISNULL(ngay_duyet, @ApprovedAt)
    WHERE trang_thai IS NULL
       OR trang_thai <> 'da_duyet';

    DECLARE @ApprovedCourseRegistrations INT = @@ROWCOUNT;

    /* Phê duyệt tất cả đăng ký dự thi của học viên */
    UPDATE dang_ky_du_thi
    SET
        trang_thai = 'da_duyet',
        ngay_duyet = ISNULL(ngay_duyet, @ApprovedAt)
    WHERE trang_thai IS NULL
       OR trang_thai <> 'da_duyet';

    DECLARE @ApprovedExamRegistrations INT = @@ROWCOUNT;

    /* Phê duyệt tất cả hồ sơ đăng ký của học viên */
    UPDATE ho_so_dang_ky
    SET
        trang_thai = 'da_duyet',
        ngay_nop = ISNULL(ngay_nop, @ApprovedAt),
        ngay_duyet = ISNULL(ngay_duyet, @ApprovedAt)
    WHERE trang_thai IS NULL
       OR trang_thai <> 'da_duyet';

    DECLARE @ApprovedProfiles INT = @@ROWCOUNT;

    COMMIT TRANSACTION;

    SELECT
        @ApprovedCourseRegistrations AS so_dang_ky_khoa_hoc_da_duyet,
        @ApprovedExamRegistrations AS so_dang_ky_du_thi_da_duyet,
        @ApprovedProfiles AS so_ho_so_dang_ky_da_duyet;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
