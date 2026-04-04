import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { PermissionProvider } from "#providers/PermissionProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";

export default (_express: Application) => {
	const permissionProvider = new PermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /permission:
		 *   get:
		 *     tags: [Permission]
		 *     summary: Get all permissions
		 *     description: Retrieve a list of permissions with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved permissions
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await permissionProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await permissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
