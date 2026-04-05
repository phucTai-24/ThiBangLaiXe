import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RolePermissionProvider } from "#providers/RolePermissionProvider";
import { rolePermissionService } from "#services/rolePermissionService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateRolePermissionBulkDelete } from "#middlewares/validators/rolePermission";

export default (_express: Application) => {
	const rolePermissionProvider = new RolePermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /rolePermission/bulk:
		 *   delete:
		 *     tags: [RolePermission]
		 *     summary: Bulk delete role permissions
		 *     description: Delete multiple role permission records by their IDs
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/RolePermissionBulkDelete"
		 *     responses:
		 *       200:
		 *         description: Role permissions deleted successfully
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
		 *         description: No role permissions found to delete
		 */
		delete: {
			middleware: [verify, queryModifier, validateRolePermissionBulkDelete],
			handler: async (req: Req, res: Res) => {
				try {
					const deletedCount = await rolePermissionService.bulkDelete(req.body.ids);
					return res.sendOk({
						data: { deletedCount },
						message: `Deleted ${deletedCount} role permission(s) successfully`,
					});
				} catch (error) {
					await rolePermissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
