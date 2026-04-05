import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import { getUserWithRolesAndPermissions } from "#services/userService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/me:
		 *   get:
		 *     tags: [Authentication]
		 *     summary: Get my info
		 *     description: Get current authenticated user's complete information including roles and permissions
		 *     security:
		 *       - BearerAuth: []
		 *     responses:
		 *       200:
		 *         description: User info retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/UserMeResponse"
		 *       401:
		 *         $ref: '#/components/responses/Unauthorized'
		 */
		get: {
			middleware: [verify],
			handler: async (req: Req, res: Res) => {
				try {
					const userId = req.user?.id;

					if (!userId) {
						return res.error({
							message: { vi: "Không tìm thấy thông tin user", en: "User not found" },
							status: 401,
						});
					}

					const data = await getUserWithRolesAndPermissions(userId);

					return res.sendOk({ data });
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
