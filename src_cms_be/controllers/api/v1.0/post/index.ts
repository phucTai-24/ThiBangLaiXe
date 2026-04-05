import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validatePostCreate } from "#middlewares/validators/post";
import { PostProvider } from "#providers/PostProvider";
import { postService } from "#services/postService";
import { getAllPostsWithCategories } from "#services/postQueryService";

export default (_express: Application) => {
	const postProvider = PostProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /post:
		 *   get:
		 *     tags: [Post]
		 *     summary: Get all post
		 *     description: |
		 *       Retrieve a list of post with pagination, filtering and sorting (includes categories).
		 *       Extra filter supported:
		 *       - filters=category.type==trade (allowed: post, trade, industry, page)
		 *       - filters=category.type==(trade|post)
		 *       - filters=category.id=={categoryId}
		 *     parameters:
		 *       - $ref: "#/components/parameters/filters"
		 *       - $ref: "#/components/parameters/sortField"
		 *       - $ref: "#/components/parameters/sortOrder"
		 *       - $ref: "#/components/parameters/page"
		 *       - $ref: "#/components/parameters/pageSize"
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved post
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await getAllPostsWithCategories(req);
					return res.sendOk({ data });
				} catch (error) {
					await postProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /post:
		 *   post:
		 *     tags: [Post]
		 *     summary: Create a post
		 *     description: |
		 *       Create a new post record.
		 *       If category_ids is provided, it will link this post to those categories.
		 *       Rule: all category_ids must exist and must be same type (post | trade | industry | page).
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             allOf:
		 *               - $ref: "#/components/schemas/PostMutate"
		 *               - type: object
		 *                 properties:
		 *                   category_ids:
		 *                     type: array
		 *                     items: { type: string, format: uuid }
		 *                   status:
		 *                     type: string
		 *                     default: pending
		 *                   type:
		 *                     type: string
		 *                     nullable: true
		 *     responses:
		 *       200:
		 *         description: Post created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       allOf:
		 *                         - $ref: "#/components/schemas/Post"
		 *                         - type: object
		 *                           properties:
		 *                             status:
		 *                               type: string
		 *                               enum: [pending, published, rejected]
		 *                             type:
		 *                               type: string
		 *                               enum: [buy, sell, partner]
		 *                               nullable: true
		 *                             category_ids:
		 *                               type: array
		 *                               items:
		 *                                 type: object
		 *                                 properties:
		 *                                   id: { type: string, format: uuid }
		 *                                   name: { type: string }
		 *                                   slug: { type: string }
		 *                                   type: { type: string, enum: [post, trade, industry, page] }
		 *                                   url: { type: string, nullable: true }
		 *       400:
		 *         description: Invalid input or category type invalid
		 *       404:
		 *         description: Category not found
		 */
		post: {
      middleware: [verify, queryModifier, validatePostCreate],
      handler: async (req: Req, res: Res) => {
        try {
          const actorId = req.user?.id ?? null;
          const data = await postService.create(req.body, actorId);
          return res.sendOk({ data, message: "Post created successfully" });
        } catch (error) {
          await postProvider.logError(error as Error);
          return res.error(error);
        }
      },
    },
  };
};