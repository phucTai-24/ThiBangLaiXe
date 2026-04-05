// Express Base
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import autoroutes from "express-automatic-routes";
import compression from "compression";
import cookieParser from "cookie-parser";
// Server-Hardware interactions
import clc from "cli-color";
import { resolve } from "path";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
// Environments & Constansts
import { Environment } from "./interfaces/IEnv";
import { root } from "./root";
import constants from "./constants/index";
// Middlewares & Schedulers
import responseTemplate from "./middlewares/response";
import { apiQueryModifier } from "./middlewares/mod/api-query-modifier";
import verify from "./middlewares/auth";
// Swagger
import swaggerUI from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

// Serve Swagger to web
const serveSwagger = async (app: Application, storagePath: string) => {
	// move swagger output

	const doc = JSON.parse(readFileSync(`${storagePath}/swagger/swagger-output.json`, "utf8"));

	app.use(constants.SWAGGER_ROUTER, swaggerUI.serve, swaggerUI.setup(doc));
};

const generateSwagger = async (storagePath: string) => {
	const getSwaggerConfig = require("../lib/generator/openapi");
	const config = await getSwaggerConfig();
	const spec: any = swaggerJSDoc(config);
	const swaggerServePath = `${storagePath}/swagger/`;

	// Adjust paths to include base path
	const basePath = "/api/v1.0";
	const newPaths: any = {};
	for (const path in spec.paths) {
		newPaths[basePath + path] = spec.paths[path];
	}
	spec.paths = newPaths;

	mkdirSync(swaggerServePath, { recursive: true });
	writeFileSync(`${swaggerServePath}/swagger-output.json`, JSON.stringify(spec, null, 2));
};

const // Server functions
	serverLog = (content: string) => console.log(`${clc.magenta("⚡️[server]:")} ${content}`),
	initServer = async (storagePath: string, env: "development" | "staging" | "production") => {
		const // Setup constant
			app: Application = express(),
			corsOptions = (function (env: "development" | "staging" | "production") {
				if (env === "development") {
					return {
						origin: true,
						credentials: true, // Enable cookies in CORS
					} as CorsOptions;
				}
				const allowedOrigins =
					process.env.FRONTEND_URL?.split(",").concat(process.env.BACKEND_URL?.split(",") || []) || [];

				return {
					origin(origin, callback) {
						if (!origin || allowedOrigins.includes(origin)) {
							callback(null, true);
						} else {
							callback(new Error("Not allowed by CORS"));
						}
					},
					credentials: true, // Enable cookies in CORS
				} as CorsOptions;
			})(env);
		// Basic server requirements
		app.use(compression());
		app.use(cookieParser()); // Parse cookies
		app.use(express.json({ type: "application/json" })); // Middlewares
		app.use(responseTemplate as express.RequestHandler);
		app.use(apiQueryModifier() as express.RequestHandler);

		// Auto import controllers with express-automatic-routes
		app.all("/api/*", cors(corsOptions));
		autoroutes(app, { dir: resolve(__dirname, "./controllers/"), log: env == "development" });
		// Public folder
		app.use("/logs/*", verify as express.RequestHandler);
		// Serve uploaded files statically
		const uploadPath = process.env.UPLOAD_PATH || "./storage/uploads";
		app.use("/uploads", express.static(resolve(root, uploadPath)));
		// Health check endpoint
		app.get("/health", (req, res) => {
			res.status(200).json({
				status: "healthy",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				version: process.env.PROJECT_VERSION || "1.0.0",
				environment: env,
			});
		});

		// Serve swagger-output.json directly
		app.get("/swagger-output.json", (req, res) => {
			const filePath = resolve(storagePath, "swagger/swagger-output.json");
			res.sendFile(filePath, (err) => {
				if (err) {
					res.status(404).json({ error: "Swagger file not found" });
				}
			});
		});

		return app;
	},
	startServer = async (env: Environment) => {
		// Environment variables are loaded in root.ts via dotenv

		const // Path
			port: number = parseInt(process.env.PORT || "3000"),
			serverHost: string = process.env.BACKEND_URL || "http://localhost:3000",
			storagePath: string = resolve(root, "storage");
		// Generate swagger output
		switch (env.toLowerCase()) {
			case "development":
				return await startDevServer(storagePath, serverHost, port);
			default:
				return await startProductionServer(
					storagePath,
					serverHost,
					port,
					env.toLowerCase() as "staging" | "production",
				);
		}
	},
	startDevServer = async (storagePath: string, serverHost: string, port: number) => {
		const app = await initServer(storagePath, "development");
		// Generate swagger output

		await generateSwagger(storagePath);
		// await moveAsync(
		// 	resolve(__dirname, "templates/swagger/swagger-output.json"),
		// 	resolve(storagePath, "swagger/swagger-output.json"),
		// 	{ mkdirp: true },
		// );
		serveSwagger(app, storagePath);

		serverLog(`Serving static files from ${storagePath}`);
		serverLog(`App will be served at ${serverHost}`);

		app.listen(port, () => {
			serverLog(`Server started with worker ${clc.bgCyanBright(process.pid)}`);
		});
		return;
	},
	startProductionServer = async (
		storagePath: string,
		serverHost: string,
		port: number,
		env: "staging" | "production",
	) => {
		// Disable cluster for Docker production
		const app = await initServer(storagePath, env);
		await generateSwagger(storagePath);
		app.listen(port, () => {
			serverLog(`Server started`);
		});
		if (env == "staging") serveSwagger(app, storagePath);
		serverLog(`Serving static files from ${clc.blueBright(storagePath)}`);
		serverLog(`App will be served at ${clc.blueBright(serverHost)}\n`);
		return;
	};

export { startServer, serverLog };
