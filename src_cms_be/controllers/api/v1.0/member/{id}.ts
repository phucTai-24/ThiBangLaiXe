import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { MemberProvider } from "#providers/MemberProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateMemberUpdate } from "#middlewares/validators/member";

export default (_express: Application) => {
	const memberProvider = MemberProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /member/{id}:
		 *   get:
		 *     tags: [Member]
		 *     summary: Get member by ID
		 *     description: Retrieve a single member by ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved member
		 *       404:
		 *         description: Member not found
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await memberProvider.getById({ id: req.params.id! });
					return res.sendOk({ data });
				} catch (error) {
					await memberProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /member/{id}:
		 *   put:
		 *     tags: [Member]
		 *     summary: Update member
		 *     description: Update an existing member
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/MemberUpdate"
		 *     responses:
		 *       200:
		 *         description: Member updated successfully
		 *       404:
		 *         description: Member not found
		 */
		put: {
			middleware: [verify, queryModifier, validateMemberUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await memberProvider.put(req.params.id!, {
						...req.body,
						updated_at: new Date(),
						updated_by: req.user?.id || null,
					});
					return res.sendOk({ data, message: "Member updated successfully" });
				} catch (error) {
					await memberProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /member/{id}:
		 *   delete:
		 *     tags: [Member]
		 *     summary: Delete member
		 *     description: Delete a member by ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Member deleted successfully
		 *       404:
		 *         description: Member not found
		 */
		delete: {
			middleware: [verify, queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					await memberProvider.delete(req.params.id!);
					return res.sendOk({ data: null, message: "Member deleted successfully" });
				} catch (error) {
					await memberProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
