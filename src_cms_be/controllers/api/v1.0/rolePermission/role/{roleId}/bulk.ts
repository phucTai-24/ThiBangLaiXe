import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RolePermissionProvider } from "#providers/RolePermissionProvider";
import { rolePermissionService } from "#services/rolePermissionService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateRolePermissionBulkCreateByRole } from "#middlewares/validators/rolePermission";

export default (_express: Application) => {
	const rolePermissionProvider = new RolePermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /rolePermission/role/{roleId}/bulk:
		 *   post:
		 *     tags: [RolePermission]
		 *     summary: Bulk create role permissions by role ID
		 *     description: Assign multiple permissions to a specific role at once. Role ID is in the path, permission IDs are in the request body.
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: roleId
		 *         in: path
		 *         required: true
		 *         description: Role ID to assign permissions to
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/RolePermissionBulkCreateByRole"
		 *     responses:
		 *       200:
		 *         description: Role permissions created successfully
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
		 *                         $ref: "#/components/schemas/RolePermission"
		 *       400:
		 *         description: Invalid input data or permissions already assigned
		 *       404:
		 *         description: Role not found or permissions not found
		 */
		post: {
			middleware: [verify, queryModifier, validateRolePermissionBulkCreateByRole],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await rolePermissionService.bulkCreateByRole(
						req.params.roleId!,
						req.body.permission_ids,
					);
					return res.sendOk({
						data,
						message: `Assigned ${data.length} permission(s) to role successfully`,
					});
				} catch (error) {
					await rolePermissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
