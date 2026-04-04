import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RoleProvider } from "#providers/RoleProvider";
import { roleService } from "#services/roleService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateRoleBulkCreate, validateRoleBulkDelete } from "#middlewares/validators/role";

export default (_express: Application) => {
	const roleProvider = new RoleProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /role/bulk:
		 *   post:
		 *     tags: [Role]
		 *     summary: Bulk create roles
		 *     description: Create multiple role records at once
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/RoleBulkCreate"
		 *     responses:
		 *       200:
		 *         description: Roles created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       type: array
		 *                       items:
		 *                         $ref: "#/components/schemas/Role"
		 *       400:
		 *         description: Invalid input data
		 */
		post: {
			middleware: [verify, queryModifier, validateRoleBulkCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await roleService.bulkCreate(req.body.roles, req.user?.id || null);
					return res.sendOk({
						data,
						message: `Created ${data.length} role(s) successfully`,
					});
				} catch (error) {
					await roleProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /role/bulk:
		 *   delete:
		 *     tags: [Role]
		 *     summary: Bulk delete roles
		 *     description: Delete multiple role records by their IDs
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/RoleBulkDelete"
		 *     responses:
		 *       200:
		 *         description: Roles deleted successfully
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
		 *                         deletedCount:
		 *                           type: number
		 *       400:
		 *         description: Invalid input data
		 *       404:
		 *         description: No roles found to delete
		 */
		delete: {
			middleware: [verify, queryModifier, validateRoleBulkDelete],
			handler: async (req: Req, res: Res) => {
				try {
					const deletedCount = await roleService.bulkDelete(req.body.ids);
					return res.sendOk({
						data: { deletedCount },
						message: `Deleted ${deletedCount} role(s) successfully`,
					});
				} catch (error) {
					await roleProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
