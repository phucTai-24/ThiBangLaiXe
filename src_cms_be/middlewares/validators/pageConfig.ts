import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

const createBodySchema = Joi.object({
	code: Joi.string().trim().min(1).max(50).required(),
	name: Joi.string().trim().min(1).max(255).required(),
	static_link: Joi.string().trim().min(1).max(255).required(),
	static_link_en: Joi.string().trim().min(1).max(255).allow(null, "").optional(),

	parent_id: uuid.required().messages({
		"any.required": "parent_id là bắt buộc",
		"string.base": "parent_id là bắt buộc",
		"string.guid": "parent_id không hợp lệ",
	}),

	sort_order: Joi.number().integer().min(0).optional(),
	is_article: Joi.boolean().optional(),

	// NEW
	category_ids: Joi.array().items(uuid).unique().optional(),
})
	.required()
	.unknown(false);

const updateBodySchema = Joi.object({
	code: Joi.string().trim().min(1).max(50).optional(),
	name: Joi.string().trim().min(1).max(255).optional(),
	static_link: Joi.string().trim().min(1).max(255).optional(),
	static_link_en: Joi.string().trim().min(1).max(255).allow(null, "").optional(),

	parent_id: uuid.optional().messages({
		"string.guid": "parent_id không hợp lệ",
	}),

	sort_order: Joi.number().integer().min(0).optional(),
	is_article: Joi.boolean().optional(),

	// NEW
	category_ids: Joi.array().items(uuid).unique().optional(),
})
	.required()
	.unknown(false);

export const pageConfigSchemas = {
	create: Joi.object({
		body: createBodySchema,
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: uuid.required().messages({
				"any.required": "PageConfig ID là bắt buộc",
				"string.guid": "PageConfig ID không hợp lệ",
			}),
		}).required(),
		body: updateBodySchema,
		query: Joi.object().required(),
	}),
};

export const validatePageConfigCreate = validateJoi(pageConfigSchemas.create);
export const validatePageConfigUpdate = validateJoi(pageConfigSchemas.update);
