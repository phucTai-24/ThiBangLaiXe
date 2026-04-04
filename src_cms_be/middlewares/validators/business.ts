import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

const slug = Joi.string()
	.trim()
	.min(1)
	.max(255)
	.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const industry_ids = Joi.array()
	.items(uuid.required())
	.unique()
	.max(200)
	.allow(null)
	.optional();

const website = Joi.string().trim().max(255).allow(null, "").optional();
const address = Joi.string().trim().max(500).allow(null, "").optional();
const phone = Joi.string().trim().max(30).allow(null, "").optional();

export const businessSchemas = {
	create: Joi.object({
		body: Joi.object({
			name: Joi.string().trim().min(1).max(255).required(),
			slug: slug.optional(),
			logo_id: uuid.allow(null).optional(),
			rating: Joi.number().min(0).max(5).precision(1).allow(null).optional(),
			address,
			phone,
			website,
			industry_ids,
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: uuid.required(),
		}).required(),
		body: Joi.object({
			name: Joi.string().trim().min(1).max(255).optional(),
			slug: slug.optional(),
			logo_id: uuid.allow(null).optional(),
			rating: Joi.number().min(0).max(5).precision(1).allow(null).optional(),
			address,
			phone,
			website,
			industry_ids,
		})
			.min(1)
			.required(),
		query: Joi.object().required(),
	}),
};

export const validateBusinessCreate = validateJoi(businessSchemas.create);
export const validateBusinessUpdate = validateJoi(businessSchemas.update);