import Joi from "joi";
import { validateJoi } from ".";

const uuidV4 = Joi.string().guid({ version: ["uuidv4"] });

const dateOnly = Joi.string()
	.trim()
	.pattern(/^\d{4}-\d{2}-\d{2}$/)
	.messages({
		"string.pattern.base": "Ngày không hợp lệ (định dạng YYYY-MM-DD)",
	});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const normalizeStringArray = (arr: unknown): string[] => {
	if (!Array.isArray(arr)) return [];
	const out: string[] = [];
	for (const item of arr) {
		if (isNonEmptyString(item)) out.push(item.trim());
	}
	return out;
};

interface CustomMessageContext {
	message: string;
}


const validateTermBusinessRules = (value: unknown, helpers: Joi.CustomHelpers) => {
	if (!isRecord(value)) return value;

	const start = isNonEmptyString(value.start_date) ? value.start_date.trim() : "";
	const end = isNonEmptyString(value.end_date) ? value.end_date.trim() : "";

	if (start && end && start > end) {
		return helpers.error("any.custom", <CustomMessageContext>{
			message: "start_date phải nhỏ hơn hoặc bằng end_date",
		});
	}

	const positionsRaw = value.positions;
	if (!Array.isArray(positionsRaw)) return value;

	const positionIds: string[] = [];
	for (const p of positionsRaw) {
		if (!isRecord(p)) continue;

		const positionId = isNonEmptyString(p.position_id) ? p.position_id.trim() : "";
		if (positionId) positionIds.push(positionId);

		const memberIds = normalizeStringArray(p.member_ids);
		const uniqueMemberIds = new Set(memberIds);
		if (uniqueMemberIds.size !== memberIds.length) {
			return helpers.error("any.custom", <CustomMessageContext>{
				message: "member_ids bị trùng trong cùng một position",
			});
		}
	}

	const uniquePositionIds = new Set(positionIds);
	if (uniquePositionIds.size !== positionIds.length) {
		return helpers.error("any.custom", <CustomMessageContext>{
			message: "position_id bị trùng trong positions",
		});
	}

	return value;
};

const positionItemSchema = Joi.object({
	position_id: uuidV4.required().messages({
		"any.required": "position_id là bắt buộc",
		"string.guid": "position_id phải là UUID v4 hợp lệ",
	}),
	member_ids: Joi.array()
		.items(
			uuidV4.required().messages({
				"any.required": "member_id là bắt buộc",
				"string.guid": "member_id phải là UUID v4 hợp lệ",
			}),
		)
		.min(1)
		.required()
		.messages({
			"array.min": "member_ids phải có ít nhất 1 phần tử",
			"any.required": "member_ids là bắt buộc",
		}),
}).required();

const positionsRequiredSchema = Joi.array().items(positionItemSchema).min(1).required().messages({
	"array.min": "positions phải có ít nhất 1 phần tử",
	"any.required": "positions là bắt buộc",
});

const positionsOptionalSchema = Joi.array().items(positionItemSchema).min(1).messages({
	"array.min": "positions phải có ít nhất 1 phần tử",
});

const createBodySchema = Joi.object({
	name: Joi.string().trim().min(1).max(255).required().messages({
		"any.required": "name là bắt buộc",
		"string.min": "name không được để trống",
		"string.max": "name không được vượt quá 255 ký tự",
	}),
	start_date: dateOnly.required().messages({
		"any.required": "start_date là bắt buộc",
	}),
	end_date: dateOnly.required().messages({
		"any.required": "end_date là bắt buộc",
	}),
	positions: positionsRequiredSchema,
})
	.required()
	.custom(validateTermBusinessRules)
	.messages({
		"any.custom": "{{#message}}",
	});

const updateBodySchema = Joi.object({
	name: Joi.string().trim().min(1).max(255).optional().messages({
		"string.min": "name không được để trống",
		"string.max": "name không được vượt quá 255 ký tự",
	}),
	start_date: dateOnly.optional(),
	end_date: dateOnly.optional(),
	positions: positionsOptionalSchema.optional(),
})
	.min(1)
	.required()
	.custom(validateTermBusinessRules)
	.messages({
		"object.min": "Body phải có ít nhất 1 trường để cập nhật",
		"any.custom": "{{#message}}",
	});

export const termSchemas = {
	create: Joi.object({
		body: createBodySchema.required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}),

	update: Joi.object({
		params: Joi.object({
			id: uuidV4.required().messages({
				"any.required": "Term ID là bắt buộc",
				"string.guid": "Term ID phải là UUID v4 hợp lệ",
			}),
		}).required(),
		body: updateBodySchema,
		query: Joi.object().required(),
	}),
};

export const validateTermCreate = validateJoi(termSchemas.create);
export const validateTermUpdate = validateJoi(termSchemas.update);
