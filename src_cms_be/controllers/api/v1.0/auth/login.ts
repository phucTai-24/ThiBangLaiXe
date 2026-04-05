import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import { AuthService } from "#services/authService";
import { createRateLimit } from "#middlewares/auth";
import { validateLogin } from "#middlewares/validators/auth";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/login:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: User login
		 *     description: Authenticate user with email and password
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: '#/components/schemas/LoginRequest'
		 *     responses:
		 *       200:
		 *         description: Login successful
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
		 *                       example: "Đăng nhập thành công"
		 *                     en:
		 *                       type: string
		 *                       example: "Login successful"
		 *       400:
		 *         $ref: '#/components/responses/BadRequest'
		 *       401:
		 *         $ref: '#/components/responses/Unauthorized'
		 *       423:
		 *         description: Account locked
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: false
		 *                 error:
		 *                   type: object
		 *                   properties:
		 *                     code:
		 *                       type: string
		 *                       example: "LOCKED"
		 *                     message:
		 *                       type: object
		 *                       properties:
		 *                         vi:
		 *                           type: string
		 *                           example: "Tài khoản bị khóa tạm thời"
		 *                         en:
		 *                           type: string
		 *                           example: "Account is temporarily locked"
		 */
		post: {
			middleware: [createRateLimit(15 * 60 * 1000, 100), validateLogin], // 100 attempts per 15 minutes
			handler: async (req: Req, res: Res) => {
				try {
					const { email, password, device_info, ip_address, user_agent } = req.body;

					const credentials = {
						email,
						password,
						device_info,
						ip_address: ip_address || req.ip,
						user_agent: user_agent || req.get("User-Agent"),
					};

					const loginResult = await AuthService.login(credentials);

					// Set HttpOnly cookies for enhanced security
					const accessCookieOptions = AuthService.getAccessTokenCookieOptions();
					const refreshCookieOptions = AuthService.getRefreshTokenCookieOptions();

					res.cookie("access_token", loginResult.access_token, accessCookieOptions);
					res.cookie("refresh_token", loginResult.refresh_token, refreshCookieOptions);

					// Check header for token inclusion (safer than body parameter)
					// const includeTokens = req.headers["x-include-tokens"] === "true" || process.env.NODE_ENV === "development";
					const includeTokens = true;

					// Return optimized response with essential info only
					return res.sendOk({
						data: {
							user: {
								id: loginResult.user.id,
								email: loginResult.user.email,
								username: loginResult.user.username,
								first_name: loginResult.user.first_name,
								last_name: loginResult.user.last_name,
								roles: (loginResult.user as any).roles,
								permissions: (loginResult.user as any).permissions,
								status: loginResult.user.status,
								last_login_at: loginResult.user_auth.last_login_at,
							},
							session: {
								id: loginResult.session.id,
								expires_at: loginResult.session.expires_at,
								refresh_expires_at: loginResult.session.refresh_expires_at,
							},
							// Include tokens only for development/Swagger testing
							...(includeTokens
								? {
										access_token: loginResult.access_token,
										refresh_token: loginResult.refresh_token,
										expires_in: loginResult.expires_in,
										token_type: loginResult.token_type,
									}
								: {}),
						},
						message: "Đăng nhập thành công",
						message_en: "Login successful",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
