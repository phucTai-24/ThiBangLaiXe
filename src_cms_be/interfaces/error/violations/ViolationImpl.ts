import { IViolations } from "./IViolations";
import { GenericError } from "../generic";
import { IErrorHandler } from "../";

// Fallback Handler
export class GenericErrorHandler implements IErrorHandler {
	canHandle(_: unknown): boolean {
		return true;
	}

	handle(error: GenericError | GenericError[] | null): IViolations {
		// Handle single GenericError
		if (error instanceof GenericError)
			return [{ message: error.message, type: error.type, code: error.code, additionalData: error.additionalData }];

		// Handle array of GenericErrors
		if (Array.isArray(error))
			return error.map((e) => ({ message: e.message, type: e.type, code: e.code, additionalData: e.additionalData }));

		return [
			{
				message: { en: "Internal server error", vi: "Lỗi máy chủ" },
				type: "InternalServerError",
				code: 500,
				additionalData: { fields: [], stack: error?.["stack"] || "No stack trace" },
			},
		];
	}
}
