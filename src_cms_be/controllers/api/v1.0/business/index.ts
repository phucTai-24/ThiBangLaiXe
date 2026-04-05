import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import queryModifier from "#middlewares/query-modifier";
import verify from "#middlewares/auth";

import { BusinessProvider } from "#providers/BusinessProvider";
import { businessService } from "#services/businessService";
import { validateBusinessCreate } from "#middlewares/validators/business";

export default (_express: Application) => {
	const businessProvider = BusinessProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /business:
		 *   get:
		 *     tags: [Business]
		 *     summary: Get all business
		 *     description: Retrieve a list of business with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved business
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/BusinessGetAllResponse"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await businessService.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await businessProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /business:
		 *   post:
		 *     tags: [Business]
		 *     summary: Create a business
		 *     description: Create a new business record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/BusinessCreate"
		 *     responses:
		 *       200:
		 *         description: Business created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/BusinessGetOneResponse"
		 *       400:
		 *         description: Bad request
		 *       404:
		 *         description: Referenced logo file not found
		 *       409:
		 *         description: Conflict (slug already exists)
		 */
		post: {
			middleware: [verify, queryModifier, validateBusinessCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const data = await businessService.create(req.body, actorId);
					return res.sendOk({ data, message: "Business created successfully" });
				} catch (error) {
					await businessProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};