import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import { queryModifier } from "#middlewares/query-modifier";
import { validateLogoCreate } from "#middlewares/validators/logo";
import { LogoProvider } from "#providers/LogoProvider";
import { logoService, type LogoCreateDTO } from "#services/logoService";

export default (_express: Application) => {
	const logoProvider = new LogoProvider();

	return <Resource>{
		/**
		 * @openapi
		 * /logo:
		 *   get:
		 *     tags: [Logo]
		 *     summary: Get all logos
		 *     description: Retrieve a list of logos with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved logos
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await logoService.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await logoProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /logo:
		 *   post:
		 *     tags: [Logo]
		 *     summary: Create a logo
		 *     description: Create a new logo record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/LogoCreate"
		 *     responses:
		 *       200:
		 *         description: Logo created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Logo"
		 *       400:
		 *         description: Invalid input data
		 *       404:
		 *         description: File not found
		 *       409:
		 *         description: Duplicate or conflict data
		 */
		post: {
			middleware: [verify, queryModifier, validateLogoCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const actor_id = req.user?.id ?? null;
					const payload = req.body as LogoCreateDTO;

					const data = await logoService.create(payload, actor_id);

					return res.sendOk({
						data,
						message: "Logo created successfully",
					});
				} catch (error) {
					await logoProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};