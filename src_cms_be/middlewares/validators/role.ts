import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

export const roleSchemas = {
	create: Joi.object({
		body: Joi.object({
			name: Joi.string().trim().min(1).max(100).required().messages({
				"string.empty": "Tên vai trò không được để trống",
				"any.required": "Tên vai trò là bắt buộc",
				"string.max": "Tên vai trò không được vượt quá 100 ký tự",
			}),
			description: Joi.string().trim().max(500).allow(null, "").optional().messages({
				"string.max": "Mô tả không được vượt quá 500 ký tự",
			}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: uuid.required(),
		}).required(),
		body: Joi.object({
			name: Joi.string().trim().min(1).max(100).optional().messages({
				"string.empty": "Tên vai trò không được để trống",
				"string.max": "Tên vai trò không được vượt quá 100 ký tự",
			}),
			description: Joi.string().trim().max(500).allow(null, "").optional().messages({
				"string.max": "Mô tả không được vượt quá 500 ký tự",
			}),
		})
			.min(1)
			.required()
			.messages({
				"object.min": "Phải có ít nhất một trường để cập nhật",
			}),
		query: Joi.object().required(),
	}),

	bulkCreate: Joi.object({
		body: Joi.object({
			roles: Joi.array()
				.items(
					Joi.object({
						name: Joi.string().trim().min(1).max(100).required().messages({
							"string.empty": "Tên vai trò không được để trống",
							"any.required": "Tên vai trò là bắt buộc",
						}),
						description: Joi.string().trim().max(500).allow(null, "").optional(),
					}),
				)
				.min(1)
				.required()
				.messages({
					"array.min": "Danh sách vai trò phải có ít nhất 1 phần tử",
					"any.required": "Danh sách vai trò là bắt buộc",
				}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	bulkDelete: Joi.object({
		body: Joi.object({
			ids: Joi.array()
				.items(uuid)
				.min(1)
				.required()
				.messages({
					"array.min": "Danh sách IDs phải có ít nhất 1 phần tử",
					"any.required": "Danh sách IDs là bắt buộc",
				}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),
};

export const validateRoleCreate = validateJoi(roleSchemas.create);
export const validateRoleUpdate = validateJoi(roleSchemas.update);
export const validateRoleBulkCreate = validateJoi(roleSchemas.bulkCreate);
export const validateRoleBulkDelete = validateJoi(roleSchemas.bulkDelete);
