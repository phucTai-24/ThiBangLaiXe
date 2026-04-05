import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import { authenticate } from "#middlewares/auth";
import { AuthService } from "#services/authService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/logout:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: Logout user
		 *     description: Logout user and invalidate current session
		 *     security:
		 *       - BearerAuth: []
		 *     responses:
		 *       200:
		 *         description: Logged out successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: true
		 *                 message:
		 *                   type: object
		 *                   properties:
		 *                     vi:
		 *                       type: string
		 *                       example: "Đăng xuất thành công"
		 *                     en:
		 *                       type: string
		 *                       example: "Logged out successfully"
		 *       401:
		 *         $ref: '#/components/responses/Unauthorized'
		 */
		post: {
			middleware: [authenticate],
			handler: async (req: Req, res: Res) => {
				try {
					// Get token from cookie or header
					const token = req.cookies?.access_token || req.header("Authorization")?.split(" ")[1];

					if (token) {
						await AuthService.logout(token);
					}

					// Clear HttpOnly cookies
					res.clearCookie("access_token", {
						httpOnly: true,
						secure: process.env.NODE_ENV === "production",
						sameSite: "strict",
						path: "/api",
					});

					res.clearCookie("refresh_token", {
						httpOnly: true,
						secure: process.env.NODE_ENV === "production",
						sameSite: "strict",
						path: "/api/v1.0/auth/refresh",
					});

					return res.sendOk({
						data: null,
						message: "Đăng xuất thành công",
						message_en: "Logged out successfully",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
