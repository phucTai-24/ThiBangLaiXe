const CLASS_NAME = "schedule";
import LoggingService from "./file-system-handlers/logService";
import schedule, { Job } from "node-schedule";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
// import { UserProvider } from "../providers/userProvider"; // Uncomment when you have a user provider

dayjs.extend(utc);
dayjs.extend(customParseFormat);

class ScheduleClass {
	logger: LoggingService;
	job: Record<string, Job> = {};
	// userProvider: UserProvider; // Uncomment when you have a user provider

	constructor() {
		this.logger = new LoggingService();
		// this.userProvider = new UserProvider(); // Uncomment when you have a user provider
	}

	init() {
		const METHOD_NAME = "Init Job Scheduling";
		const SOURCE = `${CLASS_NAME}.${METHOD_NAME}`;
		this.logger.logAsync("SCHEDULE", SOURCE, "Initialize schedule", null);
		this.job["midnight"] = schedule.scheduleJob("0 0 * * *", async function () {});

		this.job["perMin"] = schedule.scheduleJob("* * * * *", async function () {});
	}
}
export default ScheduleClass;
