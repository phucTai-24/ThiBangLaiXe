import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { PositionProvider } from "#providers/PositionProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validateId } from "#middlewares/validators";
import { validatePositionUpdate } from "#middlewares/validators/position";

export default (_express: Application) => {
	const positionProvider = new PositionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /position/{id}:
		 *   get:
		 *     tags: [Position]
		 *     summary: Get position by ID
		 *     description: Retrieve a single position record by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Position ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: Position retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Position"
		 *       404:
		 *         description: Position not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await positionProvider.getById({ id: req.params.id! });
					return res.sendOk({ data });
				} catch (error) {
					await positionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /position/{id}:
		 *   put:
		 *     tags: [Position]
		 *     summary: Update position by ID
		 *     description: Update a single position record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Position ID
		 *         schema:
		 *           type: string
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/PositionMutate"
		 *     responses:
		 *       200:
		 *         description: Position updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Position"
		 *       404:
		 *         description: Position not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validatePositionUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await positionProvider.put(req.params.id!, {
						...req.body,
						updated_at: new Date(),
						updated_by: req.user?.id || null,
					});
					return res.sendOk({ data });
				} catch (error) {
					await positionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /position/{id}:
		 *   delete:
		 *     tags: [Position]
		 *     summary: Delete position by ID
		 *     description: Delete a single position record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Position ID
		 *         schema:
		 *           type: string
		 *     responses:
		 *       200:
		 *         description: Position deleted successfully
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
		 *         description: Position not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await positionProvider.delete(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await positionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
