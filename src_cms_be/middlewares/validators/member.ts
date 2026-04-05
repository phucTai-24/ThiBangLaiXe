import Joi from "joi";
import { validateJoi } from ".";

const uuid_v4 = () => Joi.string().guid({ version: ["uuidv4"] });

const date_only = () =>
	Joi.string()
		.trim()
		.pattern(/^\d{4}-\d{2}-\d{2}$/)
		.messages({
			"string.pattern.base": "Ngày sinh không hợp lệ",
		});

const create_schema = Joi.object({
	body: Joi.object({
		full_name: Joi.string().trim().min(1).max(255).required().messages({
			"any.required": "full_name là bắt buộc",
			"string.empty": "full_name không được để trống",
		}),
		avatar_url: Joi.string().uri().allow("", null).optional(),
		birth_date: date_only().allow("", null).optional(),
		business_id: uuid_v4().allow(null).optional().messages({
			"string.guid": "business_id phải là UUID hợp lệ",
		}),
		position_id: uuid_v4().allow(null).optional().messages({
			"string.guid": "position_id phải là UUID hợp lệ",
		}),
	}).required(),
	params: Joi.object().required(),
	query: Joi.object().required(),
});

const update_schema = Joi.object({
	params: Joi.object({
		id: uuid_v4().required().messages({
			"any.required": "ID member là bắt buộc",
			"string.guid": "ID phải là UUID hợp lệ",
		}),
	}).required(),
	body: Joi.object({
		full_name: Joi.string().trim().min(1).max(255).optional(),
		avatar_url: Joi.string().uri().allow("", null).optional(),
		birth_date: date_only().allow("", null).optional(),
		business_id: uuid_v4().allow(null).optional().messages({
			"string.guid": "business_id phải là UUID hợp lệ",
		}),
		position_id: uuid_v4().allow(null).optional().messages({
			"string.guid": "position_id phải là UUID hợp lệ",
		}),
	}).required(),
	query: Joi.object().required(),
});

const import_schema = Joi.object({
	body: Joi.object({
		sheet_name: Joi.string().trim().max(100).allow("", null).optional(),
	}).required(),
	params: Joi.object().required(),
	query: Joi.object().required(),
});

export const validateMemberCreate = validateJoi(create_schema);
export const validateMemberUpdate = validateJoi(update_schema);
export const validateMemberImport = validateJoi(import_schema);