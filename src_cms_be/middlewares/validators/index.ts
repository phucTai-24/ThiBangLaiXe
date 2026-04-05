import Joi from "joi";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { GenericError } from "#interfaces/error/generic";
import type { Res } from "#interfaces/IApi";

type ValidationErrorItem = {
	field: string;
	message: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const normalizeFieldPath = (path: Array<string | number>): string => {
	const parts = path.map(String);

	// Joi path usually like: ["body","email"] or ["params","id"]
	if (parts.length >= 2 && (parts[0] === "body" || parts[0] === "params" || parts[0] === "query")) {
		return parts.slice(1).join(".") || parts[0];
	}

	return parts.join(".") || "unknown";
};

const buildValidationError = (details: Joi.ValidationErrorItem[]): GenericError => {
	const errors: ValidationErrorItem[] = details.map((detail) => ({
		field: normalizeFieldPath(detail.path),
		message: detail.message,
	}));

	return new GenericError(
		{ vi: "Dữ liệu đầu vào không hợp lệ", en: "Invalid input data" },
		"VALIDATION_ERROR",
		400,
		{ errors },
	);
};

const sendValidationError = (res: Response, err: GenericError): void => {
	// Response runtime has .error() from response middleware, but TS Response doesn't know it
	(res as unknown as Res).error(err);
};

/**
 * validateJoi (Core)
 * - Compatible with express-automatic-routes Middleware type
 * - Validate body/params/query
 * - stripUnknown to prevent unexpected fields
 * - abortEarly=false to return all errors
 */
export const validateJoi = (schema: Joi.ObjectSchema): RequestHandler => {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const payload = {
				body: req.body,
				params: req.params,
				query: req.query,
			};

			const { error, value } = schema.validate(payload, {
				abortEarly: false,
				stripUnknown: true,
				convert: true,
			});

			if (error) {
				sendValidationError(res, buildValidationError(error.details));
				return;
			}

			// Replace request data with validated values (if available)
			if (isRecord(value)) {
				if ("body" in value) req.body = (value as { body: unknown }).body;
				if ("params" in value) req.params = (value as { params: Request["params"] }).params;
				if ("query" in value) req.query = (value as { query: Request["query"] }).query;
			}

			next();
		} catch (err) {
			// Any unexpected error in validation should not leak raw error to client
			const genericError =
				err instanceof GenericError
					? err
					: new GenericError({ vi: "Lỗi hệ thống", en: "Internal server error" }, "INTERNAL_SERVER_ERROR", 500);

			(res as unknown as Res).error(genericError);
		}
	};
};

// Common validation schemas that can be used across different modules
export const commonSchemas = {
	email: Joi.object({
		body: Joi.object({
			email: Joi.string().email().required().messages({
				"string.email": "Email không hợp lệ",
				"any.required": "Email là bắt buộc",
			}),
		}).required(),
		params: Joi.object().required(),
		query: Joi.object().required(),
	}).required(),

	id: Joi.object({
		params: Joi.object({
			id: Joi.string().guid({ version: "uuidv4" }).required().messages({
				"any.required": "ID là bắt buộc",
				"string.guid": "ID phải là UUID hợp lệ",
			}),
		}).required(),
		body: Joi.object().required(),
		query: Joi.object().required(),
	}).required(),

	/**
	 * NOTE:
	 * listQuery is used for custom query validation (if you want),
	 * but current project usually uses queryModifier for standard params.
	 */
	listQuery: Joi.object({
		page: Joi.number().integer().min(1).optional(),
		pageSize: Joi.number().integer().min(1).max(100).optional(),
		filters: Joi.string().optional(),
		sortField: Joi.string().optional(),
		sortOrder: Joi.string().valid("asc", "desc").optional(),
	}).required(),
};

// Pre-built common validators
export const validateEmail = validateJoi(commonSchemas.email);
export const validateId = validateJoi(commonSchemas.id);

export default validateJoi;