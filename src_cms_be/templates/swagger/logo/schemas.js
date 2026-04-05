module.exports = {
	LogoFile: {
		type: "object",
		required: ["id", "path", "original", "mime"],
		properties: {
			id: {
				type: "string",
				format: "uuid",
				example: "123e4567-e89b-12d3-a456-426614174000",
			},
			path: {
				type: "string",
				example: "/storage/uploads/images/logo-1.png",
			},
			original: {
				type: "string",
				example: "logo.png",
			},
			mime: {
				type: "string",
				example: "image/png",
			},
		},
	},

	Logo: {
		type: "object",
		required: ["id", "logo_name", "file_id", "created_at", "updated_at"],
		properties: {
			id: {
				type: "string",
				format: "uuid",
			},
			logo_name: {
				type: "string",
				maxLength: 255,
				example: "Main Logo",
			},
			description: {
				type: "string",
				nullable: true,
				example: "Logo dùng cho website chính",
			},
			file_id: {
				$ref: "#/components/schemas/LogoFile",
			},
			created_at: {
				type: "string",
				format: "date-time",
			},
			created_by: {
				type: "string",
				format: "uuid",
				nullable: true,
			},
			updated_at: {
				type: "string",
				format: "date-time",
			},
			updated_by: {
				type: "string",
				format: "uuid",
				nullable: true,
			},
		},
	},

	LogoCreate: {
		type: "object",
		required: ["logo_name", "file_id"],
		properties: {
			logo_name: {
				type: "string",
				maxLength: 255,
				example: "Main Logo",
			},
			description: {
				type: "string",
				nullable: true,
				example: "Logo dùng cho website chính",
			},
			file_id: {
				type: "string",
				format: "uuid",
				example: "123e4567-e89b-12d3-a456-426614174000",
			},
		},
	},

	LogoUpdate: {
		type: "object",
		minProperties: 1,
		properties: {
			logo_name: {
				type: "string",
				maxLength: 255,
				example: "Updated Logo",
			},
			description: {
				type: "string",
				nullable: true,
				example: "Logo đã cập nhật",
			},
			file_id: {
				type: "string",
				format: "uuid",
				example: "123e4567-e89b-12d3-a456-426614174000",
			},
		},
	},

	LogoMutate: {
		$ref: "#/components/schemas/LogoCreate",
	},
};