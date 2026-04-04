module.exports = {
	UserRoleUserSummary: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				example: "8c6c68f0-4e7e-4e59-a4fa-04af618c54df",
			},
			email: {
				type: "string",
				format: "email",
				example: "admin@example.com",
			},
			username: {
				type: "string",
				nullable: true,
				example: "system_admin",
			},
			first_name: {
				type: "string",
				nullable: true,
				example: "System",
			},
			last_name: {
				type: "string",
				nullable: true,
				example: "Admin",
			},
			status: {
				type: "string",
				nullable: true,
				example: "active",
			},
			type: {
				type: "string",
				enum: ["member", "businessman", "subscriber"],
				example: "member",
			},
		},
	},

	UserRoleRoleSummary: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				example: "0c81ee38-bb40-40c0-bc39-5f3e8a7a3f70",
			},
			name: {
				type: "string",
				example: "system_admin",
			},
			description: {
				type: "string",
				nullable: true,
				example: "System administrator role",
			},
		},
	},

	UserRole: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				example: "bc7dfdb6-06e0-4d12-a9b4-8fbec7f4456a",
			},
			user_id: {
				type: "string",
				format: "uuid",
				example: "8c6c68f0-4e7e-4e59-a4fa-04af618c54df",
			},
			role_id: {
				type: "string",
				format: "uuid",
				example: "0c81ee38-bb40-40c0-bc39-5f3e8a7a3f70",
			},
			assigned_at: {
				type: "string",
				format: "date-time",
				nullable: true,
				example: "2026-03-25T09:00:00.000Z",
			},
			assigned_by: {
				type: "string",
				format: "uuid",
				nullable: true,
				example: "8c6c68f0-4e7e-4e59-a4fa-04af618c54df",
			},
			is_primary: {
				type: "boolean",
				example: true,
			},
			updated_at: {
				type: "string",
				format: "date-time",
				nullable: true,
				example: "2026-03-25T09:00:00.000Z",
			},
			user: {
				allOf: [{ $ref: "#/components/schemas/UserRoleUserSummary" }],
				nullable: true,
			},
			role: {
				allOf: [{ $ref: "#/components/schemas/UserRoleRoleSummary" }],
				nullable: true,
			},
			assigned_by_user: {
				allOf: [{ $ref: "#/components/schemas/UserRoleUserSummary" }],
				nullable: true,
			},
		},
	},

	UserRoleCreate: {
		type: "object",
		required: ["user_id", "role_id"],
		properties: {
			user_id: {
				type: "string",
				format: "uuid",
				example: "8c6c68f0-4e7e-4e59-a4fa-04af618c54df",
			},
			role_id: {
				type: "string",
				format: "uuid",
				example: "0c81ee38-bb40-40c0-bc39-5f3e8a7a3f70",
			},
			is_primary: {
				type: "boolean",
				example: true,
				default: false,
			},
		},
	},

	UserRoleUpdate: {
		type: "object",
		properties: {
			role_id: {
				type: "string",
				format: "uuid",
				example: "0c81ee38-bb40-40c0-bc39-5f3e8a7a3f70",
			},
			is_primary: {
				type: "boolean",
				example: true,
			},
		},
	},

	UserRoleListData: {
		type: "object",
		properties: {
			rows: {
				type: "array",
				items: {
					$ref: "#/components/schemas/UserRole",
				},
			},
			count: {
				type: "integer",
				example: 25,
			},
			page: {
				type: "integer",
				example: 1,
			},
			pageSize: {
				type: "integer",
				example: 10,
			},
		},
	},
};