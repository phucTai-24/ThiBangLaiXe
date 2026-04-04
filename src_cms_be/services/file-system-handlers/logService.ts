import { LOG } from "../../constants/index";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

declare global {
	var __baseDir: string;
}

class LoggingService {
	logChannelType: string;
	logType: string;
	isLogEnabled: boolean;
	logUrl: string;
	logMode: string;
	timeOut: number;

	constructor() {
		this.logChannelType = LOG.LOG_CHANNEL_TYPE;
		this.logType = LOG.LOG_TYPE;
		this.isLogEnabled = process.env.LOG_LEVEL !== "off";
		this.logUrl = process.env.LOG_URL || "./storage/logs";
		this.logMode = process.env.LOG_MODE || "file";
		this.timeOut = parseInt(process.env.LOG_TIMEOUT || "5000");
	}

	async logAsync(category: string, source: string, message: string | Error, params: null) {
		try {
			if (!this.isLogEnabled) return;
			let errorMessage: string | { message: string; stack?: string } | null = null;

			if (message instanceof Error) {
				errorMessage = { message: message.message };
				if (message.stack) errorMessage.stack = message.stack;
			}

			if (errorMessage == null) errorMessage = message;

			const // Log data
				logMessage = {
					messagesource: source,
					message: JSON.stringify(errorMessage).replace(/(\\n)|\\|"|\s{2,}/g, ""),
					logdatetime: new Date(),
					parameters: JSON.stringify(params),
				},
				jsonData = {
					service: this.logChannelType,
					type: this.logType,
					category: category,
					message: logMessage,
				};

			if (["console", "both"].includes(this.logMode)) {
				console.log(jsonData);
				// Force flush stdout to ensure logs appear immediately
				process.stdout.write("");
			}
			if (this.logMode != "console") {
				// Logging into file system
				const // Date formatters
					date = new Date(),
					dayLog = // Example: August 15th 2004 => 15082024
						date.getDate().toString().padStart(2, "0") +
						(date.getMonth() + 1).toString().padStart(2, "0") +
						date.getFullYear(),
					timeLog = // Example: 02:02:02 PM => 140202
						date.getHours().toString().padStart(2, "0") +
						date.getMinutes().toString().padStart(2, "0") +
						date.getSeconds().toString().padStart(2, "0"),
					timeRange = // Example: Logged at 13:45 => 1300_1400
						date.getHours().toString().padStart(2, "0") +
						"00_" +
						(date.getHours() + 1).toString().padStart(2, "0") +
						"00";

				const // Path resolvers
					store = resolve(
						global.__baseDir.replace("/dist", ""),
						"storage/logs",
						category == LOG.LOG_DB_CATEGORY ? "database" : "",
					),
					folderPath = resolve(store, dayLog),
					filePath = resolve(folderPath, `${timeRange}.log`);

				const fileContent = `${dayLog}${timeLog}: ${JSON.stringify(logMessage)}\n`;

				if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });
				writeFileSync(filePath, fileContent, { flag: "a+" });
			}
		} catch (ex) {
			console.log(ex);
			// Force flush stdout to ensure logs appear immediately
			process.stdout.write("");
		}
	}

	async logErrorAsync(source: string, message: Error, params: null) {
		await this.logAsync(LOG.LOG_ERROR_CATEGORY, source, message, params);
	}

	async logInfoAsync(source: string, message: Error, params: null) {
		await this.logAsync(LOG.LOG_INFO_CATEGORY, source, message, params);
	}

	async logTransAsync(source: string, message: Error, params: null) {
		await this.logAsync(LOG.LOG_TRANS_CATEGORY, source, message, params);
	}

	async logDBAsync(query: unknown) {
		await this.logAsync(LOG.LOG_DB_CATEGORY, "Sequelize", String(query), null);
	}
}

export default LoggingService;
export { LoggingService };
