import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RoleProvider } from "#providers/RoleProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";

export default (_express: Application) => {
	const roleProvider = new RoleProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /role:
		 *   get:
		 *     tags: [Role]
		 *     summary: Get all roles
		 *     description: Retrieve a list of roles with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved roles
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await roleProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await roleProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
