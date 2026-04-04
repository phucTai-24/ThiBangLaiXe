import { IViolations } from "./violations/IViolations";

export interface IErrorHandler {
	canHandle(error: unknown): boolean;
	handle(error: unknown, additionalData?: unknown): IViolations;
}

export interface IAdditionalData {
	formFields?: unknown[];
}
