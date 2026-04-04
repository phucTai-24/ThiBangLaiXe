import path from "path";

import multer from "multer";

import { Req, Res } from "#interfaces/IApi";
import { GenericError } from "#interfaces/error/generic";

const MAX_IMPORT_FILE_SIZE = Number(process.env.MAX_IMPORT_FILE_SIZE ?? 10 * 1024 * 1024);
const ALLOWED_IMPORT_EXTENSIONS = new Set([".xlsx", ".csv"]);

const member_import_upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: MAX_IMPORT_FILE_SIZE,
		files: 1,
	},
	fileFilter: (_req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase();

		if (!ALLOWED_IMPORT_EXTENSIONS.has(extension)) {
			return callback(new Error("INVALID_IMPORT_FILE_EXTENSION"));
		}

		return callback(null, true);
	},
}).single("file");

export const validateMemberImportFile = (req: Req, res: Res, next: (error?: unknown) => void) => {
	member_import_upload(req, res, (error) => {
		if (error instanceof multer.MulterError) {
			if (error.code === "LIMIT_FILE_SIZE") {
				return next(
					new GenericError(
						{
							vi: "File import vượt quá dung lượng cho phép",
							en: "Import file exceeds the allowed size",
						},
						"BAD_REQUEST",
						400,
						{ max_file_size: MAX_IMPORT_FILE_SIZE },
					),
				);
			}

			return next(
				new GenericError(
					{
						vi: "Upload file import không hợp lệ",
						en: "Invalid import file upload",
					},
					"BAD_REQUEST",
					400,
				),
			);
		}

		if (error instanceof Error && error.message === "INVALID_IMPORT_FILE_EXTENSION") {
			return next(
				new GenericError(
					{
						vi: "Chỉ hỗ trợ file .xlsx hoặc .csv",
						en: "Only .xlsx or .csv files are supported",
					},
					"BAD_REQUEST",
					400,
				),
			);
		}

		if (error) {
			return next(error);
		}

		if (!req.file) {
			return next(
				new GenericError(
					{
						vi: "Vui lòng chọn file import",
						en: "Please upload an import file",
					},
					"BAD_REQUEST",
					400,
				),
			);
		}

		return next();
	});
};