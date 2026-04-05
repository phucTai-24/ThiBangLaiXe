module.exports = {
	Response: {
		type: "object",
		properties: {
			message: {
				type: "string",
			},
			message_en: {
				type: "string",
			},
			responseData: {
				type: "object",
			},
			status: {
				type: "string",
				example: "success | fail",
			},
			timeStamp: {
				type: "string",
				example: "2024-02-26 03:12:45",
			},
			violation: {
				type: "array",
				items: {
					type: "object",
				},
			},
		},
	},
	responseGetAllData: {
		allOf: [
			{ $ref: "#/components/schemas/Response" },
			{
				type: "object",
				properties: {
					responseData: {
						type: "object",
						properties: {
							count: {
								type: "number",
							},
							page: {
								type: "number",
							},
							pageSize: {
								type: "number",
							},
							rows: {
								type: "array",
								items: {
									type: "object",
								},
							},
						},
					},
				},
			},
		],
	},
};
