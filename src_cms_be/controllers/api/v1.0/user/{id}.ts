import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { UserProvider } from "#providers/UserProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validateUserUpdate } from "#middlewares/validators/user";
import { GenericError } from "#interfaces/error/generic";
import { buildUserWithRoles, updateUserProfileById } from "#services/userService";

export default (_express: Application) => {
	const userProvider = UserProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /user/{id}:
		 *   get:
		 *     tags: [User]
		 *     summary: Get user by ID
		 *     description: Retrieve a single user record by its ID (includes roles + avatar
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: User ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: User retrieved successfully
		 *       404:
		 *         description: User not found
		 */
		get: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const id = req.params.id!;
					const data = await userProvider.getById({ id });

					if (!data) {
						throw new GenericError({ vi: "User không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
					}

					const withRoles = await buildUserWithRoles(data);
					return res.sendOk({ data: withRoles });
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /user/{id}:
		 *   put:
		 *     tags: [User]
		 *     summary: Update user by ID
		 *     description: |
		 *       Update a single user record by its ID (response includes roles + avatar).
		 *       Note: avatar_id should be fileId (uuid) returned by /file/upload (recommended). Legacy URL still supported.
		 *       birth_date uses DATEONLY format: YYYY-MM-DD
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: User ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/UserUpdate"
		 *     responses:
		 *       200:
		 *         description: User updated successfully
		 *       404:
		 *         description: User not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateUserUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const id = req.params.id!;
					const actorId = req.user?.id || null;

					const withRoles = await updateUserProfileById({
						id,
						body: req.body,
						actorId,
					});

					return res.sendOk({ data: withRoles });
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /user/{id}:
		 *   delete:
		 *     tags: [User]
		 *     summary: Delete user by ID
		 *     description: Delete a single user record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: User ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: User deleted successfully
		 *       404:
		 *         description: User not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userProvider.delete(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
