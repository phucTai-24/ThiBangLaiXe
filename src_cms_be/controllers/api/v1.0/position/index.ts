import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { PositionProvider } from "#providers/PositionProvider";
import { Req, Res } from "#interfaces/IApi";
import { queryModifier } from "#middlewares/query-modifier";
import verify from "#middlewares/auth";
import { validatePositionCreate } from "#middlewares/validators/position";

export default (_express: Application) => {
	const positionProvider = new PositionProvider();
	return <Resource>{
		/**
		 * @openapi
		 * /position:
		 *   get:
		 *     tags: [Position]
		 *     summary: Get all position
		 *     description: Retrieve a list of position with pagination, filtering and sorting
		 *     parameters:
		 *       - $ref: '#/components/parameters/filters'
		 *       - $ref: '#/components/parameters/sortField'
		 *       - $ref: '#/components/parameters/sortOrder'
		 *       - $ref: '#/components/parameters/page'
		 *       - $ref: '#/components/parameters/pageSize'
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved position
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: "#/components/schemas/responseGetAllData"
		 */
		get: {
			middleware: [queryModifier],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await positionProvider.getAll(req.payload || {});
					return res.sendOk({ data });
				} catch (error) {
					await positionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
		/**
		 * @openapi
		 * /position:
		 *   post:
		 *     tags: [Position]
		 *     summary: Create a position
		 *     description: Create a new position record
		 *     security:
		 *       - BearerAuth: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/PositionMutate"
		 *     responses:
		 *       200:
		 *         description: Position created successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Position"
		 */
		post: {
			middleware: [verify, queryModifier, validatePositionCreate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await positionProvider.create({
						...req.body,
						created_at: new Date(),
						created_by: req.user?.id || null,
					});
					return res.sendOk({ data, message: "Position created successfully" });
				} catch (error) {
					await positionProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};
