import Joi from "joi";
import { validateJoi } from ".";

const uuid = Joi.string().guid({
	version: ["uuidv1", "uuidv3", "uuidv4", "uuidv5"],
});

export const logoSchemas = {
	create: Joi.object({
		body: Joi.object({
			logo_name: Joi.string().trim().min(1).max(255).required().messages({
				"string.empty": "Tên logo không được để trống",
				"string.min": "Tên logo không được để trống",
				"string.max": "Tên logo không được vượt quá 255 ký tự",
				"any.required": "Tên logo là bắt buộc",
			}),
			description: Joi.string().trim().allow(null, "").optional().messages({
				"string.base": "Mô tả logo không hợp lệ",
			}),
			file_id: uuid.required().messages({
				"string.guid": "file_id không đúng định dạng UUID",
				"any.required": "file_id là bắt buộc",
			}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: uuid.required().messages({
				"string.guid": "ID logo không đúng định dạng UUID",
				"any.required": "ID logo là bắt buộc",
			}),
		}).required(),
		body: Joi.object({
			logo_name: Joi.string().trim().min(1).max(255).optional().messages({
				"string.empty": "Tên logo không được để trống",
				"string.min": "Tên logo không được để trống",
				"string.max": "Tên logo không được vượt quá 255 ký tự",
			}),
			description: Joi.string().trim().allow(null, "").optional().messages({
				"string.base": "Mô tả logo không hợp lệ",
			}),
			file_id: uuid.optional().messages({
				"string.guid": "file_id không đúng định dạng UUID",
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

export const validateLogoCreate = validateJoi(logoSchemas.create);
export const validateLogoUpdate = validateJoi(logoSchemas.update);