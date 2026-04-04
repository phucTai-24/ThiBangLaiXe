module.exports = {
	Permission: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			name: { type: "string", maxLength: 100 },
			description: { type: "string", nullable: true },
			resource: { type: "string", maxLength: 100 },
			action: { type: "string", maxLength: 50 },
			created_at: { type: "string", format: "date-time", nullable: true },
			created_by: { type: "string", format: "uuid", nullable: true },
			updated_by: { type: "string", format: "uuid", nullable: true },
		},
		required: ["id", "name", "resource", "action"],
	},

	PermissionCreate: {
		type: "object",
		required: ["name", "resource", "action"],
		properties: {
			name: {
				type: "string",
				maxLength: 100,
				example: "Create User",
			},
			description: {
				type: "string",
				nullable: true,
				example: "Permission to create new users",
			},
			resource: {
				type: "string",
				maxLength: 100,
				example: "user",
			},
			action: {
				type: "string",
				maxLength: 50,
				example: "create",
			},
		},
	},

	PermissionUpdate: {
		type: "object",
		minProperties: 1,
		properties: {
			name: {
				type: "string",
				maxLength: 100,
				example: "Update User",
			},
			description: {
				type: "string",
				nullable: true,
				example: "Permission to update user information",
			},
			resource: {
				type: "string",
				maxLength: 100,
				example: "user",
			},
			action: {
				type: "string",
				maxLength: 50,
				example: "update",
			},
		},
	},

	PermissionMutate: {
		$ref: "#/components/schemas/PermissionCreate",
	},

	PermissionBulkCreate: {
		type: "object",
		required: ["permissions"],
		properties: {
			permissions: {
				type: "array",
				minItems: 1,
				items: {
					$ref: "#/components/schemas/PermissionCreate",
				},
			},
		},
	},

	PermissionBulkDelete: {
		type: "object",
		required: ["ids"],
		properties: {
			ids: {
				type: "array",
				minItems: 1,
				items: {
					type: "string",
					format: "uuid",
				},
				example: ["123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174001"],
			},
		},
	},
};
