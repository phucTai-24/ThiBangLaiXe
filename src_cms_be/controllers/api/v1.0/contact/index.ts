import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { ContactProvider } from "#providers/ContactProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateContactCreate } from "#middlewares/validators/contact";

export default (_express: Application) => {
	const contactProvider = new ContactProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /contact:
		 *   get:
		 *     tags: [Contact]
		 *     summary: Get all contact
		 *     description: Retrieve a list of contact with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved contact
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await contactProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await contactProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /contact:
		 *   post:
		 *     tags: [Contact]
		 *     summary: Create a contact
		 *     description: Create a new contact record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/ContactMutate"
		 *     responses:
		 *       200:
		 *         description: Contact created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Contact"
		 */
		post: {
			middleware: [verify, queryModifier, validateContactCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await contactProvider.create({
						...req.body,
						created_at: new Date(),
						created_by: req.user?.id || null,
					});
					return res.sendOk({ data, message: "Contact created successfully" });
				} catch (error) {
					await contactProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
