import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import { AuthService } from "#services/authService";
import { validateRefreshToken } from "#middlewares/validators/auth";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/refresh:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: Refresh access token
		 *     description: Get a new access token using refresh token from cookie or body
		 *     requestBody:
		 *       required: false
		 *       content:
		 *         application/json:
		 *           schema:
		 *             type: object
		 *             properties:
		 *               refresh_token:
		 *                 type: string
		 *                 description: Refresh token (optional if sent via cookie)
		 *               device_info:
		 *                 type: object
		 *                 description: Device information
		 *     responses:
		 *       200:
		 *         description: Token refreshed successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: true
		 *                 data:
		 *                   $ref: '#/components/schemas/LoginResponse'
		 *                 message:
		 *                   type: object
		 *                   properties:
		 *                     vi:
		 *                       type: string
		 *                       example: "Làm mới token thành công"
		 *                     en:
		 *                       type: string
		 *                       example: "Token refreshed successfully"
		 *       401:
		 *         $ref: '#/components/responses/Unauthorized'
		 */
		post: {
			middleware: [validateRefreshToken as any],
			handler: async (req: Req, res: Res) => {
				try {
					// Try to get refresh token from body first, then fallback to cookie
					const refreshToken = req.body.refresh_token || req.cookies?.refresh_token;
					const { device_info } = req.body;

					const tokens = await AuthService.refreshToken(refreshToken, device_info);

					// Set new tokens in HttpOnly cookies
					const accessCookieOptions = AuthService.getAccessTokenCookieOptions();
					const refreshCookieOptions = AuthService.getRefreshTokenCookieOptions();

					res.cookie("access_token", tokens.access_token, accessCookieOptions);
					res.cookie("refresh_token", tokens.refresh_token, refreshCookieOptions);

					// Check header for token inclusion (safer than body parameter)
					// const includeTokens = req.headers["x-include-tokens"] === "true" || process.env.NODE_ENV === "development";
					const includeTokens = true;

					// Return optimized response with session info
					return res.sendOk({
						data: {
							session: {
								expires_at: new Date(Date.now() + tokens.expires_in * 1000),
								refresh_expires_at: new Date(Date.now() + tokens.refresh_expires_in * 1000),
							},
							// Include tokens only for development/Swagger testing
							...(includeTokens
								? {
									access_token: tokens.access_token,
									refresh_token: tokens.refresh_token,
									expires_in: tokens.expires_in,
									token_type: tokens.token_type,
								}
								: {}),
						},
						message: "Làm mới token thành công",
						message_en: "Token refreshed successfully",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
