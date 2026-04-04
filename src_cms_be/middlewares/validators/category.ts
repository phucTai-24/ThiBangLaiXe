import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

const CATEGORY_TYPE_VALUES = ["post", "industry", "trade", "page"] as const;

export const categorySchemas = {
	create: Joi.object({
		body: Joi.object({
			name: Joi.string().trim().min(1).max(255).required(),
			slug: Joi.string().trim().min(1).max(255).required(),
			type: Joi.string().valid(...CATEGORY_TYPE_VALUES).required(),
			url: Joi.string().allow(null).optional(),
			thumbnail_id: uuid.allow(null).optional(),
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
			slug: Joi.string().trim().min(1).max(255).optional(),
			type: Joi.string().valid(...CATEGORY_TYPE_VALUES).optional(),
			url: Joi.string().allow(null).optional(),
			thumbnail_id: uuid.allow(null).optional(),
		}).required(),
		query: Joi.object().required(),
	}),
};

export const validateCategoryCreate = validateJoi(categorySchemas.create);
export const validateCategoryUpdate = validateJoi(categorySchemas.update);