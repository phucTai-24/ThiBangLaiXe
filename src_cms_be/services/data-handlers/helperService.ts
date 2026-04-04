import { existsSync } from "fs";
import { fork } from "child_process";

export async function wrapCompression(
	/** Path to the compression module */
	modulePath: string,
	/** Size to be compressed, between: desktop | mobile | tablet */
	compressSize: string,
	/** Type of file, between: IMAGE | VIDEO */
	compressType: string,
	/** File collected from multer middleware */
	file: Express.Multer.File,
	/** Return options */
	fileReturnOptions: Record<string, string | undefined>,
): Promise<void> {
	if (!existsSync(modulePath)) {
		const { LoggingService } = await import("#services/file-system-handlers/logService.js");
		const logger = new LoggingService();
		await logger.logErrorAsync("wrapCompression", new Error("Module path not found"), null);
		throw new Error("Missing compression service");
	}

	return new Promise<void>((resolve, reject) => {
		const child = fork(modulePath);
		child.on("error", (err) => reject(new Error(err.message)));
		child.send({ compressType, file, compressSize });
		child.on("message", (message: { statusCode: number; text?: string; path: { [key: string]: string } }) => {
			if (message.statusCode == 500) reject(new Error(<string>message.text));
			else {
				for (const [key, value] of Object.entries(message.path)) fileReturnOptions[key] = value;
				resolve();
			}
		});
	});
}

export function getBoolean(value: unknown) {
	switch (value) {
		case true:
		case "true":
		case 1:
		case "1":
		case "on":
		case "yes":
			return true;
		default:
			return false;
	}
}

export default {
	wrapCompression,
	getBoolean,
};
