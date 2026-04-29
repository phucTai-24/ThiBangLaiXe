SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @LoaiDeThiThiThu NVARCHAR(50) = N'thi_thu';
    DECLARE @MaKyThi VARCHAR(30) = 'KYTHI_MO_PHONG_A1A';
    DECLARE @TenKyThi NVARCHAR(150) = N'Kỳ thi mô phỏng A1/A';
    DECLARE @NgayThi DATE = CAST(GETDATE() AS DATE);
    DECLARE @NguoiTaoId BIGINT = (SELECT TOP 1 id FROM nguoi_dung ORDER BY id);
    DECLARE @KyThiId BIGINT;

    -- Bảo đảm cột loai_de_thi đã tồn tại.
    IF COL_LENGTH('de_thi', 'loai_de_thi') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE de_thi ADD loai_de_thi NVARCHAR(50) NULL;');
    END;

    -- Tạo hoặc lấy kỳ thi dùng chung cho các đề mô phỏng A1/A.
    SELECT @KyThiId = id
    FROM ky_thi
    WHERE ma_ky_thi = @MaKyThi;

    IF @KyThiId IS NULL
    BEGIN
        INSERT INTO ky_thi (ma_ky_thi, ten_ky_thi, ngay_thi, mo_ta, trang_thai)
        VALUES
        (
            @MaKyThi,
            @TenKyThi,
            @NgayThi,
            N'Kỳ thi dùng để gom 10 đề mô phỏng A1/A 25 câu.',
            'hoat_dong'
        );

        SET @KyThiId = SCOPE_IDENTITY();
    END;

    DECLARE @MockExamIds TABLE (id BIGINT PRIMARY KEY);

    INSERT INTO @MockExamIds (id)
    SELECT id
    FROM de_thi
    WHERE loai_de_thi = @LoaiDeThiThiThu;

    -- Xóa dữ liệu thi thử cũ trước khi tạo mới.
    DELETE ctbt
    FROM chi_tiet_bai_thi AS ctbt
    INNER JOIN bai_thi AS bt ON bt.id = ctbt.bai_thi_id
    INNER JOIN @MockExamIds AS me ON me.id = bt.de_thi_id;

    DELETE bt
    FROM bai_thi AS bt
    INNER JOIN @MockExamIds AS me ON me.id = bt.de_thi_id;

    DELETE dtch
    FROM de_thi_cau_hoi AS dtch
    INNER JOIN @MockExamIds AS me ON me.id = dtch.de_thi_id;

    DELETE dt
    FROM de_thi AS dt
    INNER JOIN @MockExamIds AS me ON me.id = dt.id;

    -- Kiểm tra dữ liệu đầu vào tối thiểu để giữ đúng cơ cấu 25 câu / đề.
    IF (SELECT COUNT(*) FROM cau_hoi WHERE chu_de_id = 1 AND trang_thai = 'approved') < 80
        THROW 51001, N'Không đủ 80 câu chủ đề 1 để tạo 10 đề thi thử A1/A.', 1;

    IF (SELECT COUNT(*) FROM cau_hoi WHERE chu_de_id = 2 AND la_cau_diem_liet = 1 AND trang_thai = 'approved') < 10
        THROW 51002, N'Không đủ 10 câu điểm liệt chủ đề 2 để tạo 10 đề thi thử A1/A.', 1;

    IF (SELECT COUNT(*) FROM cau_hoi WHERE chu_de_id = 3 AND trang_thai = 'approved') < 10
        THROW 51003, N'Không đủ 10 câu chủ đề 3 để tạo 10 đề thi thử A1/A.', 1;

    IF (SELECT COUNT(*) FROM cau_hoi WHERE chu_de_id = 4 AND trang_thai = 'approved') < 10
        THROW 51004, N'Không đủ 10 câu chủ đề 4 để tạo 10 đề thi thử A1/A.', 1;

    IF (SELECT COUNT(*) FROM cau_hoi WHERE chu_de_id = 5 AND trang_thai = 'approved') < 80
        THROW 51005, N'Không đủ 80 câu chủ đề 5 để tạo 10 đề thi thử A1/A.', 1;

    IF (SELECT COUNT(*) FROM cau_hoi WHERE chu_de_id = 6 AND trang_thai = 'approved') < 1
        THROW 51006, N'Không có câu sa hình chủ đề 6 để tạo đề thi thử A1/A.', 1;

    DECLARE @Topic1 TABLE (rn INT PRIMARY KEY, cau_hoi_id BIGINT NOT NULL);
    DECLARE @Topic2 TABLE (rn INT PRIMARY KEY, cau_hoi_id BIGINT NOT NULL);
    DECLARE @Topic3 TABLE (rn INT PRIMARY KEY, cau_hoi_id BIGINT NOT NULL);
    DECLARE @Topic4 TABLE (rn INT PRIMARY KEY, cau_hoi_id BIGINT NOT NULL);
    DECLARE @Topic5 TABLE (rn INT PRIMARY KEY, cau_hoi_id BIGINT NOT NULL);
    DECLARE @Topic6 TABLE (rn INT PRIMARY KEY, cau_hoi_id BIGINT NOT NULL);

    INSERT INTO @Topic1 (rn, cau_hoi_id)
    SELECT ROW_NUMBER() OVER (ORDER BY id), id
    FROM cau_hoi
    WHERE chu_de_id = 1 AND trang_thai = 'approved';

    INSERT INTO @Topic2 (rn, cau_hoi_id)
    SELECT ROW_NUMBER() OVER (ORDER BY id), id
    FROM cau_hoi
    WHERE chu_de_id = 2 AND la_cau_diem_liet = 1 AND trang_thai = 'approved';

    INSERT INTO @Topic3 (rn, cau_hoi_id)
    SELECT ROW_NUMBER() OVER (ORDER BY id), id
    FROM cau_hoi
    WHERE chu_de_id = 3 AND trang_thai = 'approved';

    INSERT INTO @Topic4 (rn, cau_hoi_id)
    SELECT ROW_NUMBER() OVER (ORDER BY id), id
    FROM cau_hoi
    WHERE chu_de_id = 4 AND trang_thai = 'approved';

    INSERT INTO @Topic5 (rn, cau_hoi_id)
    SELECT ROW_NUMBER() OVER (ORDER BY id), id
    FROM cau_hoi
    WHERE chu_de_id = 5 AND trang_thai = 'approved';

    INSERT INTO @Topic6 (rn, cau_hoi_id)
    SELECT ROW_NUMBER() OVER (ORDER BY id), id
    FROM cau_hoi
    WHERE chu_de_id = 6 AND trang_thai = 'approved';

    DECLARE @Topic6Count INT = (SELECT COUNT(*) FROM @Topic6);
    DECLARE @SetNo INT = 1;
    DECLARE @DeThiId BIGINT;

    DECLARE @CreatedExams TABLE
    (
        set_no INT PRIMARY KEY,
        de_thi_id BIGINT NOT NULL,
        ma_de_thi VARCHAR(30) NOT NULL,
        ten_de_thi NVARCHAR(150) NOT NULL
    );

    WHILE @SetNo <= 10
    BEGIN
        INSERT INTO de_thi
        (
            ma_de_thi,
            ten_de_thi,
            ky_thi_id,
            tong_so_cau,
            thoi_gian_lam_bai,
            trang_thai,
            loai_de_thi,
            nguoi_tao_id,
            ngay_tao
        )
        VALUES
        (
            CONCAT('MO_PHONG_A1A_SET_', RIGHT('0' + CAST(@SetNo AS VARCHAR(2)), 2)),
            N'Đề mô phỏng A1/A - 25 câu (Set ' + CAST(@SetNo AS NVARCHAR(10)) + N')',
            @KyThiId,
            25,
            19,
            'published',
            @LoaiDeThiThiThu,
            @NguoiTaoId,
            GETDATE()
        );

        SET @DeThiId = SCOPE_IDENTITY();

        INSERT INTO @CreatedExams (set_no, de_thi_id, ma_de_thi, ten_de_thi)
        VALUES
        (
            @SetNo,
            @DeThiId,
            CONCAT('MO_PHONG_A1A_SET_', RIGHT('0' + CAST(@SetNo AS VARCHAR(2)), 2)),
            N'Đề mô phỏng A1/A - 25 câu (Set ' + CAST(@SetNo AS NVARCHAR(10)) + N')'
        );

        -- 01 -> 08: Quy định chung và quy tắc giao thông đường bộ.
        INSERT INTO de_thi_cau_hoi (de_thi_id, cau_hoi_id, thu_tu_cau)
        SELECT
            @DeThiId,
            t.cau_hoi_id,
            ROW_NUMBER() OVER (ORDER BY t.rn)
        FROM @Topic1 AS t
        WHERE t.rn BETWEEN ((@SetNo - 1) * 8 + 1) AND (@SetNo * 8);

        -- 09: Tình huống mất an toàn giao thông nghiêm trọng (câu điểm liệt).
        INSERT INTO de_thi_cau_hoi (de_thi_id, cau_hoi_id, thu_tu_cau)
        SELECT @DeThiId, t.cau_hoi_id, 9
        FROM @Topic2 AS t
        WHERE t.rn = @SetNo;

        -- 10: Văn hóa giao thông, đạo đức người lái xe.
        INSERT INTO de_thi_cau_hoi (de_thi_id, cau_hoi_id, thu_tu_cau)
        SELECT @DeThiId, t.cau_hoi_id, 10
        FROM @Topic3 AS t
        WHERE t.rn = @SetNo;

        -- 11: Kỹ thuật lái xe hoặc cấu tạo sửa chữa.
        INSERT INTO de_thi_cau_hoi (de_thi_id, cau_hoi_id, thu_tu_cau)
        SELECT @DeThiId, t.cau_hoi_id, 11
        FROM @Topic4 AS t
        WHERE t.rn = @SetNo;

        -- 12 -> 19: Báo hiệu đường bộ.
        INSERT INTO de_thi_cau_hoi (de_thi_id, cau_hoi_id, thu_tu_cau)
        SELECT
            @DeThiId,
            t.cau_hoi_id,
            11 + ROW_NUMBER() OVER (ORDER BY t.rn)
        FROM @Topic5 AS t
        WHERE t.rn BETWEEN ((@SetNo - 1) * 8 + 1) AND (@SetNo * 8);

        -- 20 -> 25: Sa hình và kỹ năng xử lý tình huống giao thông.
        -- Ngân hàng hiện chỉ có 35 câu chủ đề 6 nên phần này được phép lặp vòng để giữ đúng cơ cấu 6 câu / đề.
        ;WITH SoThuTu AS
        (
            SELECT 1 AS n UNION ALL
            SELECT 2 UNION ALL
            SELECT 3 UNION ALL
            SELECT 4 UNION ALL
            SELECT 5 UNION ALL
            SELECT 6
        )
        INSERT INTO de_thi_cau_hoi (de_thi_id, cau_hoi_id, thu_tu_cau)
        SELECT
            @DeThiId,
            t6.cau_hoi_id,
            19 + st.n
        FROM SoThuTu AS st
        INNER JOIN @Topic6 AS t6
            ON t6.rn = ((((@SetNo - 1) * 6 + st.n - 1) % @Topic6Count) + 1);

        SET @SetNo += 1;
    END;

    COMMIT TRANSACTION;

    SELECT
        ce.set_no,
        ce.de_thi_id,
        ce.ma_de_thi,
        ce.ten_de_thi,
        COUNT(dtch.id) AS tong_cau_hoi
    FROM @CreatedExams AS ce
    LEFT JOIN de_thi_cau_hoi AS dtch ON dtch.de_thi_id = ce.de_thi_id
    GROUP BY ce.set_no, ce.de_thi_id, ce.ma_de_thi, ce.ten_de_thi
    ORDER BY ce.set_no;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
