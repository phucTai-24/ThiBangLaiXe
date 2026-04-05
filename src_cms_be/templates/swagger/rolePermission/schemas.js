module.exports = {
	RolePermission: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
			},
			permission_id: {
				type: "string",
				format: "uuid",
			},
			role_id: {
				type: "string",
				format: "uuid",
				nullable: true,
			},
			created_at: {
				type: "string",
				format: "date-time",
				nullable: true,
			},
		},
		required: ["id", "permission_id"],
	},

	RolePermissionBulkCreateByRole: {
		type: "object",
		required: ["permission_ids"],
		properties: {
			permission_ids: {
				type: "array",
				minItems: 1,
				items: {
					type: "string",
					format: "uuid",
				},
				example: [
					"550e8400-e29b-41d4-a716-446655440000",
					"6ba7b810-9dad-11d1-80b4-00c04fd430c8",
				],
				description: "Danh sách permission IDs cần gán cho role",
			},
		},
	},

	RolePermissionBulkDelete: {
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
				example: ["123e4567-e89b-12d3-a456-426614174000"],
			},
		},
	},
};
