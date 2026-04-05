import { GenericErrorHandler } from "./ViolationImpl";
import { DatabaseErrorHandler } from "../handler/database-error-handler";
import { IErrorHandler } from "../";

// Interface for Violations
export interface IViolation {
	message: { [key: string]: string };
	type: string;
	code: number;
	actor?: string;
	additionalData?: unknown;
}

export type IViolations = IViolation[];

// Error Processor Factory
export class ErrorProcessor {
	private static instance: ErrorProcessor;
	private handlers: IErrorHandler[];

	private constructor() {
		this.handlers = [
			new DatabaseErrorHandler(), // Sequelize error handler
			new GenericErrorHandler(), // Fallback handler
		];
	}

	public static getInstance(): ErrorProcessor {
		ErrorProcessor.instance ??= new ErrorProcessor();
		return ErrorProcessor.instance;
	}

	process(error: unknown, additionalData: Record<string, unknown> = {}): IViolations {
		console.error("ErrorProcessor", error);
		const handler = this.handlers.find((h) => h.canHandle(error));
		if (!handler) {
			throw new Error("No error handler found for the given error");
		}
		return handler.handle(error, additionalData);
	}
}
