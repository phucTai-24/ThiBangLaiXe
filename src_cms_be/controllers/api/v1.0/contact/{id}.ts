import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { ContactProvider } from "#providers/ContactProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validateContactUpdate } from "#middlewares/validators/contact";

export default (_express: Application) => {
	const contactProvider = new ContactProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /contact/{id}:
		 *   get:
		 *     tags: [Contact]
		 *     summary: Get contact by ID
		 *     description: Retrieve a single contact record by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Contact ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: Contact retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Contact"
		 *       404:
		 *         description: Contact not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await contactProvider.getById({ id: req.params.id! });
					return res.sendOk({ data });
				} catch (error) {
					await contactProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /contact/{id}:
		 *   put:
		 *     tags: [Contact]
		 *     summary: Update contact by ID
		 *     description: Update a single contact record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Contact ID
		 *         schema:
		 *           type: string
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/ContactMutate"
		 *     responses:
		 *       200:
		 *         description: Contact updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Contact"
		 *       404:
		 *         description: Contact not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateContactUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await contactProvider.put(req.params.id!, {
						...req.body,
						updated_at: new Date(),
						updated_by: req.user?.id || null,
					});
					return res.sendOk({ data });
				} catch (error) {
					await contactProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /contact/{id}:
		 *   delete:
		 *     tags: [Contact]
		 *     summary: Delete contact by ID
		 *     description: Delete a single contact record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Contact ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: Contact deleted successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       type: boolean
		 *                       example: true
		 *       404:
		 *         description: Contact not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await contactProvider.delete(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await contactProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
