import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RolePermissionProvider } from "#providers/RolePermissionProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";

export default (_express: Application) => {
	const rolePermissionProvider = new RolePermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /rolePermission:
		 *   get:
		 *     tags: [RolePermission]
		 *     summary: Get all role permissions
		 *     description: Retrieve a list of role permissions with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved role permissions
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await rolePermissionProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await rolePermissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
