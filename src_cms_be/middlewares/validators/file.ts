import Joi from "joi";
import { validateJoi } from ".";

// File validation schemas
export const fileSchemas = {
	create: Joi.object({
		body: Joi.object({
			// TODO: Add validation rules for file creation
			// Example:
			// name: Joi.string().min(1).max(100).required(),
			// description: Joi.string().optional(),
		}),
		params: Joi.object(),
		query: Joi.object(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: Joi.string().required().messages({
				"any.required": "File ID là bắt buộc",
			}),
		}),
		body: Joi.object({
			// TODO: Add validation rules for file update
			// All fields should be optional for partial updates
		}),
		query: Joi.object(),
	}),
};

// Pre-built file validators
export const validateFileCreate = validateJoi(fileSchemas.create);
