import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

export const postSchemas = {
	create: Joi.object({
		body: Joi.object({
			title: Joi.string().trim().min(1).required(),
			external_link: Joi.string().trim().min(1).required(),
			content: Joi.string().allow("").required(),
			thumbnail_id: uuid.allow(null).optional(),
			page_config_id: uuid.allow(null).optional(),
			release_mode: Joi.string().valid("NOW", "SCHEDULED").default("NOW"),
			release_at: Joi.date().allow(null).optional(),
			is_active: Joi.boolean().default(true),
			is_featured: Joi.boolean().default(false),
			status: Joi.string().valid("pending", "published", "rejected").default("pending"),
			type: Joi.string().valid("buy", "sell", "partner").allow(null).optional(),
			category_ids: Joi.array().items(uuid).unique().optional(),
		}).required(),
		query: Joi.object().required(),
	}),
	update: Joi.object({
		body: Joi.object({
			title: Joi.string().trim().min(1).optional(),
			external_link: Joi.string().trim().min(1).optional(),
			content: Joi.string().allow("").optional(),
			thumbnail_id: uuid.allow(null).optional(),
			page_config_id: uuid.allow(null).optional(),
			release_mode: Joi.string().valid("NOW", "SCHEDULED").optional(),
			release_at: Joi.date().allow(null).optional(),
			is_active: Joi.boolean().optional(),
			is_featured: Joi.boolean().optional(),
			status: Joi.string().valid("pending", "published", "rejected").optional(),
			type: Joi.string().valid("buy", "sell", "partner").allow(null).optional(),
			category_ids: Joi.array().items(uuid).unique().optional(),
		}).required(),
		query: Joi.object().required(),
	}),
}

export const validatePostCreate = validateJoi(postSchemas.create)
export const validatePostUpdate = validateJoi(postSchemas.update)