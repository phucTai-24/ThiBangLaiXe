import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import queryModifier from "#middlewares/query-modifier";
import verify from "#middlewares/auth";

import { validatePageConfigCreate } from "#middlewares/validators/pageConfig";
import { PageConfigProvider } from "#providers/PageConfigProvider";
import { pageConfigService } from "#services/pageConfigService";

export default (_express: Application) => {
	const pageConfigProvider = PageConfigProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /pageConfig:
		 *   get:
		 *     tags: [PageConfig]
		 *     summary: Get hierarchical pageConfig
		 *     description: Retrieve hierarchical page config by id, static_link, or code. If no parameters are provided, returns the root hierarchical structure.
		 *     parameters:
		 *       - in: query
		 *         name: id
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *         description: ID of the page config to retrieve
		 *       - in: query
		 *         name: static_link
		 *         schema:
		 *           type: string
		 *         description: Static link of the page config to retrieve
		 *       - in: query
		 *         name: code
		 *         schema:
		 *           type: string
		 *         description: Code of the page config to retrieve
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved hierarchical page config
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const options: { id?: string; staticLink?: string; code?: string } = {};

					if (typeof req.query.id === "string" && req.query.id.trim()) options.id = req.query.id.trim();
					if (typeof req.query.static_link === "string" && req.query.static_link.trim())
						options.staticLink = req.query.static_link.trim();
					if (typeof req.query.code === "string" && req.query.code.trim()) options.code = req.query.code.trim();

					const data = await pageConfigService.getHierarchicalWithCategories(options);
					return res.sendOk({ data });
				} catch (error) {
					await pageConfigProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /pageConfig:
		 *   post:
		 *     tags: [PageConfig]
		 *     summary: Create a pageConfig
		 *     description: Create a new pageConfig record. parent_id is required. level is computed from parent and must not be sent.
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             type: object
		 *             required: [code, name, static_link, parent_id]
		 *             properties:
		 *               code:
		 *                 type: string
		 *                 maxLength: 50
		 *               name:
		 *                 type: string
		 *                 maxLength: 255
		 *               static_link:
		 *                 type: string
		 *                 maxLength: 255
		 *               static_link_en:
		 *                 type: string
		 *                 nullable: true
		 *               parent_id:
		 *                 type: string
		 *                 format: uuid
		 *               sort_order:
		 *                 type: integer
		 *                 minimum: 0
		 *                 nullable: true
		 *               is_article:
		 *                 type: boolean
		 *                 nullable: true
		 *               category_ids:
		 *                 type: array
		 *                 items:
		 *                   type: string
		 *                   format: uuid
		 *     responses:
		 *       200:
		 *         description: PageConfig created successfully
		 */
		post: {
			middleware: [verify, queryModifier, validatePageConfigCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const data = await pageConfigService.create(req.body, actorId);
					return res.sendOk({ data, message: "PageConfig created successfully" });
				} catch (error) {
					await pageConfigProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
