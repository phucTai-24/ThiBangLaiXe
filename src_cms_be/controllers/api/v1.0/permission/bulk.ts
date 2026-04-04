import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { PermissionProvider } from "#providers/PermissionProvider";
import { permissionService } from "#services/permissionService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import {
	validatePermissionBulkCreate,
	validatePermissionBulkDelete,
} from "#middlewares/validators/permission";

export default (_express: Application) => {
	const permissionProvider = new PermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /permission/bulk:
		 *   post:
		 *     tags: [Permission]
		 *     summary: Bulk create permissions
		 *     description: Create multiple permission records at once
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/PermissionBulkCreate"
		 *     responses:
		 *       200:
		 *         description: Permissions created successfully
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
		 *                         $ref: "#/components/schemas/Permission"
		 *       400:
		 *         description: Invalid input data
		 *       409:
		 *         description: Duplicate permission found
		 */
		post: {
			middleware: [verify, queryModifier, validatePermissionBulkCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await permissionService.bulkCreate(
						req.body.permissions,
						req.user?.id || null,
					);
					return res.sendOk({
						data,
						message: `Created ${data.length} permission(s) successfully`,
					});
				} catch (error) {
					await permissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /permission/bulk:
		 *   delete:
		 *     tags: [Permission]
		 *     summary: Bulk delete permissions
		 *     description: Delete multiple permission records by their IDs
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/PermissionBulkDelete"
		 *     responses:
		 *       200:
		 *         description: Permissions deleted successfully
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
		 *                           example: 5
		 *       400:
		 *         description: Invalid input data or empty IDs list
		 *       404:
		 *         description: No permissions found to delete
		 */
		delete: {
			middleware: [verify, queryModifier, validatePermissionBulkDelete],
			handler: async (req: Req, res: Res) => {
				try {
					const deletedCount = await permissionService.bulkDelete(req.body.ids);
					return res.sendOk({
						data: { deletedCount },
						message: `Deleted ${deletedCount} permission(s) successfully`,
					});
				} catch (error) {
					await permissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
