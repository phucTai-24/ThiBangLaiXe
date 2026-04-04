import Joi from "joi";
import { validateJoi } from ".";

export const CONTACT_STATUS = ["new", "seen", "replied"] as const;
export type ContactStatus = (typeof CONTACT_STATUS)[number];

const createSchema = Joi.object({
	body: Joi.object({
		fullname: Joi.string().trim().min(1).max(255).required().messages({
			"any.required": "fullname là bắt buộc",
			"string.empty": "fullname không được để trống",
		}),
		email: Joi.string()
			.trim()
			.email({ tlds: { allow: false } })
			.max(255)
			.required()
			.messages({
				"any.required": "email là bắt buộc",
				"string.email": "email không hợp lệ",
			}),
		phone: Joi.string()
			.trim()
			.min(8)
			.max(30)
			.pattern(/^[0-9+().\s-]{8,30}$/)
			.required()
			.messages({
				"any.required": "phone là bắt buộc",
				"string.pattern.base": "phone không hợp lệ",
			}),
		title: Joi.string().trim().min(1).max(255).required().messages({
			"any.required": "title là bắt buộc",
			"string.empty": "title không được để trống",
		}),
		content: Joi.string().trim().min(1).max(5000).required().messages({
			"any.required": "content là bắt buộc",
			"string.empty": "content không được để trống",
		}),

		// Public create: allowed only 'new' status
		status: Joi.string().valid("new").optional().messages({
			"any.only": "status khi tạo mới chỉ được là new",
		}),
	}).required(),
	params: Joi.object(),
	query: Joi.object(),
});

const updateSchema = Joi.object({
	params: Joi.object({
		id: Joi.string().uuid().required(),
	}).required(),
	body: Joi.object({
		fullname: Joi.string().trim().min(1).max(255).optional(),
		email: Joi.string()
			.trim()
			.email({ tlds: { allow: false } })
			.max(255)
			.optional(),
		phone: Joi.string()
			.trim()
			.min(8)
			.max(30)
			.pattern(/^[0-9+().\s-]{8,30}$/)
			.optional(),
		title: Joi.string().trim().min(1).max(255).optional(),
		content: Joi.string().trim().min(1).max(5000).optional(),
		status: Joi.string()
			.valid(...CONTACT_STATUS)
			.optional(),
	}).required(),
	query: Joi.object(),
});

export const validateContactCreate = validateJoi(createSchema);
export const validateContactUpdate = validateJoi(updateSchema);
