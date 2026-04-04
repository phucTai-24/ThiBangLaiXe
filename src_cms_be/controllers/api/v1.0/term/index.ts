import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import queryModifier from "#middlewares/query-modifier";
import { validateTermCreate } from "#middlewares/validators/term";
import { termService } from "#services/termService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /term:
		 *   get:
		 *     tags: [Term]
		 *     summary: Get all terms
		 *     description: Retrieve a list of terms with positions and members (pagination, filtering, sorting)
		 *     parameters:
		 *       - $ref: "#/components/parameters/filters"
		 *       - $ref: "#/components/parameters/sortField"
		 *       - $ref: "#/components/parameters/sortOrder"
		 *       - $ref: "#/components/parameters/page"
		 *       - $ref: "#/components/parameters/pageSize"
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved terms
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       type: object
		 *                       properties:
		 *                         rows:
		 *                           type: array
		 *                           items:
		 *                             $ref: "#/components/schemas/TermResponse"
		 *                         count:
		 *                           type: integer
		 *                           example: 1
		 *                         page:
		 *                           type: integer
		 *                           example: 1
		 *                         pageSize:
		 *                           type: integer
		 *                           example: 10
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await termService.getAll(req.payload || {});

					return res.sendOk({ data });
				} catch (error) {
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /term:
		 *   post:
		 *     tags: [Term]
		 *     summary: Create a term
		 *     description: Create a new term with positions and members
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/TermCreateRequest"
		 *     responses:
		 *       201:
		 *         description: Term created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/TermResponse"
		 *       400:
		 *         description: Invalid input
		 */
		post: {
			middleware: [verify, queryModifier, validateTermCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await termService.create(req.body, req.user?.id || null);

					return res.sendOk({
						data,
						message: "Term created successfully",
						statusCode: 201,
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};