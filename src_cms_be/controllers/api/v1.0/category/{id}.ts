import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { CategoryProvider } from "#providers/CategoryProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validateCategoryUpdate } from "#middlewares/validators/category";
import { categoryService, type CategoryUpdateDTO } from "#services/categoryService";

export default (_express: Application) => {
	const categoryProvider = new CategoryProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /category/{id}:
		 *   get:
		 *     tags: [Category]
		 *     summary: Get category by ID
		 *     description: Retrieve a single category record by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Category ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: Category retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Category"
		 *       404:
		 *         description: Category not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await categoryService.getById(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await categoryProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /category/{id}:
		 *   put:
		 *     tags: [Category]
		 *     summary: Update category by ID
		 *     description: Update a single category record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Category ID
		 *         schema:
		 *           type: string
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/CategoryMutate"
		 *     responses:
		 *       200:
		 *         description: Category updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Category"
		 *       404:
		 *         description: Category not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateCategoryUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const payload = req.body as CategoryUpdateDTO;

					const data = await categoryService.updateById(req.params.id!, payload, actorId);
					return res.sendOk({ data });
				} catch (error) {
					await categoryProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /category/{id}:
		 *   delete:
		 *     tags: [Category]
		 *     summary: Delete category by ID
		 *     description: Delete a single category record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Category ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: Category deleted successfully
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
		 *         description: Category not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await categoryService.deleteById(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await categoryProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
