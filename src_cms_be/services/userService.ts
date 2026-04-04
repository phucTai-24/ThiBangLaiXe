import { Op, Transaction } from "sequelize";
import { GenericError } from "#interfaces/error/generic";
import { Role } from "#models/Role";
import { RolePermission } from "#models/RolePermission";
import { Permission } from "#models/Permission";
import { UserRole } from "#models/UserRole";
import { User, UserAttributes } from "#models/User";
import { File } from "#models/File";

export interface UserPlain {
	id: string;
	[key: string]: unknown;
}

export interface FilePlain {
	id: string;
	path?: string | null;
	original?: string | null;
	mime?: string | null;
}

export type UserWithRoles = UserPlain & { roles: string[] };

/**
 * API response:
 * - Keep: roles[], avatar{}
 * - Remove: avatar_id (derived), avatar_url (DB field)
 */
export type UserWithRolesAndAvatar = UserWithRoles & {
	avatar?: FilePlain | null;
};

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const USER_TYPE_VALUES = ["member", "businessman", "subscriber"] as const;
type UserType = (typeof USER_TYPE_VALUES)[number];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const hasOwn = (obj: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isUuidV4 = (v: string): boolean => UUID_V4_REGEX.test(v);

const uniqueStrings = (items: Array<string | null | undefined>): string[] => {
	const cleaned = items.filter(isNonEmptyString).map((s) => s.trim());
	return Array.from(new Set(cleaned));
};

/**
 * IMPORTANT: strip avatar_url (DB) and avatar_id (legacy derived field)
 */
const toUserResponse = <T extends Record<string, unknown>>(u: T): Omit<T, "avatar_url" | "avatar_id"> => {
	// In case upstream already has avatar_id, strip it too
	const { avatar_url: _avatarUrl, avatar_id: _avatarId, ...rest } = u as any;
	return rest as Omit<T, "avatar_url" | "avatar_id">;
};

const toPlainUser = (u: unknown): UserPlain => {
	const plain: unknown =
		u && typeof u === "object" && u !== null && "toJSON" in u && typeof (u as { toJSON?: unknown }).toJSON === "function"
			? (u as { toJSON: () => unknown }).toJSON()
			: u;

	if (!plain || typeof plain !== "object" || plain === null) {
		throw new GenericError({ vi: "Dữ liệu user không hợp lệ", en: "Invalid user data" }, "INTERNAL_SERVER_ERROR", 500);
	}

	const id = (plain as { id?: unknown }).id;
	if (!isNonEmptyString(id)) {
		throw new GenericError({ vi: "Thiếu user id", en: "Missing user id" }, "INTERNAL_SERVER_ERROR", 500);
	}

	return plain as UserPlain;
};

const toPlainFile = (f: unknown): FilePlain => {
	const plain: unknown =
		f && typeof f === "object" && f !== null && "toJSON" in f && typeof (f as { toJSON?: unknown }).toJSON === "function"
			? (f as { toJSON: () => unknown }).toJSON()
			: f;

	if (!plain || typeof plain !== "object" || plain === null) {
		throw new GenericError({ vi: "Dữ liệu file không hợp lệ", en: "Invalid file data" }, "INTERNAL_SERVER_ERROR", 500);
	}

	const id = (plain as { id?: unknown }).id;
	if (!isNonEmptyString(id)) {
		throw new GenericError({ vi: "Thiếu file id", en: "Missing file id" }, "INTERNAL_SERVER_ERROR", 500);
	}

	return plain as FilePlain;
};

const normalizeOptionalText = (v: unknown): string | null => {
	if (v === null) return null;
	if (typeof v !== "string") {
		throw new GenericError({ vi: "Dữ liệu không hợp lệ", en: "Invalid data" }, "BAD_REQUEST", 400);
	}
	const trimmed = v.trim();
	return trimmed.length ? trimmed : null;
};

const normalizeOptionalStringField = (body: Record<string, unknown>, key: string): string | null | undefined => {
	if (!hasOwn(body, key)) return undefined;
	const raw = body[key];

	if (raw === undefined) return undefined;
	if (raw === null) return null;

	if (typeof raw === "string") return normalizeOptionalText(raw);

	throw new GenericError({ vi: `Trường ${key} không hợp lệ`, en: `Invalid ${key}` }, "BAD_REQUEST", 400);
};

const normalizeOptionalGender = (
	body: Record<string, unknown>,
	key: "gender",
): UserAttributes["gender"] | null | undefined => {
	if (!hasOwn(body, key)) return undefined;
	const raw = body[key];

	if (raw === undefined) return undefined;
	if (raw === null) return null;

	if (typeof raw !== "string") {
		throw new GenericError({ vi: "Giới tính không hợp lệ", en: "Invalid gender" }, "BAD_REQUEST", 400);
	}

	const v = raw.trim();
	if (!v.length) return null;
	if (v === "male" || v === "female" || v === "other") return v;

	throw new GenericError({ vi: "Giới tính không hợp lệ", en: "Invalid gender" }, "BAD_REQUEST", 400);
};

const isUserType = (value: string): value is UserType =>
	USER_TYPE_VALUES.includes(value as UserType);

const normalizeOptionalUserType = (body: Record<string, unknown>, key: "type"): UserAttributes["type"] | undefined => {
	if (!hasOwn(body, key)) return undefined;

	const raw = body[key];
	if (raw === undefined) return undefined;

	if (raw === null || typeof raw !== "string") {
		throw new GenericError({ vi: "type không hợp lệ", en: "Invalid type" }, "BAD_REQUEST", 400);
	}

	const value = raw.trim();
	if (!value.length) {
		throw new GenericError({ vi: "type không hợp lệ", en: "Invalid type" }, "BAD_REQUEST", 400);
	}

	if (!isUserType(value)) {
		throw new GenericError(
			{
				vi: 'type phải là "member", "businessman" hoặc "subscriber"',
				en: 'type must be "member", "businessman" or "subscriber"',
			},
			"BAD_REQUEST",
			400,
			{ field: "type", value },
		);
	}

	return value;
};

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const daysInMonth = (y: number, m: number): number => {
	if (m === 2) return isLeapYear(y) ? 29 : 28;
	if ([4, 6, 9, 11].includes(m)) return 30;
	return 31;
};

const parseDateOnlyOrThrow = (raw: string): string => {
	const v = raw.trim();
	const datePart = v.includes("T") ? v.slice(0, 10) : v;

	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
	if (!m) throw new GenericError({ vi: "Ngày sinh không hợp lệ", en: "Invalid birth_date" }, "BAD_REQUEST", 400);

	const yy = Number(m[1]);
	const mm = Number(m[2]);
	const dd = Number(m[3]);

	if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) {
		throw new GenericError({ vi: "Ngày sinh không hợp lệ", en: "Invalid birth_date" }, "BAD_REQUEST", 400);
	}

	if (mm < 1 || mm > 12)
		throw new GenericError({ vi: "Ngày sinh không hợp lệ", en: "Invalid birth_date" }, "BAD_REQUEST", 400);

	const maxD = daysInMonth(yy, mm);
	if (dd < 1 || dd > maxD)
		throw new GenericError({ vi: "Ngày sinh không hợp lệ", en: "Invalid birth_date" }, "BAD_REQUEST", 400);

	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
		today.getDate(),
	).padStart(2, "0")}`;

	if (datePart > todayStr)
		throw new GenericError({ vi: "Ngày sinh không hợp lệ", en: "Invalid birth_date" }, "BAD_REQUEST", 400);

	return datePart;
};

const normalizeOptionalBirthDate = (body: Record<string, unknown>, key: "birth_date"): string | null | undefined => {
	if (!hasOwn(body, key)) return undefined;
	const raw = body[key];

	if (raw === undefined) return undefined;
	if (raw === null) return null;

	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed.length) return null;
		return parseDateOnlyOrThrow(trimmed);
	}

	throw new GenericError({ vi: "Ngày sinh không hợp lệ", en: "Invalid birth_date" }, "BAD_REQUEST", 400);
};

const assertAvatarFileExists = async (fileId: string): Promise<void> => {
	const found = await File.findByPk(fileId, { attributes: ["id"] });
	if (!found) {
		throw new GenericError(
			{ vi: "Avatar không tồn tại (fileId không hợp lệ)", en: "Avatar not found (invalid fileId)" },
			"BAD_REQUEST",
			400,
		);
	}
};

const normalizeOptionalAvatar = async (body: Record<string, unknown>): Promise<string | null | undefined> => {
	const hasAvatarId = hasOwn(body, "avatar_id");
	const hasAvatarUrl = hasOwn(body, "avatar_url");

	if (!hasAvatarId && !hasAvatarUrl) return undefined;

	const raw = hasAvatarId ? body["avatar_id"] : body["avatar_url"];

	if (raw === undefined) return undefined;
	if (raw === null) return null;

	if (typeof raw !== "string") {
		throw new GenericError({ vi: "avatar_id không hợp lệ", en: "Invalid avatar_id" }, "BAD_REQUEST", 400);
	}

	const v = raw.trim();
	if (!v.length) return null;

	if (isUuidV4(v)) {
		await assertAvatarFileExists(v);
		return v;
	}

	try {
		// eslint-disable-next-line no-new
		new URL(v);
		return v;
	} catch {
		throw new GenericError(
			{
				vi: "avatar_id phải là UUID (fileId)",
				en: "avatar_id must be a valid UUID (fileId)",
			},
			"BAD_REQUEST",
			400,
		);
	}
};

export const fetchRolesForUsers = async (
	userIds: string[],
	transaction?: Transaction | null,
): Promise<Map<string, string[]>> => {
	const ids = uniqueStrings(userIds);
	const result = new Map<string, string[]>();
	if (!ids.length) return result;

	ids.forEach((id) => result.set(id, []));

	const links = await UserRole.findAll({
		where: { user_id: { [Op.in]: ids } },
		attributes: ["user_id", "role_id", "is_primary", "assigned_at"],
		order: [
			["is_primary", "DESC"],
			["assigned_at", "ASC"],
		],
		transaction: transaction || null,
	});

	const roleIds = uniqueStrings(links.map((l) => l.role_id));
	if (!roleIds.length) return result;

	const roles = await Role.findAll({
		where: { id: { [Op.in]: roleIds } },
		attributes: ["id", "name"],
		transaction: transaction || null,
	});

	const roleNameById = new Map<string, string>();
	for (const r of roles) {
		if (isNonEmptyString(r.name)) roleNameById.set(r.id, r.name.trim());
	}

	for (const link of links) {
		const uid = link.user_id;
		const rid = link.role_id;
		if (!isNonEmptyString(uid) || !isNonEmptyString(rid)) continue;

		const roleName = roleNameById.get(rid);
		if (!roleName) continue;

		const arr = result.get(uid) || [];
		arr.push(roleName);
		result.set(uid, arr);
	}

	for (const [uid, arr] of result.entries()) {
		result.set(uid, uniqueStrings(arr));
	}

	return result;
};

const fetchAvatarsForUsers = async (users: UserPlain[]): Promise<Map<string, FilePlain>> => {
	const avatarIds = uniqueStrings(
		users
			.map((u) => (typeof u.avatar_url === "string" ? u.avatar_url : null))
			.filter((v): v is string => typeof v === "string" && isUuidV4(v)),
	);

	const map = new Map<string, FilePlain>();
	if (!avatarIds.length) return map;

	const files = await File.findAll({
		where: { id: { [Op.in]: avatarIds } },
		attributes: ["id", "path", "original", "mime"],
	});

	for (const f of files) {
		const plain = toPlainFile(f);
		map.set(plain.id, plain);
	}

	return map;
};

export const attachRolesForUsers = async <T extends UserPlain>(
	users: T[],
	transaction?: Transaction | null,
): Promise<Array<T & { roles: string[] }>> => {
	const ids = uniqueStrings(users.map((u) => u.id));
	const roleMap = await fetchRolesForUsers(ids, transaction);

	return users.map((u) => ({
		...u,
		roles: roleMap.get(u.id) || [],
	}));
};

export const attachRolesForUser = async <T extends UserPlain>(
	user: T,
	transaction?: Transaction | null,
): Promise<T & { roles: string[] }> => {
	const items = await attachRolesForUsers([user], transaction);
	return items[0] ?? { ...user, roles: [] };
};

export const attachAvatarForUsers = async <T extends UserPlain>(
	users: T[],
): Promise<Array<T & { avatar?: FilePlain | null }>> => {
	const avatarMap = await fetchAvatarsForUsers(users);

	return users.map((u) => {
		const avatarId = typeof u.avatar_url === "string" ? u.avatar_url : null;
		const avatar = avatarId && isUuidV4(avatarId) ? avatarMap.get(avatarId) || null : null;
		return { ...u, avatar };
	});
};

export const attachAvatarForUser = async <T extends UserPlain>(user: T): Promise<T & { avatar?: FilePlain | null }> => {
	const items = await attachAvatarForUsers([user]);
	return items[0] ?? { ...user, avatar: null };
};

export const buildUserWithRoles = async (
	user: unknown,
	transaction?: Transaction | null,
): Promise<UserWithRolesAndAvatar> => {
	const plain = toPlainUser(user);
	const withRoles = await attachRolesForUser(plain, transaction);
	const withAvatar = await attachAvatarForUser(withRoles);

	// Strip avatar_url/avatar_id for API output
	return toUserResponse(withAvatar) as unknown as UserWithRolesAndAvatar;
};

export const buildUsersWithRoles = async (
	users: unknown[],
	transaction?: Transaction | null,
): Promise<UserWithRolesAndAvatar[]> => {
	const plainUsers = users.map(toPlainUser);
	const withRoles = await attachRolesForUsers(plainUsers, transaction);
	const withAvatar = await attachAvatarForUsers(withRoles);

	return withAvatar.map((u) => toUserResponse(u) as unknown as UserWithRolesAndAvatar);
};

export interface BuildUserProfilePatchParams {
	body: unknown;
	mode: "create" | "update";
	actorId: string | null;
}

export const buildUserProfilePatch = async (params: BuildUserProfilePatchParams): Promise<Partial<UserAttributes>> => {
	const body = isRecord(params.body) ? params.body : {};

	const patch: Partial<UserAttributes> = {
		updated_at: new Date(),
		updated_by: params.actorId,
	};

	if (params.mode === "create") {
		patch.status = "active";
	}

	if (params.mode === "update") {
		const username = normalizeOptionalStringField(body, "username");
		if (username !== undefined) patch.username = username;
	}

	const firstName = normalizeOptionalStringField(body, "first_name");
	if (firstName !== undefined) patch.first_name = firstName;

	const lastName = normalizeOptionalStringField(body, "last_name");
	if (lastName !== undefined) patch.last_name = lastName;

	const phone = normalizeOptionalStringField(body, "phone");
	if (phone !== undefined) patch.phone = phone;

	// Input still supports avatar_id (uuid) or URL, but we store to avatar_url in DB
	const avatar = await normalizeOptionalAvatar(body);
	if (avatar !== undefined) patch.avatar_url = avatar;

	const birthDate = normalizeOptionalBirthDate(body, "birth_date");
	if (birthDate !== undefined) patch.birth_date = birthDate;

	const hometown = normalizeOptionalStringField(body, "hometown");
	if (hometown !== undefined) patch.hometown = hometown;

	const gender = normalizeOptionalGender(body, "gender");
	if (gender !== undefined) patch.gender = gender;

	const bio = normalizeOptionalStringField(body, "bio");
	if (bio !== undefined) patch.bio = bio;

	// NEW: type enum
	const userType = normalizeOptionalUserType(body, "type");
	if (userType !== undefined) patch.type = userType;

	return patch;
};

export const finalizeCreatedUserProfile = async (args: {
	id: string;
	actorId: string | null;
	patch?: Partial<UserAttributes>;
}): Promise<UserWithRolesAndAvatar> => {
	const patch = args.patch ?? {
		updated_at: new Date(),
		updated_by: args.actorId,
		status: "active",
	};

	await User.update(patch, { where: { id: args.id } });

	const fresh = await User.findByPk(args.id);
	if (!fresh) {
		throw new GenericError({ vi: "User không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
	}

	return buildUserWithRoles(fresh);
};

export const updateUserProfileById = async (args: {
	id: string;
	body: unknown;
	actorId: string | null;
}): Promise<UserWithRolesAndAvatar> => {
	const patch = await buildUserProfilePatch({ body: args.body, mode: "update", actorId: args.actorId });

	const [affected] = await User.update(patch, { where: { id: args.id } });
	if (!affected) {
		throw new GenericError({ vi: "User không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
	}

	const fresh = await User.findByPk(args.id);
	if (!fresh) {
		throw new GenericError({ vi: "User không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
	}

	return buildUserWithRoles(fresh);
};

/**
 * Get user with roles and permissions for /auth/me endpoint
 */
export const getUserWithRolesAndPermissions = async (userId: string) => {
	const user = await User.findByPk(userId, {
		attributes: [
			"id",
			"email",
			"username",
			"first_name",
			"last_name",
			"status",
			"created_at",
			"updated_at",
		],
		include: [
			{
				model: UserRole,
				as: "user_user_roles",
				attributes: ["id", "role_id"],
				include: [
					{
						model: Role,
						as: "role",
						attributes: ["id", "name", "description"],
						include: [
							{
								model: RolePermission,
								as: "role_permissions",
								attributes: ["id", "permission_id"],
								include: [
									{
										model: Permission,
										as: "permission",
										attributes: ["id", "name", "description", "resource", "action"],
									},
								],
							},
						],
					},
				],
			},
		],
	});

	if (!user) {
		throw new GenericError(
			{ vi: "Không tìm thấy user", en: "User not found" },
			"NOT_FOUND",
			404,
		);
	}

	// Format response data
	const userData = user.toJSON() as any;

	// Extract roles (array of role names)
	const roles =
		userData.user_user_roles?.map((ur: any) => ur.role?.name).filter(Boolean) || [];

	// Collect all unique permissions from all roles (array of permission names)
	const permissionsSet = new Set<string>();
	userData.user_user_roles?.forEach((ur: any) => {
		ur.role?.role_permissions?.forEach((rp: any) => {
			const perm = rp.permission;
			if (perm?.name) {
				permissionsSet.add(perm.name);
			}
		});
	});

	const permissions = Array.from(permissionsSet);

	// Clean response
	delete userData.user_user_roles;

	return {
		...userData,
		roles,
		permissions,
	};
};
