module.exports = {
	MemberCreate: {
		type: "object",
		required: ["full_name"],
		properties: {
			full_name: { type: "string", example: "John Doe" },
			avatar_url: { type: "string", nullable: true, example: "https://example.com/avatar.jpg" },
			birth_date: { type: "string", format: "date", nullable: true, example: "1990-01-15" },
			business_id: { type: "string", format: "uuid", nullable: true, example: "business-uuid" },
			position_id: { type: "string", format: "uuid", nullable: true, example: "position-uuid" },
		},
	},

	MemberUpdate: {
		type: "object",
		properties: {
			full_name: { type: "string", example: "John Doe" },
			avatar_url: { type: "string", nullable: true, example: "https://example.com/avatar.jpg" },
			birth_date: { type: "string", format: "date", nullable: true, example: "1990-01-15" },
			business_id: { type: "string", format: "uuid", nullable: true, example: "business-uuid" },
			position_id: { type: "string", format: "uuid", nullable: true, example: "position-uuid" },
		},
	},

	MemberImportWarningItem: {
		type: "object",
		properties: {
			row_number: { type: "integer", example: 12 },
			full_name: { type: "string", nullable: true, example: "NGUYỄN VĂN A" },
			message: {
				type: "string",
			},
		},
	},

	MemberImportResponse: {
		type: "object",
		properties: {
			sheet_name: { type: "string", example: "Hoi Vien" },
			total_rows: { type: "integer", example: 120 },
			created_member_count: { type: "integer", example: 100 },
			updated_member_count: { type: "integer", example: 20 },
			created_business_count: { type: "integer", example: 15 },
			updated_business_count: { type: "integer", example: 8 },
			created_position_count: { type: "integer", example: 4 },
			warning_count: { type: "integer", example: 9 },
			warnings: {
				type: "array",
				items: {
					$ref: "#/components/schemas/MemberImportWarningItem",
				},
			},
		},
	},
};