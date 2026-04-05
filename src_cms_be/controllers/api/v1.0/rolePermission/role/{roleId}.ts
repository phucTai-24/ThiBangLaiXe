import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RolePermissionProvider } from "#providers/RolePermissionProvider";
import { rolePermissionService } from "#services/rolePermissionService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateRolePermissionDeleteByRole } from "#middlewares/validators/rolePermission";

export default (_express: Application) => {
	const rolePermissionProvider = new RolePermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /rolePermission/role/{roleId}:
		 *   delete:
		 *     tags: [RolePermission]
		 *     summary: Delete all permissions of a role
		 *     description: Delete all role permission records associated with a specific role ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: roleId
		 *         in: path
		 *         required: true
		 *         description: Role ID
		 *         schema:
		 *           type: string
		 *           format: uuid
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
		 *       404:
		 *         description: Role not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateRolePermissionDeleteByRole],
			handler: async (req: Req, res: Res) => {
				try {
					const deletedCount = await rolePermissionService.deleteByRole(req.params.roleId!);
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
