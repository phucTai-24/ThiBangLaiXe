module.exports = {
	UserCreate: {
		type: "object",
		required: ["email", "password", "username"],
		properties: {
			email: { type: "string", format: "email", example: "user@example.com" },
			password: { type: "string", minLength: 6, example: "password123" },
			username: { type: "string", example: "johndoe" },
			first_name: { type: "string", example: "John" },
			last_name: { type: "string", example: "Doe" },
			phone: { type: "string", example: "0999999999" },

			// fileId (uuid) recommended, legacy URL supported
			avatar_id: {
				type: "string",
				example: "file_id",
			},

			type: { type: "string", enum: ["member", "businessman", "subscriber"], example: "businessman" },

			// DATEONLY
			birth_date: { type: "string", format: "date", example: "YYYY-MM-DD" },

			hometown: { type: "string", nullable: true },
			gender: { type: "string", enum: ["male", "female", "other"]},
			bio: { type: "string", nullable: true },
		},
	},

	UserUpdate: {
		type: "object",
		properties: {
			username: { type: "string", example: "johndoe" },
			first_name: { type: "string", example: "John" },
			last_name: { type: "string", example: "Doe" },
			phone: { type: "string", example: "0999999999" },
			avatar_id: {
				type: "string",
				example: "file_id",
			},
			type: { type: "string", enum: ["member", "businessman", "subscriber"], example: "businessman" },
			birth_date: { type: "string", format: "date", example: "YYYY-MM-DD" },
			hometown: { type: "string", nullable: true },
			gender: { type: "string", enum: ["male", "female", "other"]},
			bio: { type: "string", nullable: true },
		},
		allOf: [{ $ref: "#/components/schemas/UserMutate" }]
	},

	UserChangePassword: {
		type: "object",
		required: ["oldPassword", "newPassword"],
		properties: {
			oldPassword: { type: "string", example: "old_password" },
			newPassword: { type: "string", minLength: 6, example: "new_password_123" },
		},
	},
};
