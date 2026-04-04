module.exports = {
	LoginRequest: {
		type: "object",
		required: ["email", "password"],
		properties: {
			email: {
				type: "string",
				format: "email",
				example: "user@example.com",
			},
			password: {
				type: "string",
				example: "password123",
			},
			device_info: {
				type: "object",
				description: "Device information for session tracking",
			},
			ip_address: {
				type: "string",
				description: "IP address for security logging",
			},
			user_agent: {
				type: "string",
				description: "User agent string",
			},
		},
	},
	LoginResponse: {
		type: "object",
		properties: {
			access_token: {
				type: "string",
				description: "JWT access token",
			},
			refresh_token: {
				type: "string",
				description: "JWT refresh token",
			},
			expires_in: {
				type: "number",
				description: "Access token expiration time in seconds",
			},
			refresh_expires_in: {
				type: "number",
				description: "Refresh token expiration time in seconds",
			},
			token_type: {
				type: "string",
				example: "Bearer",
			},
		},
		required: ["access_token", "refresh_token", "expires_in", "refresh_expires_in", "token_type"],
	},
	ForgotPasswordSendOtpRequest: {
		type: "object",
		required: ["email"],
		properties: {
			email: { type: "string", format: "email", example: "user@example.com" },
		},
		example: { email: "user@example.com" },
	},

	ForgotPasswordVerifyOtpRequest: {
		type: "object",
		required: ["email", "otp"],
		properties: {
			email: { type: "string", format: "email", example: "user@example.com" },
			otp: { type: "string", example: "123456", description: "6-digit OTP" },
		},
		example: { email: "user@example.com", otp: "123456" },
	},

	ForgotPasswordVerifyOtpResponse: {
		type: "object",
		properties: {
			reset_token: { type: "string", example: "eyJ..." },
			expires_in: { type: "integer", example: 900 },
		},
	},

	ForgotPasswordResetRequest: {
		type: "object",
		required: ["reset_token", "new_password"],
		properties: {
			reset_token: { type: "string", example: "eyJ..." },
			new_password: { type: "string", minLength: 6, example: "newpassword123" },
		},
		example: { reset_token: "eyJ...", new_password: "newpassword123" },
	},

	UserMeResponse: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
			},
			email: {
				type: "string",
			},
			username: {
				type: "string",
			},
			first_name: {
				type: "string",
				nullable: true,
			},
			last_name: {
				type: "string",
				nullable: true,
			},
			status: {
				type: "string",
			},
			created_at: {
				type: "string",
				format: "date-time",
			},
			updated_at: {
				type: "string",
				format: "date-time",
			},
			roles: {
				type: "array",
				items: {
					type: "string",
				},
				example: ["admin", "editor"],
			},
			permissions: {
				type: "array",
				items: {
					type: "string",
				},
				example: ["users:read", "posts:write", "ui-management:view"],
			},
		},
	},
};
