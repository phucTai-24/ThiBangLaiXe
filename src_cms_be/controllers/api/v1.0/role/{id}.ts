import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { RoleProvider } from "#providers/RoleProvider";
import { roleService } from "#services/roleService";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validateRoleUpdate } from "#middlewares/validators/role";

export default (_express: Application) => {
	const roleProvider = new RoleProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /role/{id}:
		 *   put:
		 *     tags: [Role]
		 *     summary: Update role by ID
		 *     description: Update a single role record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Role ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/RoleUpdate"
		 *     responses:
		 *       200:
		 *         description: Role updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Role"
		 *       400:
		 *         description: Invalid input data
		 *       404:
		 *         description: Role not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateRoleUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await roleService.updateById(
						req.params.id!,
						req.body,
						req.user?.id || null,
					);
					return res.sendOk({ data, message: "Role updated successfully" });
				} catch (error) {
					await roleProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
