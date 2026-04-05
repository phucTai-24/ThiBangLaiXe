module.exports = {
	SiteInformationSocialLink: {
		type: "object",
		required: ["platform", "label", "url", "icon_key", "is_active"],
		properties: {
			platform: {
				type: "string",
				example: "facebook",
				description: "Social platform key (lowercase recommended)",
			},
			label: {
				type: "string",
				example: "Facebook",
				description: "Display label for the social platform",
			},
			url: {
				type: "string",
				example: "https://facebook.com/",
				description: "Public URL to the social page",
			},
			icon_key: {
				type: "string",
				example: "facebook",
				description: "Icon key used by FE to render correct icon",
			},
			is_active: {
				type: "boolean",
				example: true,
				description: "Whether this social link is active",
			},
		},
	},

	SiteInformationData: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			code: { type: "string", example: "default" },

			telephone: { type: "string", nullable: true, example: "0901234567" },
			email: { type: "string", nullable: true, example: "contact@example.com" },
			address: { type: "string", nullable: true, example: "123 Đường ABC, TP.HCM" },
			working_hours: { type: "string", nullable: true, example: "Thứ 2 - Thứ 6: 08:00 - 17:30" },

			link_socials: {
				type: "array",
				default: [],
				items: { $ref: "#/components/schemas/SiteInformationSocialLink" },
			},

			created_at: { type: "string", format: "date-time" },
			created_by: { type: "string", format: "uuid", nullable: true },
			updated_at: { type: "string", format: "date-time" },
			updated_by: { type: "string", format: "uuid", nullable: true },
		},
	},

	SiteInformationUpdateBody: {
		type: "object",
		minProperties: 1,
		properties: {
			telephone: { type: "string", nullable: true, example: "0901234567" },
			email: { type: "string", nullable: true, example: "contact@example.com" },
			address: { type: "string", nullable: true, example: "123 Đường ABC, TP.HCM" },
			working_hours: { type: "string", nullable: true, example: "Thứ 2 - Thứ 6: 08:00 - 17:30" },
			link_socials: {
				type: "array",
				items: { $ref: "#/components/schemas/SiteInformationSocialLink" },
			},
		},
	},

	SiteInformationResponse: {
		allOf: [
			{ $ref: "#/components/schemas/ApiResponse" },
			{
				type: "object",
				properties: {
					responseData: { $ref: "#/components/schemas/SiteInformationData" },
				},
			},
		],
	},
};