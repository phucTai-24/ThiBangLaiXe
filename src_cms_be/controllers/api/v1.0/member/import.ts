import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import { GenericError } from "#interfaces/error/generic";

import verify from "#middlewares/auth";
import { validateMemberImport } from "#middlewares/validators/member";
import { validateMemberImportFile } from "#middlewares/validators/memberImportUpload";

import { MemberProvider } from "#providers/MemberProvider";
import { memberService } from "#services/memberService";

export default (_express: Application) => {
	const member_provider = MemberProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /member/import:
		 *   post:
		 *     tags: [Member]
		 *     summary: Import members from xlsx/csv file
		 *     description: |
		 *       FILE Template:
		 *       STT | Họ và Tên | Năm Sinh | Chức danh - Tên Doanh Nghiệp | ĐỊA CHỈ | NGÀNH NGHỀ KINH DOANH
		 *       - Import .xlsx and .csv
		 *       - sheet_name is optional, if not provided, system will try to import same data from file template
		 *       - just import data into members, businesses, positions tables
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         multipart/form-data:
		 *           schema:
		 *             type: object
		 *             required: [file]
		 *             properties:
		 *               file:
		 *                 type: string
		 *                 format: binary
		 *                 description: File .xlsx or .csv
		 *               sheet_name:
		 *                 type: string
		 *                 nullable: true
		 *                 example: Hoi Vien
		 *     responses:
		 *       200:
		 *         description: Import hội viên thành công
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 message:
		 *                   type: string
		 *                   example: Import hội viên thành công
		 *                 message_en:
		 *                   type: string
		 *                   example: Member import completed successfully
		 *                 responseData:
		 *                   $ref: '#/components/schemas/MemberImportResponse'
		 *                 status:
		 *                   type: string
		 *                   example: success
		 *                 timeStamp:
		 *                   type: string
		 *                   example: 2026-03-24 18:00:00
		 *                 violations:
		 *                   nullable: true
		 *       400:
		 *         description: File hoặc dữ liệu import không hợp lệ
		 *       401:
		 *         description: Unauthorized
		 *       500:
		 *         description: Internal server error
		 */
		post: {
			middleware: [verify, validateMemberImportFile, validateMemberImport],
			handler: async (req: Req, res: Res) => {
				try {
					if (!req.file) {
						throw new GenericError(
							{ vi: "Vui lòng chọn file import", en: "Please upload an import file" },
							"BAD_REQUEST",
							400,
						);
					}

					const result = await memberService.import_from_file({
						file_buffer: req.file.buffer,
						original_name: req.file.originalname,
						actor_id: req.user?.id ?? null,
						sheet_name:
							typeof req.body?.sheet_name === "string" && req.body.sheet_name.trim().length > 0
								? req.body.sheet_name.trim()
								: null,
					});

					return res.sendOk({
						data: result,
						message: "Import hội viên thành công",
						message_en: "Member import completed successfully",
					});
				} catch (error) {
					const loggable_error = error instanceof Error ? error : new Error("Unknown import error");

					await member_provider.logError(loggable_error);

					return res.error(error);
				}
			},
		},
	};
};