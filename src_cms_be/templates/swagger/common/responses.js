module.exports = {
	BadRequest: {
		description: "Bad Request",
		content: {
			"application/json": {
				schema: {
					type: "object",
					properties: {
						success: {
							type: "boolean",
							example: false,
						},
						error: {
							type: "object",
							properties: {
								code: {
									type: "string",
									example: "VALIDATION_ERROR",
								},
								message: {
									type: "object",
									properties: {
										vi: {
											type: "string",
											example: "Dữ liệu không hợp lệ",
										},
										en: {
											type: "string",
											example: "Invalid data",
										},
									},
								},
							},
						},
						message: {
							type: "string",
							nullable: true,
						},
						message_en: {
							type: "string",
							nullable: true,
						},
						responseData: {
							type: "object",
							nullable: true,
						},
						status: {
							type: "string",
							example: "fail",
						},
						timeStamp: {
							type: "string",
							example: "2025-12-07 10:00:00",
						},
						violation: {
							type: "array",
							items: {
								type: "object",
							},
							nullable: true,
						},
					},
				},
			},
		},
	},
	Unauthorized: {
		description: "Unauthorized",
		content: {
			"application/json": {
				schema: {
					type: "object",
					properties: {
						success: {
							type: "boolean",
							example: false,
						},
						error: {
							type: "object",
							properties: {
								code: {
									type: "string",
									example: "UNAUTHORIZED",
								},
								message: {
									type: "object",
									properties: {
										vi: {
											type: "string",
											example: "Không được phép truy cập",
										},
										en: {
											type: "string",
											example: "Unauthorized access",
										},
									},
								},
							},
						},
						message: {
							type: "string",
							nullable: true,
						},
						message_en: {
							type: "string",
							nullable: true,
						},
						responseData: {
							type: "object",
							nullable: true,
						},
						status: {
							type: "string",
							example: "fail",
						},
						timeStamp: {
							type: "string",
							example: "2025-12-07 10:00:00",
						},
						violation: {
							type: "array",
							items: {
								type: "object",
							},
							nullable: true,
						},
					},
				},
			},
		},
	},
};
