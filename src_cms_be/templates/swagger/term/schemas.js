module.exports = {
	TermMemberAvatar: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				example: "uuid_code",
			},
			path: {
				type: "string",
				example: "/uploads/members/avatar-1.jpg",
			},
		},
		required: ["id", "path"],
	},

	TermMember: {
		type: "object",
		properties: {
			member_id: {
				type: "string",
				format: "uuid",
				example: "uuid_code",
			},
			full_name: {
				type: "string",
				nullable: true,
				example: "name1",
			},
			avatar: {
				oneOf: [
					{ $ref: "#/components/schemas/TermMemberAvatar" },
					{ type: "null" },
				],
			},
		},
		required: ["member_id", "full_name", "avatar"],
	},

	TermPositionResponse: {
		type: "object",
		properties: {
			position_id: {
				type: "string",
				format: "uuid",
				example: "uuid_code",
			},
			name: {
				type: "string",
				example: "Chủ tịch",
			},
			members: {
				type: "array",
				items: {
					$ref: "#/components/schemas/TermMember",
				},
			},
		},
		required: ["position_id", "name", "members"],
	},

	TermResponse: {
		type: "object",
		properties: {
			term_id: {
				type: "string",
				format: "uuid",
				example: "uuid_code",
			},
			name: {
				type: "string",
				example: "Nhiệm kỳ 20xx - 20xx",
			},
			start_date: {
				type: "string",
				format: "date",
				example: "2025-01-01",
			},
			end_date: {
				type: "string",
				format: "date",
				example: "2030-12-31",
			},
			positions: {
				type: "array",
				items: {
					$ref: "#/components/schemas/TermPositionResponse",
				},
			},
		},
		required: ["term_id", "name", "start_date", "end_date", "positions"],
	},

	TermPositionRequestItem: {
		type: "object",
		properties: {
			position_id: {
				type: "string",
				format: "uuid",
				example: "uuid_code",
			},
			member_ids: {
				type: "array",
				minItems: 1,
				items: {
					type: "string",
					format: "uuid",
				},
				example: [
					"uuid_code1",
					"uuid_code2",
				],
			},
		},
		required: ["position_id", "member_ids"],
	},

	TermCreateRequest: {
		type: "object",
		required: ["name", "start_date", "end_date", "positions"],
		properties: {
			name: {
				type: "string",
				example: "Nhiệm kỳ 20xx - 20xx",
			},
			start_date: {
				type: "string",
				format: "date",
				example: "2025-01-01",
			},
			end_date: {
				type: "string",
				format: "date",
				example: "2030-12-31",
			},
			positions: {
				type: "array",
				minItems: 1,
				items: {
					$ref: "#/components/schemas/TermPositionRequestItem",
				},
			},
		},
	},

	TermUpdateRequest: {
		type: "object",
		minProperties: 1,
		properties: {
			name: {
				type: "string",
				example: "Nhiệm kỳ 20xx - 20xx (updated)",
			},
			start_date: {
				type: "string",
				format: "date",
				example: "2025-01-01",
			},
			end_date: {
				type: "string",
				format: "date",
				example: "2030-12-31",
			},
			positions: {
				type: "array",
				minItems: 1,
				items: {
					$ref: "#/components/schemas/TermPositionRequestItem",
				},
			},
		},
	},
};