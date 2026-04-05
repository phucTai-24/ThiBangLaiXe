import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { FileProvider } from "#providers/FileProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";

export default (_express: Application) => {
	const fileProvider = new FileProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /file/{id}:
		 *   get:
		 *     tags: [File]
		 *     summary: Get file by ID
		 *     description: Retrieve a single file record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: File ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: File retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/File"
		 *       404:
		 *         description: File not found
		 */
		get: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await fileProvider.getById({ id: req.params.id! });
					return res.sendOk({ data });
				} catch (error) {
					await fileProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /file/{id}:
		 *   delete:
		 *     tags: [File]
		 *     summary: Delete file by ID
		 *     description: Delete a single file record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: File ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: File deleted successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       type: boolean
		 *                       example: true
		 *       404:
		 *         description: File not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await fileProvider.delete(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await fileProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
