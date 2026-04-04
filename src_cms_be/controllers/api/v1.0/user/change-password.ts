import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import { queryModifier } from "#middlewares/query-modifier";
import { validateUserChangePassword } from "#middlewares/validators/user";
import { UserProvider } from "#providers/UserProvider";
import { changePasswordForCurrentUser } from "#services/userPasswordService";
import { GenericError } from "#interfaces/error/generic";

export default (_express: Application) => {
	const userProvider = UserProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /user/change-password:
		 *   put:
		 *     tags: [User]
		 *     summary: Change password (current user)
		 *     description: |
		 *       Change password for current authenticated user.
		 *       BE validation:
		 *       - newPassword must be at least 6 characters
		 *       - newPassword must not equal oldPassword
		 *       Higher password rules are handled by FE.
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/UserChangePassword"
		 *     responses:
		 *       200:
		 *         description: Password changed successfully
		 *       400:
		 *         description: Invalid input or wrong old password
		 *       401:
		 *         description: Unauthorized
		 *       404:
		 *         description: User auth not found
		 */
		put: {
			middleware: [verify, queryModifier, validateUserChangePassword],
			handler: async (req: Req, res: Res) => {
				try {
					const userId = req.user?.id;
					if (!userId) {
						throw new GenericError({ vi: "Chưa đăng nhập", en: "Unauthorized" }, "UNAUTHORIZED", 401);
					}

					await changePasswordForCurrentUser({ userId, body: req.body });

					return res.sendOk({
						data: null,
						message: "Đổi mật khẩu thành công",
						message_en: "Password changed successfully",
					});
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
