import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { MemberProvider } from "#providers/MemberProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateMemberCreate, validateMemberUpdate } from "#middlewares/validators/member";

export default (_express: Application) => {
	const memberProvider = MemberProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /member:
		 *   get:
		 *     tags: [Member]
		 *     summary: Get all members
		 *     description: Retrieve a list of members with pagination, filtering and sorting
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
		 *         description: Successfully retrieved members
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await memberProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await memberProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /member:
		 *   post:
		 *     tags: [Member]
		 *     summary: Create a member
		 *     description: Create a new member record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/MemberCreate"
		 *     responses:
		 *       200:
		 *         description: Member created successfully
		 */
		post: {
			middleware: [verify, queryModifier, validateMemberCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await memberProvider.create({
						...req.body,
						created_at: new Date(),
						created_by: req.user?.id || null,
					});
					return res.sendOk({ data, message: "Member created successfully" });
				} catch (error) {
					await memberProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
