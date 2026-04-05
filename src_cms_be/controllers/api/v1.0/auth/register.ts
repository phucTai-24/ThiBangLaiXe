import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { UserProvider } from "#providers/UserProvider";
import { Req, Res } from "#interfaces/IApi";
import { validateRegister } from "#middlewares/validators/auth";
import { userAccountService } from "#services/userAccountService";

export default (_express: Application) => {
	const userProvider = UserProvider.getInstance();
	return <Resource>{
		/**
		 * @openapi
		 * /auth/register:
		 *   post:
		 *     tags: [Authentication]
		 *     summary: Register a new account
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/UserCreate"
		 *     responses:
		 *       200:
		 *         description: User registered successfully
		 *       400:
		 *         description: Validation error
		 *       409:
		 *         description: Conflict (email/username already exists)
		 */
		post: {
			middleware: [validateRegister],
			handler: async (req: Req, res: Res) => {
				try {
					// actorId = null because this is public registration
					const data = await userAccountService.createUser(req.body, null);
					return res.sendOk({ data });
				} catch (error) {
					await userProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
