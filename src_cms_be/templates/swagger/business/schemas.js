module.exports = {
	BusinessLogoSummary: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			path: { type: "string" },
		},
		required: ["id", "path"],
	},

	Business: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			name: { type: "string" },
			slug: { type: "string" },
			industry_ids: {
				type: "array",
				items: { type: "string", format: "uuid" },
			},			
			logo: {
				$ref: "#/components/schemas/BusinessLogoSummary",
				nullable: true,
			},
			rating: { type: "number", nullable: true },
			address: { type: "string", nullable: true },
			phone: { type: "string", nullable: true },
			website: { type: "string", nullable: true },
			created_at: { type: "string", format: "date-time" },
			created_by: { type: "string", format: "uuid", nullable: true },
			updated_at: { type: "string", format: "date-time" },
			updated_by: { type: "string", format: "uuid", nullable: true },
		},
		required: [
			"id",
			"name",
			"slug",
			"industry_ids",
			"logo",
			"rating",
			"address",
			"phone",
			"website",
			"created_at",
			"updated_at",
		],
	},

	BusinessCreate: {
		type: "object",
		properties: {
			name: { type: "string" },
			slug: { type: "string", nullable: true },
			industry_ids: {
				type: "array",
				items: { type: "string", format: "uuid" },
				nullable: true,
			},
			logo_id: { type: "string", format: "uuid", nullable: true },
			rating: { type: "number", nullable: true },
			address: { type: "string", nullable: true },
			phone: { type: "string", nullable: true },
			website: { type: "string", nullable: true },
		},
		required: ["name"],
	},

	BusinessUpdate: {
		type: "object",
		properties: {
			name: { type: "string", nullable: true },
			slug: { type: "string", nullable: true },
			industry_ids: {
				type: "array",
				items: { type: "string", format: "uuid" },
				nullable: true,
			},
			logo_id: { type: "string", format: "uuid", nullable: true },
			rating: { type: "number", nullable: true },
			address: { type: "string", nullable: true },
			phone: { type: "string", nullable: true },
			website: { type: "string", nullable: true },
		},
		required: [],
	},

	BusinessMutate: {
		oneOf: [
			{ $ref: "#/components/schemas/BusinessCreate" },
			{ $ref: "#/components/schemas/BusinessUpdate" },
		],
	},

	BusinessGetOneResponse: {
		type: "object",
		properties: {
			message: { type: "string", nullable: true },
			message_en: { type: "string", nullable: true },
			responseData: { $ref: "#/components/schemas/Business" },
			status: { type: "string", example: "success" },
			timeStamp: { type: "string" },
			violations: { type: "object", nullable: true },
		},
		required: ["message", "message_en", "responseData", "status", "timeStamp", "violations"],
	},

	BusinessGetAllResponse: {
		type: "object",
		properties: {
			message: { type: "string", nullable: true },
			message_en: { type: "string", nullable: true },
			responseData: {
				type: "object",
				properties: {
					rows: { type: "array", items: { $ref: "#/components/schemas/Business" } },
					count: { type: "number" },
					page: { type: "number" },
					pageSize: { type: "number" },
				},
				required: ["rows", "count", "page", "pageSize"],
			},
			status: { type: "string", example: "success" },
			timeStamp: { type: "string" },
			violations: { type: "object", nullable: true },
		},
		required: ["message", "message_en", "responseData", "status", "timeStamp", "violations"],
	},

	BusinessDeleteResponse: {
		type: "object",
		properties: {
			message: { type: "string", nullable: true },
			message_en: { type: "string", nullable: true },
			responseData: {
				type: "object",
				properties: {
					id: { type: "string", format: "uuid" },
				},
				required: ["id"],
			},
			status: { type: "string" },
			timeStamp: { type: "string" },
			violations: { type: "object", nullable: true },
		},
		required: ["message", "message_en", "responseData", "status", "timeStamp", "violations"],
	},
};