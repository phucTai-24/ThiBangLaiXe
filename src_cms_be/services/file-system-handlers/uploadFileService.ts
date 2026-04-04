import fs from "fs";
import multer from "multer";
import path from "path";
import { promisify } from "util";
import { Req } from "../../interfaces/IApi";
import { Request } from "express";

const fileTypeFn = (type = "DEFAULT") => {
	switch (type) {
		case "IMAGE":
			return "images";
		case "VIDEO":
			return "videos";
		default:
			return "files";
	}
};
const storage = multer.diskStorage({
		destination: function (req: Request, file: Express.Multer.File, cb: (arg0: null, arg1: string) => void) {
			const customReq = req as Req;
			let fileType = "DEFAULT";
			if (file.mimetype.startsWith("image/")) {
				fileType = "IMAGE";
			} else if (file.mimetype.startsWith("video/")) {
				fileType = "VIDEO";
			}
			const storagePath = path.resolve(
				process.env.UPLOAD_PATH || "./storage/uploads",
				fileTypeFn(fileType),
				<string>customReq.imagePath ?? "",
			);
			fs.mkdirSync(storagePath, { recursive: true });
			cb(null, storagePath);
		},
		filename: function (
			req: Request,
			file: { fieldname: string; originalname: string },
			cb: (arg0: null, arg1: string) => void,
		) {
			const customReq = req as Req;
			const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
			cb(null, `${file.fieldname}-${uniqueSuffix}${customReq.extendName ?? ""}${path.extname(file.originalname)}`);
		},
	}),
	upload = multer({ storage: storage }).single("file");

export default promisify(upload);
