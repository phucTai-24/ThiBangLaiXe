import { Language } from "../../constants/index";

export class GenericError {
	message: Record<Language, string>;
	type: string;
	code: number;
	additionalData?: unknown;

	constructor(message?: Record<Language, string>, type?: string, code?: number, additionalData?: unknown) {
		this.message = message || { en: "Internal server error", vi: "Lỗi máy chủ" };
		this.type = type || "InternalServerError";
		this.code = code || 500;
		this.additionalData = additionalData;
	}

	// Factory method to create error instances more easily
	static create(
		messages: Record<Language, string>,
		type: string,
		code: number,
		additionalData?: unknown,
	): GenericError {
		return new GenericError(messages, type, code, additionalData);
	}
}
