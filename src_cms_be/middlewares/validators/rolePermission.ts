import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"] });

export const rolePermissionSchemas = {
	bulkCreateByRole: Joi.object({
		params: Joi.object({
			roleId: uuid.required().messages({
				"any.required": "Role ID là bắt buộc",
			}),
		}).required(),
		body: Joi.object({
			permission_ids: Joi.array()
				.items(uuid)
				.min(1)
				.required()
				.messages({
					"array.min": "Danh sách permission IDs phải có ít nhất 1 phần tử",
					"any.required": "Danh sách permission IDs là bắt buộc",
				}),
		}).required(),
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

	deleteByRole: Joi.object({
		params: Joi.object({
			roleId: uuid.required().messages({
				"any.required": "Role ID là bắt buộc",
			}),
		}).required(),
		body: Joi.object().required(),
		query: Joi.object().required(),
	}),
};

export const validateRolePermissionBulkCreateByRole = validateJoi(
	rolePermissionSchemas.bulkCreateByRole,
);
export const validateRolePermissionBulkDelete = validateJoi(rolePermissionSchemas.bulkDelete);
export const validateRolePermissionDeleteByRole = validateJoi(rolePermissionSchemas.deleteByRole);
