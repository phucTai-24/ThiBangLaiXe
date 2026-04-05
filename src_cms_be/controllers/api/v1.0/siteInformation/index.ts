import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import verify from "#middlewares/auth";
import {
	validateSiteInformationGet,
	validateSiteInformationUpdate,
} from "#middlewares/validators/siteInformation";
import { SiteInformationProvider } from "#providers/SiteInformationProvider";
import { siteInformationService } from "#services/siteInformationService";

export default (_express: Application) => {
	const site_information_provider = SiteInformationProvider.getInstance();

	return <Resource>{
	/**
	 * @openapi
	 * /siteInformation:
	 *   get:
	 *     tags: [SiteInformation]
	 *     summary: Get current site information
	 *     description: Retrieve current public site information configuration.
	 *     parameters:
	 *       - $ref: '#/components/parameters/filters'
	 *       - $ref: '#/components/parameters/sortField'
	 *       - $ref: '#/components/parameters/sortOrder'
	 *       - $ref: '#/components/parameters/page'
	 *       - $ref: '#/components/parameters/pageSize'
	 *     responses:
	 *       200:
	 *         description: Site information retrieved successfully
	 *         content:
	 *           application/json:
	 *             schema:
	 *               allOf:
	 *                 - $ref: "#/components/schemas/ApiResponse"
	 *                 - type: object
	 *                   properties:
	 *                     responseData:
	 *                       $ref: "#/components/schemas/SiteInformationData"
	 */
		get: {
			middleware: [validateSiteInformationGet],
			handler: async (req: Req, res: Res) => {
				try {
					const site_information_query = siteInformationService.buildGetQuery(req.query);
					const data = await siteInformationService.getCurrent(site_information_query);

					return res.sendOk({ data });
				} catch (error) {
					await site_information_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},

	/**
	 * @openapi
	 * /siteInformation:
	 *   put:
	 *     tags: [SiteInformation]
	 *     summary: Update current site information
	 *     description: Update current site information configuration
	 *     security:
	 *       - BearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: "#/components/schemas/SiteInformationUpdateBody"
	 *     responses:
	 *       200:
	 *         description: Site information updated successfully
	 *         content:
	 *           application/json:
	 *             schema:
	 *               allOf:
	 *                 - $ref: "#/components/schemas/ApiResponse"
	 *                 - type: object
	 *                   properties:
	 *                     responseData:
	 *                       $ref: "#/components/schemas/SiteInformationData"
	 *       400:
	 *         description: Invalid input data
	 *       401:
	 *         description: Unauthorized
	 */		
		put: {
			middleware: [verify, validateSiteInformationUpdate],
			handler: async (req: Req, res: Res) => {
				try {
					const actor_id = req.user?.id ?? null;
					const data = await siteInformationService.updateCurrent(req.body, actor_id);

					return res.sendOk({
						data,
						message: "Site information updated successfully",
					});
				} catch (error) {
					await site_information_provider.logError(error as Error);
					return res.error(error);
				}
			},
		},
	};
};