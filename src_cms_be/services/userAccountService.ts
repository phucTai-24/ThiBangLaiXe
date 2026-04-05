import { GenericError } from "#interfaces/error/generic";
import { AuthService } from "#middlewares/auth";
import { buildUserProfilePatch, finalizeCreatedUserProfile, type UserWithRolesAndAvatar } from "#services/userService";

type PlainRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is PlainRecord => typeof v === "object" && v !== null && !Array.isArray(v);

const getCreatedId = (created: unknown): string | null => {
	if (!created || typeof created !== "object") return null;
	if (!("id" in created)) return null;
	const id = (created as { id?: unknown }).id;
	return typeof id === "string" && id.trim().length ? id : null;
};

type RegisterInput = Parameters<typeof AuthService.register>[0];

const toRegisterInput = (body: PlainRecord): RegisterInput => {
	const rawEmail = body.email;
	const rawPassword = body.password;

	if (typeof rawEmail !== "string" || !rawEmail.trim()) {
		throw new GenericError({ vi: "Email là bắt buộc", en: "Email is required" }, "VALIDATION_ERROR", 400);
	}
	if (typeof rawPassword !== "string" || rawPassword.length < 6) {
		throw new GenericError({ vi: "Mật khẩu không hợp lệ", en: "Invalid password" }, "VALIDATION_ERROR", 400);
	}

	const input: RegisterInput = {
		email: rawEmail.trim().toLowerCase(),
		password: rawPassword,
	};

	const username = body.username;
	if (typeof username === "string" && username.trim().length) input.username = username.trim();

	const firstName = body.first_name;
	if (typeof firstName === "string" && firstName.trim().length) input.first_name = firstName.trim();

	const lastName = body.last_name;
	if (typeof lastName === "string" && lastName.trim().length) input.last_name = lastName.trim();

	const phone = body.phone;
	if (typeof phone === "string" && phone.trim().length) input.phone = phone.trim();

	return input;
};

export const userAccountService = {
	async createUser(body: unknown, actorId: string | null): Promise<UserWithRolesAndAvatar> {
		if (!isRecord(body)) {
			throw new GenericError({ vi: "Dữ liệu đầu vào không hợp lệ", en: "Invalid input data" }, "VALIDATION_ERROR", 400);
		}

		// Pre-build patch:
		// - birth_date validate (<= today)
		// - gender/type normalize
		// - avatar_id validate (uuid or url)
		const prePatch = await buildUserProfilePatch({ body, mode: "create", actorId });

		// Only pass register fields to AuthService.register
		const registerInput = toRegisterInput(body);
		const created = await AuthService.register(registerInput);

		const createdId = getCreatedId(created);
		if (!createdId) {
			throw new GenericError({ vi: "Tạo user thất bại", en: "Create user failed" }, "BAD_REQUEST", 400);
		}

		return await finalizeCreatedUserProfile({ id: createdId, actorId, patch: prePatch });
	},
};