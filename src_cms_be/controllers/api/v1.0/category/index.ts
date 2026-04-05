import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { CategoryProvider } from "#providers/CategoryProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateCategoryCreate } from "#middlewares/validators/category";
import { getAllCategories } from "#services/categoryQueryService";
import { categoryService, type CategoryCreateDTO } from "#services/categoryService";

export default (_express: Application) => {
	const categoryProvider = new CategoryProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /category:
		 *   get:
		 *     tags: [Category]
		 *     summary: Get all category
		 *     description: Retrieve a list of category with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved category
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await getAllCategories(req);
					return res.sendOk({ data });
				} catch (error) {
					await categoryProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /category:
		 *   post:
		 *     tags: [Category]
		 *     summary: Create a category
		 *     description: Create a new category record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/CategoryMutate"
		 *     responses:
		 *       200:
		 *         description: Category created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Category"
		 */
		post: {
			middleware: [verify, queryModifier, validateCategoryCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const payload = req.body as CategoryCreateDTO;

					const data = await categoryService.create(payload, actorId);
					return res.sendOk({ data, message: "Category created successfully" });
				} catch (error) {
					await categoryProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};