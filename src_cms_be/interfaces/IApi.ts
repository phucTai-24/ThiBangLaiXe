import { IncomingHttpHeaders } from "http";
import { Request, Response } from "express";
import { SequelizeApiPaginatePayload } from "#services/database/sequelize/types";
import constant from "../constants/index";
import { JWTPayload } from "#services/authService";

export type ListData<T = unknown> = {
	rows: T[];
	count: number;
	pageSize: number;
	page: number;
};

export type ErrorStatusParams = {
	status: number;
	message: string;
	message_en: string;
	err?: Error | MeUError;
};

export type OkParams = {
	data: unknown;
	message?: string;
	message_en?: string;
	statusCode?: number;
};

export interface Req<T = unknown> extends Omit<Request, "user"> {
	user?: JWTPayload;
	payload?: SequelizeApiPaginatePayload<T>;
	headers: IncomingHttpHeaders & { isadmin?: string };
	[key: string]: unknown;
}

export interface Res extends Response {
	sendErrorStatus?: (params: ErrorStatusParams) => void;
	sendOk: (params: OkParams) => void;
	sendError?: (params: { err: Error | MeUError }) => void;
	error: (err: unknown) => void;
}

export interface QueryReturnType<T = unknown> {
	rows: T[];
	count: number;
	totalPages: number;
	currentPage: number;
}

// DTOs
export type ResponseDTOParams = {
	data?: unknown;
	message?: string;
	message_en?: string;
	violations?: ViolationDTO[];
};

export const ResponseDTO = ({ data, message, message_en, violations }: ResponseDTOParams) => ({
	message: !message ? null : message,
	message_en: !message_en ? null : message_en,
	responseData: !data ? null : data,
	status: violations === undefined || violations === null || violations.length == 0 ? "success" : "fail",
	timeStamp: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
	violations: !violations ? null : violations,
});

export class MeUError extends Error {
	errorCode: number;
	errorType: string;
	errorData: unknown;

	constructor(errorCode: number, errorType: string = "", errorData: unknown = null) {
		// Calling parent constructor of base Error class.
		super("");

		// Saving class name in the property of our custom error as a shortcut.
		this.name = this.constructor.name;

		// Capturing stack trace, excluding constructor call from it.
		// Error.captureStackTrace(this, this.constructor);

		// You can use any additional properties you want.
		// I'm going to use preferred HTTP status for this error types.
		// `500` is the default value if not specified.
		this.errorCode = errorCode || -999;
		this.errorType = errorType || constant.ERROR_TYPE.API;
		this.errorData = errorData;
	}
}

export class ViolationDTO {
	private code: number;
	private message: string;
	private action: unknown;
	constructor(code: number, message: string, action: unknown = null) {
		this.code = code;
		this.message = message;
		this.action = action;
	}
}

export function getMessage(errorCode: number, errorType: string) {
	// Catch this exception and proceed to get the default error message
	let message: string;
	try {
		const errorConfig = constant.ErrorConfiguration[errorType as keyof typeof constant.ErrorConfiguration];
		message = errorConfig[errorCode as keyof typeof errorConfig];
	} catch (_ex) {
		const apiConfig = constant.ErrorConfiguration[constant.ERROR_TYPE.API as keyof typeof constant.ErrorConfiguration];
		message = apiConfig[errorCode as keyof typeof apiConfig];
	}
	return message;
}
