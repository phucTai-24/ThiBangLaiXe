import { Req, Res } from "#interfaces/IApi";
import { NextFunction } from "express";
import { GenericError } from "#interfaces/error/generic";
import { validateRegisterUser, validateEmail } from "#services/data-handlers/validatorService";
import { validationResult, ContextRunner } from "express-validator";

export const validate = (validations: ContextRunner[]) => async (req: Req, res: Res, next: NextFunction) => {
	await Promise.all(validations.map((valdation) => valdation.run(req)));

	const errors = validationResult(req);
	if (errors.isEmpty()) return next();

	throw new GenericError({ vi: "Dữ liệu đầu vào không hợp lệ", en: "Invalid input data" }, "VALIDATION_ERROR", 400, {
		errors: errors.array({ onlyFirstError: true }),
	});
};

export const validateEmailEntry = validate(validateEmail());
export const validateRegister = validate(validateRegisterUser());

export default validate;
