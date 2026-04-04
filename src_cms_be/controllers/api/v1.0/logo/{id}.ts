import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import { queryModifier } from "#middlewares/query-modifier";
import { validateId } from "#middlewares/validators";
import { validateLogoUpdate } from "#middlewares/validators/logo";
import { LogoProvider } from "#providers/LogoProvider";
import { logoService, type LogoUpdateDTO } from "#services/logoService";

export default (_express: Application) => {
	const logoProvider = new LogoProvider();

	return <Resource>{
		/**
		 * @openapi
		 * /logo/{id}:
		 *   get:
		 *     tags: [Logo]
		 *     summary: Get logo by ID
		 *     description: Retrieve a single logo record by its ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Logo ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Logo retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/Logo"
		 *       404:
		 *         description: Logo not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await logoService.getById(req.params.id!);
					return res.sendOk({ data });
				} catch (error) {
					await logoProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /logo/{id}:
		 *   put:
		 *     tags: [Logo]
		 *     summary: Update logo by ID
		 *     description: Update a single logo record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Logo ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/LogoUpdate"
		 *     responses:
		 *       200:
		 *         description: Logo updated successfully
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
		 *         description: Logo or file not found
		 *       409:
		 *         description: Duplicate or conflict data
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateLogoUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const actor_id = req.user?.id ?? null;
					const payload = req.body as LogoUpdateDTO;

					const data = await logoService.updateById(
						req.params.id!,
						payload,
						actor_id,
					);

					return res.sendOk({
						data,
						message: "Logo updated successfully",
					});
				} catch (error) {
					await logoProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /logo/{id}:
		 *   delete:
		 *     tags: [Logo]
		 *     summary: Delete logo by ID
		 *     description: Delete a single logo record by its ID
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Logo ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Logo deleted successfully
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
		 *         description: Logo not found
		 *       409:
		 *         description: Logo is in use
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await logoService.deleteById(req.params.id!);

					return res.sendOk({
						data,
						message: "Logo deleted successfully",
					});
				} catch (error) {
					await logoProvider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};