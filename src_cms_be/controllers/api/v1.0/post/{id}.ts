import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validatePostUpdate } from "#middlewares/validators/post";
import { PostProvider } from "#providers/PostProvider";
import { postService } from "#services/postService";

export default (_express: Application) => {
	const postProvider = PostProvider.getInstance();

	return <Resource>{
		/**
		 * @openapi
		 * /post/{id}:
		 *   get:
		 *     tags: [Post]
		 *     summary: Get post by ID
		 *     description: Retrieve a single post record by its ID (includes categories)
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Post ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Post retrieved successfully
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
		 *       404:
		 *         description: Post not found
		 */
		get: {
      	middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await postService.getById(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await postProvider.logError(error as Error);
			return res.error(error);
        }
      },
    },

		/**
		 * @openapi
		 * /post/{id}:
		 *   put:
		 *     tags: [Post]
		 *     summary: Update post by ID
		 *     description: |
		 *       Update a post by ID.
		 *       category_ids behavior:
		 *       - Not provided: do not change existing category mappings
		 *       - Provided as []: remove all category mappings
		 *       - Provided as [ids...]: replace all mappings by the provided ids
		 *       Rule: all category_ids must exist and must be same type (post | trade | industry | page).
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Post ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             allOf:
		 *               - $ref: "#/components/schemas/PostMutate"
		 *               - type: object
		 *                 properties:
		 *                   status:
		 *                     type: string
		 *                     enum: [pending, published, rejected]
		 *                   type:
		 *                     type: string
		 *                     enum: [buy, sell, partner]
		 *                     nullable: true
		 *                   category_ids:
		 *                     type: array
		 *                     items: { type: string, format: uuid }
		 *     responses:
		 *       200:
		 *         description: Post updated successfully
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
		 *         description: Post not found or Category not found
		 */
		put: {
		middleware: [verify, queryModifier, validateId, validatePostUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const actorId = req.user?.id ?? null;
					const data = await postService.updateById(req.params.id!, req.body, actorId);
					return res.sendOk({ data });
				} catch (error) {
					await postProvider.logError(error as Error);
				return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /post/{id}:
		 *   delete:
		 *     tags: [Post]
		 *     summary: Delete post by ID
		 *     description: Delete a single post record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Post ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Post deleted successfully
		 *       404:
		 *         description: Post not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await postProvider.delete(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await postProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
