import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { FileProvider } from "#providers/FileProvider";
import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import uploadFileService from "#services/file-system-handlers/uploadFileService";
import constants from "../../../../constants/index";
import path from "path";

export default (_express: Application) => {
	const fileProvider = new FileProvider();
	const allowedMimeTypes = [
		...constants.MIME_TYPES.IMAGE,
		...constants.MIME_TYPES.VIDEO,
		...constants.MIME_TYPES.DOCUMENT,
		...constants.MIME_TYPES.TEXT,
		...constants.MIME_TYPES.AUDIO,
		...constants.MIME_TYPES.ARCHIVE,
	];

	return <Resource>{
		/**
		 * @openapi
		 * /file/upload:
		 *   post:
		 *     tags: [File]
		 *     summary: Upload a file
		 *     description: Upload a file to the server and create a file record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         multipart/form-data:
		 *           schema:
		 *             type: object
		 *             properties:
		 *               file:
		 *                 type: string
		 *                 format: binary
		 *                 description: File to upload
		 *               path:
		 *                 type: string
		 *                 description: Custom path for file storage (optional)
		 *               original:
		 *                 type: string
		 *                 description: Original filename (optional)
		 *               compress:
		 *                 type: boolean
		 *                 description: Whether to compress the file
		 *                 default: false
		 *               extendName:
		 *                 type: string
		 *                 description: Custom extension to append to filename (optional)
		 *     responses:
		 *       200:
		 *         description: File uploaded successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/File"
		 *       400:
		 *         description: Bad request - no file uploaded or invalid file type
		 *       500:
		 *         description: Internal server error
		 */
		post: {
			middleware: [verify],
			handler: async (req: Req, res: Res) => {
				try {
					// Set custom path if provided
					if (req.body.path) {
						(req as any).imagePath = req.body.path;
					}

					// Set custom extension if provided
					if (req.body.extendName) {
						(req as any).extendName = req.body.extendName;
					}

					// Use multer to handle file upload
					await uploadFileService(req, res);

					// Check if file was uploaded
					if (!req.file) {
						return res.error({ message: "No file uploaded", status: 400 });
					}

					const file = req.file as Express.Multer.File;

					// Validate file type
					if (!allowedMimeTypes.includes(file.mimetype)) {
						return res.error({
							message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`,
							status: 400,
						});
					}

					// Prepare file data for database
					const uploadPath = process.env.UPLOAD_PATH || "./storage/uploads";
					let relativePath = path.relative(uploadPath, file.path).replace(/\\/g, "/");

					// Decode filename to handle UTF-8 characters properly
					const originalFilename = req.body.original || file.originalname;
					const decodedFilename = Buffer.from(originalFilename, "latin1").toString("utf8");

					const fileData = {
						path: relativePath, // Store normalized relative path with forward slashes
						original: decodedFilename, // Store properly decoded filename
						mime: file.mimetype,
						compress_info: req.body.compress ? { compress: true } : null,
						compress_status: req.body.compress ? "pending" : null,
						created_by: req.user?.id || null,
						created_at: new Date(),
					};

					// Create file record in database
					const data = await fileProvider.create(fileData);

					return res.sendOk({
						data,
						message: "File uploaded successfully",
					});
				} catch (error) {
					await fileProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
