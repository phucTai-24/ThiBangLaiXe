import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import queryModifier from "#middlewares/query-modifier";
import verify from "#middlewares/auth";

import { validateId } from "#middlewares/validators";
import { validatePageConfigUpdate } from "#middlewares/validators/pageConfig";
import { PageConfigProvider } from "#providers/PageConfigProvider";
import { pageConfigService } from "#services/pageConfigService";

export default (_express: Application) => {
	const pageConfigProvider = PageConfigProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /pageConfig/{id}:
		 *   get:
		 *     tags: [PageConfig]
		 *     summary: Get hierarchical pageConfig by ID
		 *     description: Retrieve hierarchical page config by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: PageConfig ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Hierarchical page config retrieved successfully
		 *       404:
		 *         description: PageConfig not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await pageConfigService.getHierarchicalWithCategories({ id: req.params.id! });
					return res.sendOk({ data });
				} catch (error) {
					await pageConfigProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /pageConfig/{id}:
		 *   put:
		 *     tags: [PageConfig]
		 *     summary: Update pageConfig by ID
		 *     description: Update a single pageConfig record by its ID. level is computed if parent_id changes and must not be sent.
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: PageConfig ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             type: object
		 *             properties:
		 *               code: { type: string, maxLength: 50 }
		 *               name: { type: string, maxLength: 255 }
		 *               static_link: { type: string, maxLength: 255 }
		 *               static_link_en: { type: string, nullable: true }
		 *               parent_id: { type: string, format: uuid }
		 *               sort_order: { type: integer, minimum: 0, nullable: true }
		 *               is_article: { type: boolean, nullable: true }
		 *     responses:
		 *       200:
		 *         description: PageConfig updated successfully
		 *       404:
		 *         description: PageConfig not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validatePageConfigUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const data = await pageConfigService.updateById(req.params.id!, req.body, actorId);
					return res.sendOk({ data });
				} catch (error) {
					await pageConfigProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /pageConfig/{id}:
		 *   delete:
		 *     tags: [PageConfig]
		 *     summary: Delete pageConfig by ID
		 *     description: Delete a single pageConfig record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: PageConfig ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: PageConfig deleted successfully
		 *       404:
		 *         description: PageConfig not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await pageConfigService.deleteById(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await pageConfigProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
