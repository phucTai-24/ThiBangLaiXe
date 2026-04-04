import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import queryModifier from "#middlewares/query-modifier";
import { validateId } from "#middlewares/validators";
import { validateUserRoleUpdate } from "#middlewares/validators/userRole";
import { UserRoleProvider } from "#providers/UserRoleProvider";
import { userRoleService } from "#services/userRoleService";

export default (_express: Application) => {
	const user_role_provider = UserRoleProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /userRole/{id}:
		 *   get:
		 *     tags: [UserRole]
		 *     summary: Get user-role assignment by ID
		 *     description: Retrieve a single user-role assignment by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: UserRole ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: User-role assignment retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/UserRole"
		 *       401:
		 *         description: Unauthorized
		 *       403:
		 *         description: Forbidden
		 *       404:
		 *         description: User-role assignment not found
		 */
		get: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userRoleService.getById(req.params.id!, req.user?.id ?? null);

					return res.sendOk({ data });
				} catch (error) {
					await user_role_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /userRole/{id}:
		 *   put:
		 *     tags: [UserRole]
		 *     summary: Update user-role assignment by ID
		 *     description: Update a single user-role assignment by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: UserRole ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/UserRoleUpdate"
		 *     responses:
		 *       200:
		 *         description: User-role assignment updated successfully
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
		 *         description: User-role assignment not found
		 *       409:
		 *         description: Role already assigned to user
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateUserRoleUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userRoleService.updateById(req.params.id!, req.body, req.user?.id ?? null);

					return res.sendOk({
						data,
						message: "Cập nhật phân quyền người dùng thành công",
					});
				} catch (error) {
					await user_role_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /userRole/{id}:
		 *   delete:
		 *     tags: [UserRole]
		 *     summary: Delete user-role assignment by ID
		 *     description: Delete a single user-role assignment by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: UserRole ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: User-role assignment deleted successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       type: object
		 *                       properties:
		 *                         id:
		 *                           type: string
		 *                           format: uuid
		 *                         deleted:
		 *                           type: boolean
		 *                           example: true
		 *       401:
		 *         description: Unauthorized
		 *       403:
		 *         description: Forbidden
		 *       404:
		 *         description: User-role assignment not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userRoleService.deleteById(req.params.id!, req.user?.id ?? null);

					return res.sendOk({
						data,
						message: "Xóa phân quyền người dùng thành công",
					});
				} catch (error) {
					await user_role_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};