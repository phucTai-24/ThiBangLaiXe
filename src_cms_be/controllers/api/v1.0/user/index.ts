import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { UserProvider } from "#providers/UserProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify, { AuthService } from "#middlewares/auth";
import { validateUserCreate } from "#middlewares/validators/user";
import { GenericError } from "#interfaces/error/generic";
import { buildUsersWithRoles, buildUserProfilePatch, finalizeCreatedUserProfile } from "#services/userService";

const getCreatedId = (created: unknown): string | null => {
	if (!created || typeof created !== "object") return null;
	if (!("id" in created)) return null;
	const id = (created as { id?: unknown }).id;
	return typeof id === "string" && id.trim().length ? id : null;
};

export default (_express: Application) => {
	const userProvider = UserProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /user:
		 *   get:
		 *     tags: [User]
		 *     summary: Get all user
		 *     description: Retrieve a list of user with pagination, filtering and sorting (includes roles + avatar)
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
		 *         description: Successfully retrieved users
		 */
		get: {
			middleware: [verify, queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await userProvider.getAll(req.payload || {});
					const rows = Array.isArray((data as { rows?: unknown[] })?.rows) ? (data as { rows: unknown[] }).rows : [];

					const rowsWithRoles = await buildUsersWithRoles(rows);
					(data as { rows?: unknown[] }).rows = rowsWithRoles;

					return res.sendOk({ data });
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /user:
		 *   post:
		 *     tags: [User]
		 *     summary: Create a user
		 *     description: |
		 *       Create a new user record (response includes roles + avatar).
		 *       Note: avatar_url should be fileId (uuid) returned by /file/upload (recommended). Legacy URL still supported.
		 *       birth_date uses DATEONLY format: YYYY-MM-DD
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/UserCreate"
		 *     responses:
		 *       200:
		 *         description: User created successfully
		 */
		post: {
			middleware: [verify, queryModifier, validateUserCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id || null;
					const prePatch = await buildUserProfilePatch({ body: req.body, mode: "create", actorId });
					const created = await AuthService.register(req.body);
					const createdId = getCreatedId(created);
					if (!createdId) {
						throw new GenericError({ vi: "Tạo user thất bại", en: "Create user failed" }, "BAD_REQUEST", 400);
					}

					const withRoles = await finalizeCreatedUserProfile({ id: createdId, actorId, patch: prePatch });
					return res.sendOk({ data: withRoles });
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
