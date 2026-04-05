import { IViolations } from "../violations/IViolations";
import { IErrorHandler } from "../index";
import { BaseError, ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from "sequelize";

export interface DatabaseErrorAdditionalData {
	formFields?: unknown[];
	errorFields?: string[];
}

/** Sequelize Error Handler */
export class DatabaseErrorHandler implements IErrorHandler {
	canHandle(error: unknown): boolean {
		return error instanceof ValidationError || error instanceof ForeignKeyConstraintError || error instanceof BaseError;
	}

	handle(error: unknown, additionalData?: DatabaseErrorAdditionalData): IViolations {
		if (error instanceof UniqueConstraintError) {
			return [
				{
					message: { en: `Unique constraint error`, vi: `Lỗi ràng buộc duy nhất` },
					type: "SequelizeUniqueConstraintError",
					code: 400,
					additionalData: {
						fields: error.errors.map((err) => ({
							field: err.path,
							message: { en: "Value must be unique", vi: "Giá trị phải duy nhất" },
						})),
						...additionalData,
					},
				},
			];
		}

		if (error instanceof ValidationError) {
			return [
				{
					message: { en: "Database validation error", vi: "Lỗi kiểm tra cơ sở dữ liệu" },
					type: "SequelizeValidationError",
					code: 400,
					additionalData: {
						fields: error.errors.map((e) => ({ field: e.path, message: { en: e.message, vi: e.message } })),
						...additionalData,
					},
				},
			];
		}

		if (error instanceof ForeignKeyConstraintError) {
			const fields = error?.fields ? Object.keys(error?.fields) : [];
			return [
				{
					message: { en: "Foreign key constraint error", vi: "Lỗi ràng buộc khóa ngoại" },
					type: "SequelizeForeignKeyConstraintError",
					code: 400,
					additionalData: {
						fields: fields.map((key) => ({
							field: key,
							message: { en: "Invalid foreign key reference", vi: "Tham chiếu khóa ngoại không hợp lệ" },
						})),
						...additionalData,
					},
				},
			];
		}

		if (error instanceof BaseError) {
			return [
				{
					message: { en: "Database error", vi: "Lỗi cơ sở dữ liệu" },
					type: "SequelizeBaseError",
					code: 400,
					additionalData: {
						fields: [{ field: "internal", message: { en: error.message, vi: error.message } }],
						message: error.message,
						stack: error.stack,
						...additionalData,
					},
				},
			];
		}

		throw new Error("Unhandled database error type");
	}
}
