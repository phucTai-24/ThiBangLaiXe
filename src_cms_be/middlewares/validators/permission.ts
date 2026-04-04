import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

export const permissionSchemas = {
	create: Joi.object({
		body: Joi.object({
			name: Joi.string().trim().min(1).max(100).required().messages({
				"string.empty": "Tên permission không được để trống",
				"any.required": "Tên permission là bắt buộc",
				"string.max": "Tên permission không được vượt quá 100 ký tự",
			}),
			description: Joi.string().trim().allow(null, "").optional(),
			resource: Joi.string().trim().min(1).max(100).required().messages({
				"string.empty": "Resource không được để trống",
				"any.required": "Resource là bắt buộc",
				"string.max": "Resource không được vượt quá 100 ký tự",
			}),
			action: Joi.string().trim().min(1).max(50).required().messages({
				"string.empty": "Action không được để trống",
				"any.required": "Action là bắt buộc",
				"string.max": "Action không được vượt quá 50 ký tự",
			}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	bulkCreate: Joi.object({
		body: Joi.object({
			permissions: Joi.array()
				.items(
					Joi.object({
						name: Joi.string().trim().min(1).max(100).required().messages({
							"string.empty": "Tên permission không được để trống",
							"any.required": "Tên permission là bắt buộc",
							"string.max": "Tên permission không được vượt quá 100 ký tự",
						}),
						description: Joi.string().trim().allow(null, "").optional(),
						resource: Joi.string().trim().min(1).max(100).required().messages({
							"string.empty": "Resource không được để trống",
							"any.required": "Resource là bắt buộc",
							"string.max": "Resource không được vượt quá 100 ký tự",
						}),
						action: Joi.string().trim().min(1).max(50).required().messages({
							"string.empty": "Action không được để trống",
							"any.required": "Action là bắt buộc",
							"string.max": "Action không được vượt quá 50 ký tự",
						}),
					}),
				)
				.min(1)
				.required()
				.messages({
					"array.min": "Danh sách permissions phải có ít nhất 1 phần tử",
					"any.required": "Danh sách permissions là bắt buộc",
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

	update: Joi.object({
		params: Joi.object({
			id: uuid.required(),
		}).required(),
		body: Joi.object({
			name: Joi.string().trim().min(1).max(100).optional().messages({
				"string.empty": "Tên permission không được để trống",
				"string.max": "Tên permission không được vượt quá 100 ký tự",
			}),
			description: Joi.string().trim().allow(null, "").optional(),
			resource: Joi.string().trim().min(1).max(100).optional().messages({
				"string.empty": "Resource không được để trống",
				"string.max": "Resource không được vượt quá 100 ký tự",
			}),
			action: Joi.string().trim().min(1).max(50).optional().messages({
				"string.empty": "Action không được để trống",
				"string.max": "Action không được vượt quá 50 ký tự",
			}),
		})
			.min(1)
			.required()
			.messages({
				"object.min": "Phải có ít nhất một trường để cập nhật",
			}),
		query: Joi.object().required(),
	}),
};

export const validatePermissionCreate = validateJoi(permissionSchemas.create);
export const validatePermissionBulkCreate = validateJoi(permissionSchemas.bulkCreate);
export const validatePermissionBulkDelete = validateJoi(permissionSchemas.bulkDelete);
export const validatePermissionUpdate = validateJoi(permissionSchemas.update);
