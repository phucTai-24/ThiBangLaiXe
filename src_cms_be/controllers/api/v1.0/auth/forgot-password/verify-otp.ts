import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import { createRateLimit } from "#middlewares/auth";
import { validateForgotPasswordVerifyOtp } from "#middlewares/validators/auth";
import { verifyResetPasswordOtp } from "#services/userPasswordResetService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/forgot-password/verify-otp:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: Forgot password - verify OTP
		 *     description: Verify OTP and return reset_token
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: '#/components/schemas/ForgotPasswordVerifyOtpRequest'
		 *     responses:
		 *       200:
		 *         description: OTP verified
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 responseData:
		 *                   $ref: '#/components/schemas/ForgotPasswordVerifyOtpResponse'
		 *       400:
		 *         $ref: '#/components/responses/BadRequest'
		 *       429:
		 *         description: Too many attempts
		 */
		post: {
			middleware: [createRateLimit(15 * 60 * 1000, 50), validateForgotPasswordVerifyOtp],
			handler: async (req: Req, res: Res) => {
				try {
					const { email, otp } = req.body as { email: string; otp: string };

					const result = await verifyResetPasswordOtp({ email, otp });

					return res.sendOk({
						data: result,
						message: "Xác thực OTP thành công",
						message_en: "OTP verified",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
