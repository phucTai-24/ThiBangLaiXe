import { Application } from "express";
import { Resource } from "express-automatic-routes";

import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import queryModifier from "#middlewares/query-modifier";
import { validateId } from "#middlewares/validators";
import { validateTermUpdate } from "#middlewares/validators/term";
import { termService } from "#services/termService";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /term/{id}:
		 *   get:
		 *     tags: [Term]
		 *     summary: Get term by ID
		 *     description: Retrieve a single term with positions and members
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Term ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Term retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/TermResponse"
		 *       404:
		 *         description: Term not found
		 */
		get: {
			middleware: [queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await termService.getById(req.params.id!);

					return res.sendOk({ data });
				} catch (error) {
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /term/{id}:
		 *   put:
		 *     tags: [Term]
		 *     summary: Update term by ID
		 *     description: Update term fields and optionally replace positions and members
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Term ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: "#/components/schemas/TermUpdateRequest"
		 *     responses:
		 *       200:
		 *         description: Term updated successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               allOf:
		 *                 - $ref: "#/components/schemas/ApiResponse"
		 *                 - type: object
		 *                   properties:
		 *                     responseData:
		 *                       $ref: "#/components/schemas/TermResponse"
		 *       404:
		 *         description: Term not found
		 */
		put: {
			middleware: [verify, queryModifier, validateId, validateTermUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await termService.update(
						req.params.id!,
						req.body,
						req.user?.id || null,
					);

					return res.sendOk({
						data,
						message: "Term updated successfully",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},

		/**
		 * @openapi
		 * /term/{id}:
		 *   delete:
		 *     tags: [Term]
		 *     summary: Delete term by ID
		 *     description: Delete a term and its related positions and members
		 *     security:
		 *       - BearerAuth: []
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         description: Term ID
		 *         schema:
		 *           type: string
		 *           format: uuid
		 *     responses:
		 *       200:
		 *         description: Term deleted successfully
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
		 *         description: Term not found
		 */
		delete: {
			middleware: [verify, queryModifier, validateId],
			handler: async (req: Req, res: Res) => {
				try {
					const data = await termService.remove(req.params.id!);

					return res.sendOk({
						data,
						message: "Term deleted successfully",
					});
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};