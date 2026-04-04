import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { PermissionProvider } from "#providers/PermissionProvider";
import { permissionService } from "#services/permissionService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validatePermissionUpdate } from "#middlewares/validators/permission";

export default (_express: Application) => {
	const permissionProvider = new PermissionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /permission/{id}:
		 *   get:
		 *     tags: [Permission]
		 *     summary: Get permission by ID
		 *     description: Retrieve a single permission record by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Permission ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Permission retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Permission"
		 *       404:
		 *         description: Permission not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await permissionProvider.getById({ id: req.params.id! });
					return res.sendOk({ data });
				} catch (error) {
					await permissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /permission/{id}:
		 *   put:
		 *     tags: [Permission]
		 *     summary: Update permission by ID
		 *     description: Update a single permission record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Permission ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/PermissionUpdate"
		 *     responses:
		 *       200:
		 *         description: Permission updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Permission"
		 *       400:
		 *         description: Invalid input data
		 *       404:
		 *         description: Permission not found
		 *       409:
		 *         description: Duplicate permission found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validatePermissionUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await permissionService.updateById(
						req.params.id!,
						req.body,
						req.user?.id || null,
					);
					return res.sendOk({ data, message: "Permission updated successfully" });
				} catch (error) {
					await permissionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
