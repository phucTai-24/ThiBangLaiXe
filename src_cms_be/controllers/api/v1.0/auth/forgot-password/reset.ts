import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import { createRateLimit } from "#middlewares/auth";
import { validateForgotPasswordReset } from "#middlewares/validators/auth";
import { resetPasswordWithToken } from "#services/userPasswordResetService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/forgot-password/reset:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: Forgot password - confirm reset
		 *     description: Reset password using reset_token
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: '#/components/schemas/ForgotPasswordResetRequest'
		 *     responses:
		 *       200:
		 *         description: Password reset successfully
		 *       400:
		 *         $ref: '#/components/responses/BadRequest'
		 *       429:
		 *         description: Too many requests
		 */
		post: {
			middleware: [createRateLimit(15 * 60 * 1000, 30), validateForgotPasswordReset],
			handler: async (req: Req, res: Res) => {
				try {
					const { reset_token, new_password } = req.body as { reset_token: string; new_password: string };

					await resetPasswordWithToken({ reset_token, new_password });

					return res.sendOk({
						data: null,
						message: "Đặt lại mật khẩu thành công",
						message_en: "Password reset successfully",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
