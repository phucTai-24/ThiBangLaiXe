module.exports = {
	Role: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
			},
			name: {
				type: "string",
				maxLength: 100,
			},
			description: {
				type: "string",
				maxLength: 500,
				nullable: true,
			},
			created_at: {
				type: "string",
				format: "date-time",
				nullable: true,
			},
			updated_at: {
				type: "string",
				format: "date-time",
				nullable: true,
			},
			created_by: {
				type: "string",
				format: "uuid",
				nullable: true,
			},
			updated_by: {
				type: "string",
				format: "uuid",
				nullable: true,
			},
		},
		required: ["id", "name"],
	},

	RoleCreate: {
		type: "object",
		required: ["name"],
		properties: {
			name: {
				type: "string",
				maxLength: 100,
				example: "Admin",
			},
			description: {
				type: "string",
				maxLength: 500,
				nullable: true,
				example: "Quản trị viên hệ thống",
			},
		},
	},

	RoleUpdate: {
		type: "object",
		minProperties: 1,
		properties: {
			name: {
				type: "string",
				maxLength: 100,
				example: "Super Admin",
			},
			description: {
				type: "string",
				maxLength: 500,
				nullable: true,
				example: "Quản trị viên cấp cao",
			},
		},
	},

	RoleBulkCreate: {
		type: "object",
		required: ["roles"],
		properties: {
			roles: {
				type: "array",
				minItems: 1,
				items: {
					$ref: "#/components/schemas/RoleCreate",
				},
			},
		},
	},

	RoleBulkDelete: {
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
