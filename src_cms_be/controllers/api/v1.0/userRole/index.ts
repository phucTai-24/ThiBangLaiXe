import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import queryModifier from "#middlewares/query-modifier";
import { validateUserRoleCreate } from "#middlewares/validators/userRole";
import { UserRoleProvider } from "#providers/UserRoleProvider";
import { userRoleService } from "#services/userRoleService";

export default (_express: Application) => {
	const user_role_provider = UserRoleProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /userRole:
		 *   get:
		 *     tags: [UserRole]
		 *     summary: Get all user-role assignments
		 *     description: Retrieve a list of user-role assignments with pagination, filtering and sorting
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
		 *         description: Successfully retrieved user-role assignments
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/UserRoleListData"
		 *       401:
		 *         description: Unauthorized
		 *       403:
		 *         description: Forbidden
		 */
		get: {
			middleware: [verify, queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userRoleService.getAll(req.payload || {}, req.user?.id ?? null);
					return res.sendOk({ data });
				} catch (error) {
					await user_role_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /userRole:
		 *   post:
		 *     tags: [UserRole]
		 *     summary: Create a user-role assignment
		 *     description: Assign a role to a user
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/UserRoleCreate"
		 *     responses:
		 *       200:
		 *         description: User-role assignment created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/UserRole"
		 *       400:
		 *         description: Invalid input
		 *       401:
		 *         description: Unauthorized
		 *       403:
		 *         description: Forbidden
		 *       404:
		 *         description: User or role not found
		 *       409:
		 *         description: Role already assigned to user
		 */
		post: {
			middleware: [verify, queryModifier, validateUserRoleCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userRoleService.create(req.body, req.user?.id ?? null);

					return res.sendOk({
						data,
						message: "Gán vai trò cho người dùng thành công",
					});
				} catch (error) {
					await user_role_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};