/** @type {import("swagger-jsdoc").Options} */
module.exports = {
	definition: {
		openapi: "3.1.0",
		info: {
			version: "1.0.0",
			title: process.env.PROJECT_NAME || "Backend Template",
			description: "Coded by Meu TEAM",
		},
		servers: [{ url: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/v1.0` }],
		components: {
			securitySchemes: require("./common/securitySchemes"),
			parameters: require("./common/parameters"),
			schemas: {
				...require("./common/schemas"),
				...require("./auth/schemas"),
				...require("./member/schemas"),
				...require("./permission/schemas"),
				...require("./role/schemas"),
				...require("./rolePermission/schemas"),
				...require("./term/schemas"),
			},
			responses: require("./common/responses"),
		},
	},
	apis: ["./dist/controllers/**/*.js"],
};
