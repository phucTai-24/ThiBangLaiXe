import Joi from "joi";
import { validateJoi } from ".";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_VN_REGEX = /^(\+84|0)[3|5|7|8|9][0-9]{8}$/;

// Vietnamese unicode letters (upper/lower) + allow spaces, apostrophe, hyphen between words
const VIETNAMESE_NAME_REGEX = /^[A-Za-zÀ-ỹ]+(?:[ '\-][A-Za-zÀ-ỹ]+)*$/u;

const buildTodayDateOnly = (): string => {
	const now = new Date();
	const yyyy = String(now.getFullYear());
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const daysInMonth = (y: number, m: number): number => {
	if (m === 2) return isLeapYear(y) ? 29 : 28;
	if ([4, 6, 9, 11].includes(m)) return 30;
	return 31;
};

const dateOnlyNotFuture = (fieldLabel: string) =>
	Joi.string()
		.trim()
		.allow("")
		.optional()
		.custom((raw, helpers) => {
			const v = raw.trim();
			if (!v.length) return raw;

			// Accept both "YYYY-MM-DD" and ISO "YYYY-MM-DDTHH:mm:ss..."
			const datePart = v.includes("T") ? v.slice(0, 10) : v;

			const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
			if (!m) return helpers.error("any.custom");

			const yy = Number(m[1]);
			const mm = Number(m[2]);
			const dd = Number(m[3]);

			if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return helpers.error("any.custom");
			if (mm < 1 || mm > 12) return helpers.error("any.custom");

			const maxD = daysInMonth(yy, mm);
			if (dd < 1 || dd > maxD) return helpers.error("any.custom");

			const today = buildTodayDateOnly();
			if (datePart > today) return helpers.error("any.custom");

			return datePart;
		}, "dateOnlyNotFuture")
		.messages({
			"any.custom": `${fieldLabel} không hợp lệ (không được lớn hơn ngày hiện tại)`,
		});

const emailSchema = () =>
	Joi.string()
		.trim()
		.max(50)
		.pattern(EMAIL_REGEX)
		.required()
		.messages({
			"string.pattern.base": "Email không hợp lệ",
			"string.max": "Email không được vượt quá 50 ký tự",
			"any.required": "Email là bắt buộc",
		});

const passwordSchema = () =>
	Joi.string()
		.min(6)
		.max(64)
		.required()
		.messages({
			"string.min": "Mật khẩu phải có ít nhất 6 ký tự",
			"string.max": "Mật khẩu không được vượt quá 64 ký tự",
			"any.required": "Mật khẩu là bắt buộc",
		});

const usernameSchema = () =>
	Joi.string()
		.trim()
		.min(3)
		.max(50)
		.pattern(/^[a-zA-Z0-9._-]+$/)
		.allow("")
		.optional()
		.messages({
			"string.min": "Username phải có ít nhất 3 ký tự",
			"string.max": "Username không được vượt quá 50 ký tự",
			"string.pattern.base": "Username chỉ được chứa chữ cái, số và . _ -",
		});

const vietnameseNameSchema = (label: string) =>
	Joi.string()
		.trim()
		.max(50)
		.pattern(VIETNAMESE_NAME_REGEX)
		.allow("")
		.optional()
		.messages({
			"string.max": `${label} không được vượt quá 50 ký tự`,
			"string.pattern.base": `${label} chỉ được chứa chữ cái tiếng Việt và khoảng trắng`,
		});

const phoneSchema = () =>
	Joi.string()
		.trim()
		.pattern(PHONE_VN_REGEX)
		.allow("")
		.optional()
		.messages({
			"string.pattern.base": "Số điện thoại không hợp lệ",
		});

/**
 * avatar_id:
 * - UUID fileId from /file/upload (recommended)
 * - OR legacy url
 */
const avatarSchema = () =>
	Joi.alternatives()
		.try(
			Joi.string().guid({ version: "uuidv4" }),
			Joi.string().uri(),
			Joi.string().valid(""),
		)
		.optional()
		.messages({
			"alternatives.match": "avatar_id phải là UUID (fileId)",
		});

// Auth-specific validation schemas
export const authSchemas = {
	login: Joi.object({
		body: Joi.object({
			email: Joi.string().trim().max(255).pattern(EMAIL_REGEX).required().messages({
				"string.pattern.base": "Email không hợp lệ",
				"any.required": "Email là bắt buộc",
			}),
			password: Joi.string().min(6).required().messages({
				"string.min": "Mật khẩu phải có ít nhất 6 ký tự",
				"any.required": "Mật khẩu là bắt buộc",
			}),
			device_info: Joi.object().optional(),
			ip_address: Joi.string().optional(),
			user_agent: Joi.string().optional(),
		})
			.required()
			.unknown(false),

		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),

	register: Joi.object({
		body: Joi.object({
			email: emailSchema(),
			password: passwordSchema(),
			username: usernameSchema(),

			// VN name constraints
			first_name: vietnameseNameSchema("Họ"),
			last_name: vietnameseNameSchema("Tên"),

			phone: phoneSchema(),

			// ✅ FIX: allow avatar_id for register
			avatar_id: avatarSchema(),

			// (optional) legacy support
			avatar_url: avatarSchema(),

			// Profile fields
			birth_date: dateOnlyNotFuture("Ngày sinh"),
			gender: Joi.string().valid("male", "female", "other").allow("").optional().messages({
				"any.only": "Giới tính không hợp lệ",
			}),
			type: Joi.string().valid("member", "businessman","subscriber").allow("").optional().messages({
				"any.only": 'type chỉ nhận "member" hoặc "businessman" hoặc "subscriber"',
			}),
			hometown: Joi.string().trim().max(255).allow("", null).optional().messages({
				"string.max": "Quê quán không được vượt quá 255 ký tự",
			}),
			bio: Joi.string().max(200).allow("", null).optional(),
		})
			.required()
			.unknown(false),

		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),

	refreshToken: Joi.object({
		body: Joi.object({
			refresh_token: Joi.string().optional().messages({
				"string.base": "Refresh token phải là chuỗi",
			}),
			device_info: Joi.object().optional(),
		})
			.required()
			.unknown(false),
		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),

	changePassword: Joi.object({
		body: Joi.object({
			old_password: Joi.string().required().messages({
				"any.required": "Mật khẩu cũ là bắt buộc",
			}),
			new_password: Joi.string().min(6).required().messages({
				"string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
				"any.required": "Mật khẩu mới là bắt buộc",
			}),
		})
			.required()
			.unknown(false),
		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),

	forgotPasswordSendOtp: Joi.object({
		body: Joi.object({
			email: Joi.string().trim().max(255).pattern(EMAIL_REGEX).required().messages({
				"string.pattern.base": "Email không hợp lệ",
				"any.required": "Email là bắt buộc",
			}),
		})
			.required()
			.unknown(false),
		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),

	forgotPasswordVerifyOtp: Joi.object({
		body: Joi.object({
			email: Joi.string().trim().max(255).pattern(EMAIL_REGEX).required().messages({
				"string.pattern.base": "Email không hợp lệ",
				"any.required": "Email là bắt buộc",
			}),
			otp: Joi.string()
				.pattern(/^\d{6}$/)
				.required()
				.messages({
					"string.pattern.base": "OTP phải gồm 6 chữ số",
					"any.required": "OTP là bắt buộc",
				}),
		})
			.required()
			.unknown(false),
		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),

	forgotPasswordReset: Joi.object({
		body: Joi.object({
			reset_token: Joi.string().required().messages({
				"any.required": "reset_token bắt buộc",
			}),
			new_password: Joi.string().min(6).max(64).required().messages({
				"string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
				"string.max": "Mật khẩu không được vượt quá 64 ký tự",
				"any.required": "Mật khẩu mới bắt buộc",
			}),
		})
			.required()
			.unknown(false),
		params: Joi.object().required(),
		query: Joi.object().required(),
	})
		.required()
		.unknown(true),
};

// Pre-built auth validators
export const validateLogin = validateJoi(authSchemas.login);
export const validateRegister = validateJoi(authSchemas.register);
export const validateRefreshToken = validateJoi(authSchemas.refreshToken);
export const validateChangePassword = validateJoi(authSchemas.changePassword);
export const validateForgotPasswordSendOtp = validateJoi(authSchemas.forgotPasswordSendOtp);
export const validateForgotPasswordVerifyOtp = validateJoi(authSchemas.forgotPasswordVerifyOtp);
export const validateForgotPasswordReset = validateJoi(authSchemas.forgotPasswordReset);