import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { FileProvider } from "#providers/FileProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";

export default (_express: Application) => {
	const fileProvider = new FileProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /file:
		 *   get:
		 *     tags: [File]
		 *     summary: Get all file
		 *     description: Retrieve a list of file with pagination, filtering and sorting
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved file
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [verify, queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await fileProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await fileProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
