import { Sequelize } from "sequelize";
import LoggingService from "../../file-system-handlers/logService";

const sequelize: Sequelize = new Sequelize({
	username: process.env.DB_USER!,
	password: process.env.DB_PASSWORD!,
	database: process.env.DB_NAME!,
	host: process.env.DB_HOST!,
	port: parseInt(process.env.DB_PORT || "5432"),
	dialect: "postgres", // Default to postgres, can be overridden
	logging(sql) {
		const logger = new LoggingService();
		logger.logDBAsync(sql);
	},
});

export default sequelize;
