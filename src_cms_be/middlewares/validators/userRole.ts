import Joi from "joi";

import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

export const userRoleSchemas = {
	create: Joi.object({
		params: Joi.object(),
		body: Joi.object({
			user_id: uuid.required().messages({
				"any.required": "user_id là bắt buộc",
				"string.guid": "user_id không hợp lệ",
			}),
			role_id: uuid.required().messages({
				"any.required": "role_id là bắt buộc",
				"string.guid": "role_id không hợp lệ",
			}),
			is_primary: Joi.boolean().optional(),
		}),
		query: Joi.object(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: uuid.required().messages({
				"any.required": "id là bắt buộc",
				"string.guid": "id không hợp lệ",
			}),
		}),
		body: Joi.object({
			role_id: uuid.optional().messages({
				"string.guid": "role_id không hợp lệ",
			}),
			is_primary: Joi.boolean().optional(),
		})
			.min(1)
			.messages({
				"object.min": "Cần ít nhất một trường để cập nhật",
			}),
		query: Joi.object(),
	}),
};

export const validateUserRoleCreate = validateJoi(userRoleSchemas.create);
export const validateUserRoleUpdate = validateJoi(userRoleSchemas.update);