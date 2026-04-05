import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import { createRateLimit } from "#middlewares/auth";
import { validateForgotPasswordSendOtp } from "#middlewares/validators/auth";
import { sendResetPasswordOtp } from "#services/userPasswordResetService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/forgot-password/send-otp:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: Forgot password - send OTP
		 *     description: Send OTP to email for password reset
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: '#/components/schemas/ForgotPasswordSendOtpRequest'
		 *     responses:
		 *       200:
		 *         description: OTP sent (always returns success to prevent email enumeration)
		 *       400:
		 *         $ref: '#/components/responses/BadRequest'
		 *       429:
		 *         description: Too many requests
		 */
		post: {
			middleware: [createRateLimit(15 * 60 * 1000, 20), validateForgotPasswordSendOtp],
			handler: async (req: Req, res: Res) => {
				try {
					const { email } = req.body as { email: string };

					const result = await sendResetPasswordOtp({ email });

					return res.sendOk({
						data: result,
						message: "Mã OTP đã được gửi",
						message_en: "OTP code has been sent",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
