import Joi from "joi";
import { validateJoi } from ".";

const site_social_link_schema = Joi.object({
	platform: Joi.string().trim().min(1).max(50).required(),
	label: Joi.string().trim().min(1).max(100).required(),
	url: Joi.string().trim().uri({ scheme: ["http", "https"] }).required(),
	icon_key: Joi.string().trim().min(1).max(50).required(),
	is_active: Joi.boolean().required(),
});

export const siteInformationSchemas = {
	get: Joi.object({
		body: Joi.object().required(),
		params: Joi.object().required(),
		query: Joi.object({
			filters: Joi.string().allow("").optional(),
			sortField: Joi.string().allow("").optional(),
			sortOrder: Joi.string().valid("asc", "desc").optional(),
			page: Joi.number().integer().min(1).optional(),
			pageSize: Joi.number().integer().min(1).optional(),
		}).required(),
	}),

	update: Joi.object({
		body: Joi.object({
			telephone: Joi.string().trim().max(100).allow(null, "").optional(),
			email: Joi.string().trim().email().max(255).allow(null, "").optional(),
			address: Joi.string().trim().allow(null, "").optional(),
			working_hours: Joi.string().trim().allow(null, "").optional(),
			link_socials: Joi.array().items(site_social_link_schema).max(20).optional(),
		})
			.min(1)
			.required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),
};

export const validateSiteInformationGet = validateJoi(siteInformationSchemas.get);
export const validateSiteInformationUpdate = validateJoi(siteInformationSchemas.update);