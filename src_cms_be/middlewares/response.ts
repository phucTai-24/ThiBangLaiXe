import { NextFunction } from "express";
import {
	ErrorStatusParams,
	OkParams,
	ViolationDTO,
	getMessage,
	MeUError,
	ResponseDTO,
	Req,
	Res,
} from "#interfaces/IApi";
import LoggingService from "../services/file-system-handlers/logService";
import constants from "../constants/index";
import { ErrorProcessor } from "#interfaces/error/violations/IViolations";

export default function (_req: Req, res: Res, next: NextFunction): void {
	const logger = new LoggingService();
	const errorProcessor = ErrorProcessor.getInstance();

	res.sendErrorStatus = function ({
		status,
		message = constants.DEFAULT_ERROR_MESSAGE,
		message_en = constants.DEFAULT_ERROR_MESSAGE_EN,
		err,
	}: ErrorStatusParams) {
		let SOURCE = "ERROR STATUS";
		let violationMess: string = "";
		const violations: ViolationDTO[] = [];

		if (err instanceof MeUError) {
			violationMess = getMessage(err.errorCode, err.errorType);
			SOURCE += " " + err.errorType;
			if (violationMess) violations.push(new ViolationDTO(err.errorCode, violationMess, err.errorData));
		}

		if (violations.length == 0)
			violations.push(
				new ViolationDTO(
					constants.DEFAULT_ERROR_CODE,
					getMessage(constants.DEFAULT_ERROR_CODE, constants.ERROR_TYPE.API),
				),
			);

		logger.logErrorAsync(SOURCE, err || new Error("Unknown error"), null);

		res.status(status).json(ResponseDTO({ data: null, message, message_en, violations }));
	};

	res.sendError = function ({ err }: { err: Error | MeUError }) {
		const violationMess = err.message;
		const violations: ViolationDTO[] = [];
		const SOURCE = "ERROR ";
		if (err instanceof MeUError && err.errorCode) {
			violations.push(new ViolationDTO(err.errorCode, violationMess));
		}

		if (violations.length == 0) {
			violations.push(
				new ViolationDTO(
					constants.DEFAULT_ERROR_CODE,
					getMessage(constants.DEFAULT_ERROR_CODE, constants.ERROR_TYPE.API),
				),
			);
		}
		logger.logErrorAsync(SOURCE, err, null).catch((err) => console.log(err));

		res.status(500).json(
			ResponseDTO({
				data: null,
				message: constants.DEFAULT_ERROR_MESSAGE,
				message_en: constants.DEFAULT_ERROR_MESSAGE_EN,
				violations,
			}),
		);
	};

	res.error = function (err: unknown) {
		const violations = errorProcessor.process(err);
		const mainViolation = violations[0];

		// Convert IViolations to ViolationDTO[]
		const violationDTOs: ViolationDTO[] = violations.map(
			(v) => new ViolationDTO(v.code, v.message.vi || v.message.en || "Unknown error", v.additionalData),
		);

		return res.status(mainViolation?.code ?? 500).json(
			ResponseDTO({
				data: null,
				message: mainViolation?.message?.vi ?? "Đã có lỗi xảy ra",
				message_en: mainViolation?.message?.en ?? "An error has occurred",
				violations: violationDTOs,
			}),
		);
	};

	res.sendOk = function ({
		data,
		message = constants.DEFAULT_SUCCESS_MESSAGE,
		message_en = constants.DEFAULT_SUCCESS_MESSAGE_EN,
		statusCode,
	}: OkParams) {
		res.status(statusCode ?? 200).json(ResponseDTO({ data, message, message_en }));
	};

	next();
}
