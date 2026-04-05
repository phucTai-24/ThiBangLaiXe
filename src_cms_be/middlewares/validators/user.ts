import Joi from "joi";
import { validateJoi } from ".";

const uuidV4 = () => Joi.string().guid({ version: ["uuidv4"] });

/**
 * birth_date: DATEONLY format "YYYY-MM-DD"
 */
const dateOnly = () =>
	Joi.string()
		.trim()
		.pattern(/^\d{4}-\d{2}-\d{2}$/)
		.messages({
			"string.pattern.base": "Ngày sinh không hợp lệ",
		});

/**
 * avatar_id:
 * - Mentor flow: UUID fileId from /file/upload
 * - Legacy flow: URL string
 */
const avatarValue = () =>
	Joi.alternatives().try(uuidV4(), Joi.string().uri(), Joi.string().valid("")).optional().messages({
		"alternatives.match": "avatar_id phải là UUID (fileId)",
	});

const optionalText = () => Joi.string().allow("", null).optional();
const optionalShortText = () => Joi.string().max(255).allow("", null).optional();

const userTypeSchema = Joi.string().valid("member", "businessman", "subscriber").optional().messages({
	"any.only": 'type chỉ nhận "member" hoặc "businessman" hoặc "subscriber"',
});

export const userSchemas = {
	create: Joi.object({
		body: Joi.object({
			email: Joi.string().email().required().messages({
				"string.email": "Email không hợp lệ",
				"any.required": "Email là bắt buộc",
			}),
			password: Joi.string().min(6).required().messages({
				"string.min": "Mật khẩu phải có ít nhất 6 ký tự",
				"any.required": "Mật khẩu là bắt buộc",
			}),
			username: Joi.string().min(3).max(50).required().messages({
				"string.min": "Username phải có ít nhất 3 ký tự",
				"string.max": "Username không được vượt quá 50 ký tự",
				"any.required": "Username là bắt buộc",
			}),
			first_name: Joi.string().min(1).max(100).allow("").optional(),
			last_name: Joi.string().min(1).max(100).allow("").optional(),
			phone: Joi.string()
				.pattern(/^(\+84|0)[3|5|7|8|9][0-9]{8}$/)
				.allow("")
				.optional()
				.messages({
					"string.pattern.base": "Số điện thoại không hợp lệ",
				}),

			avatar_id: avatarValue(),

			// NEW: user type enum
			type: userTypeSchema,

			// DATEONLY: "YYYY-MM-DD"
			birth_date: dateOnly().allow("").optional(),

			// No required
			hometown: optionalShortText(),
			gender: Joi.string().valid("male", "female", "other").allow("").optional(),
			bio: optionalText().max(200),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: Joi.string()
				.guid({ version: ["uuidv4"] })
				.required()
				.messages({
					"any.required": "ID người dùng là bắt buộc",
					"string.guid": "ID phải là UUID hợp lệ",
				}),
		}).required(),
		body: Joi.object({
			username: Joi.string().min(3).max(50).allow("").optional().messages({
				"string.min": "Username phải có ít nhất 3 ký tự",
				"string.max": "Username không được vượt quá 50 ký tự",
			}),
			first_name: Joi.string().min(1).max(100).allow("").optional(),
			last_name: Joi.string().min(1).max(100).allow("").optional(),
			phone: Joi.string()
				.pattern(/^(\+84|0)[3|5|7|8|9][0-9]{8}$/)
				.allow("")
				.optional()
				.messages({
					"string.pattern.base": "Số điện thoại không hợp lệ",
				}),

			avatar_id: avatarValue(),

			// NEW: user type enum
			type: userTypeSchema,

			// DATEONLY: "YYYY-MM-DD"
			birth_date: dateOnly().allow("").optional(),

			// No required
			hometown: optionalShortText(),
			gender: Joi.string().valid("male", "female", "other").allow("").optional(),
			bio: optionalText().max(200),
		}).required(),
		query: Joi.object().required(),
	}),

	changePassword: Joi.object({
		body: Joi.object({
			oldPassword: Joi.string().min(1).required().messages({
				"any.required": "oldPassword là bắt buộc",
				"string.min": "oldPassword là bắt buộc",
			}),
			newPassword: Joi.string().min(6).required().invalid(Joi.ref("oldPassword")).messages({
				"any.required": "newPassword là bắt buộc",
				"string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
				"any.invalid": "Mật khẩu mới không được trùng mật khẩu cũ",
			}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),
};

export const validateUserCreate = validateJoi(userSchemas.create);
export const validateUserUpdate = validateJoi(userSchemas.update);
export const validateUserChangePassword = validateJoi(userSchemas.changePassword);
