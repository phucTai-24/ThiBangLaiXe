import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import queryModifier from "#middlewares/query-modifier";
import verify from "#middlewares/auth";

import { BusinessProvider } from "#providers/BusinessProvider";
import { businessService } from "#services/businessService";
import { validateBusinessUpdate } from "#middlewares/validators/business";

export default (_express: Application) => {
	const businessProvider = BusinessProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /business/{id}:
		 *   get:
		 *     tags: [Business]
		 *     summary: Get business by ID
		 *     description: Retrieve a single business record by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Business retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/BusinessGetOneResponse"
		 *       404:
		 *         description: Business not found
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await businessService.getById(req.params.id);
					return res.sendOk({ data });
				} catch (error) {
					await businessProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /business/{id}:
		 *   put:
		 *     tags: [Business]
		 *     summary: Update business by ID
		 *     description: Update a single business record by its ID
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
		 *             $ref: "#/components/schemas/BusinessUpdate"
		 *     responses:
		 *       200:
		 *         description: Business updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/BusinessGetOneResponse"
		 *       400:
		 *         description: Bad request
		 *       404:
		 *         description: Business not found
		 *       409:
		 *         description: Conflict (slug already exists)
		 */
		put: {
			middleware: [verify, queryModifier, validateBusinessUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const data = await businessService.updateById(req.params.id, req.body, actorId);
					return res.sendOk({ data });
				} catch (error) {
					await businessProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /business/{id}:
		 *   delete:
		 *     tags: [Business]
		 *     summary: Delete business by ID
		 *     description: Delete a single business record by its ID
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
		 *         description: Business deleted successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/BusinessDeleteResponse"
		 *       404:
		 *         description: Business not found
		 */
		delete: {
			middleware: [verify, queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await businessService.deleteById(req.params.id);
					return res.sendOk({ data });
				} catch (error) {
					await businessProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};