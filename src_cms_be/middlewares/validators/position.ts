import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

export const positionSchemas = {
	create: Joi.object({
		body: Joi.object({
			name: Joi.string().trim().min(1).max(255).required(),
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
		})
			.min(1)
			.required(),
		query: Joi.object().required(),
	}),
};

export const validatePositionCreate = validateJoi(positionSchemas.create);
export const validatePositionUpdate = validateJoi(positionSchemas.update);
