import {
	Op,
	type FindAndCountOptions,
	type FindOptions,
	type Includeable,
	type Order,
	type Transaction,
	type WhereOptions,
} from "sequelize";

import { GenericError } from "#interfaces/error/generic";
import { Role, type RoleAttributes } from "#models/Role";
import { User, type UserAttributes } from "#models/User";
import { UserRole, type UserRoleAttributes } from "#models/UserRole";

const MANAGE_USER_ROLE_NAMES = new Set(["system_admin"]);
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const ALLOWED_SORT_FIELDS = new Set<keyof UserRoleAttributes>([
	"assigned_at",
	"updated_at",
	"is_primary",
	"user_id",
	"role_id",
]);

export interface UserRoleCreateDto {
	user_id: string;
	role_id: string;
	is_primary?: boolean | null;
}

export interface UserRoleUpdateDto {
	role_id?: string;
	is_primary?: boolean | null;
}

interface ListPayload {
	page?: unknown;
	pageSize?: unknown;
	sortField?: unknown;
	sortOrder?: unknown;
	filters?: unknown;
}

interface UserSummary
	extends Pick<UserAttributes, "id" | "email" | "username" | "first_name" | "last_name" | "status" | "type"> {}

interface RoleSummary extends Pick<RoleAttributes, "id" | "name" | "description"> {}

interface UserRolePlain extends UserRoleAttributes {
	user?: UserSummary | null;
	role?: RoleSummary | null;
	assigned_by_user?: UserSummary | null;
}

export interface UserRoleResponse {
	id: string;
	user_id: string;
	role_id: string;
	assigned_at?: Date | null;
	assigned_by?: string | null;
	is_primary?: boolean | null;
	updated_at?: Date | null;
	user: UserSummary | null;
	role: RoleSummary | null;
	assigned_by_user: UserSummary | null;
}

export interface UserRoleListResponse {
	rows: UserRoleResponse[];
	count: number;
	page: number;
	pageSize: number;
}

const is_record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const is_non_empty_string = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const normalize_positive_integer = (value: unknown, fallback: number): number => {
	const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return Math.floor(parsed);
};

const normalize_sort_field = (value: unknown): keyof UserRoleAttributes => {
	if (typeof value !== "string") {
		return "assigned_at";
	}

	const field = value.trim() as keyof UserRoleAttributes;
	return ALLOWED_SORT_FIELDS.has(field) ? field : "assigned_at";
};

const normalize_sort_order = (value: unknown): "ASC" | "DESC" => {
	if (typeof value !== "string") {
		return "DESC";
	}

	return value.trim().toUpperCase() === "ASC" ? "ASC" : "DESC";
};

const build_order = (sort_field: unknown, sort_order: unknown): Order => {
	return [[normalize_sort_field(sort_field), normalize_sort_order(sort_order)]];
};

const get_user_role_include = (): Includeable[] => [
	{
		model: User,
		as: "user",
		attributes: ["id", "email", "username", "first_name", "last_name", "status", "type"],
		required: false,
	},
	{
		model: Role,
		as: "role",
		attributes: ["id", "name", "description"],
		required: false,
	},
	{
		model: User,
		as: "assigned_by_user",
		attributes: ["id", "email", "username", "first_name", "last_name", "status", "type"],
		required: false,
	},
];

const to_plain_user_role = (record: UserRole): UserRolePlain => record.toJSON() as UserRolePlain;

const map_user_role_response = (record: UserRole): UserRoleResponse => {
	const plain = to_plain_user_role(record);

	return {
		id: plain.id,
		user_id: plain.user_id,
		role_id: plain.role_id,
		assigned_at: plain.assigned_at ?? null,
		assigned_by: plain.assigned_by ?? null,
		is_primary: plain.is_primary ?? false,
		updated_at: plain.updated_at ?? null,
		user: plain.user ?? null,
		role: plain.role ?? null,
		assigned_by_user: plain.assigned_by_user ?? null,
	};
};

const get_sequelize_or_throw = () => {
	if (!UserRole.sequelize) {
		throw new GenericError(
			{ vi: "Không thể khởi tạo transaction", en: "Unable to initialize transaction" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return UserRole.sequelize;
};

const run_in_transaction = async <T>(
	transaction: Transaction | undefined,
	callback: (trx: Transaction) => Promise<T>,
): Promise<T> => {
	if (transaction) {
		return callback(transaction);
	}

	const sequelize = get_sequelize_or_throw();
	const trx = await sequelize.transaction();

	try {
		const result = await callback(trx);
		await trx.commit();

		return result;
	} catch (error) {
		await trx.rollback();
		throw error;
	}
};

function ensure_authenticated_actor(actor_id: string | null): asserts actor_id is string {
	if (!actor_id) {
		throw new GenericError({ vi: "Bạn chưa đăng nhập", en: "Unauthorized" }, "UNAUTHORIZED", 401);
	}
}

const get_actor_role_names = async (actor_id: string, transaction?: Transaction): Promise<string[]> => {
	const rows = await UserRole.findAll({
		where: { user_id: actor_id },
		include: [
			{
				model: Role,
				as: "role",
				attributes: ["name"],
				required: false,
			},
		],
		transaction: transaction || null,
	});

	return Array.from(
		new Set(
			rows
				.map((row) => to_plain_user_role(row).role?.name ?? null)
				.filter((role_name): role_name is string => is_non_empty_string(role_name)),
		),
	);
};

const assert_can_manage_user_role = async (actor_id: string | null, transaction?: Transaction): Promise<void> => {
	ensure_authenticated_actor(actor_id);

	const role_names = await get_actor_role_names(actor_id, transaction);

	if (!role_names.some((role_name) => MANAGE_USER_ROLE_NAMES.has(role_name))) {
		throw new GenericError(
			{
				vi: "Bạn không có quyền quản lý phân quyền người dùng",
				en: "You do not have permission to manage user role assignments",
			},
			"FORBIDDEN",
			403,
		);
	}
};

const ensure_user_exists = async (user_id: string, transaction?: Transaction): Promise<void> => {
	const user = await User.findOne({
		where: {
			id: user_id,
			deleted_at: null,
		},
		attributes: ["id"],
		transaction: transaction || null,
	});

	if (!user) {
		throw new GenericError({ vi: "Người dùng không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
	}
};

const ensure_role_exists = async (role_id: string, transaction?: Transaction): Promise<void> => {
	const role = await Role.findByPk(role_id, {
		attributes: ["id"],
		transaction: transaction || null,
	});

	if (!role) {
		throw new GenericError({ vi: "Vai trò không tồn tại", en: "Role not found" }, "NOT_FOUND", 404);
	}
};

const ensure_unique_user_role = async (
	user_id: string,
	role_id: string,
	exclude_id?: string,
	transaction?: Transaction,
): Promise<void> => {
	const where: WhereOptions<UserRoleAttributes> = {
		user_id,
		role_id,
	};

	if (exclude_id) {
		where.id = { [Op.ne]: exclude_id };
	}

	const existing = await UserRole.findOne({
		where,
		attributes: ["id"],
		transaction: transaction || null,
	});

	if (existing) {
		throw new GenericError(
			{
				vi: "Người dùng đã được gán vai trò này",
				en: "This role is already assigned to the user",
			},
			"CONFLICT",
			409,
		);
	}
};

const has_primary_role = async (user_id: string, transaction?: Transaction): Promise<boolean> => {
	const primary = await UserRole.findOne({
		where: {
			user_id,
			is_primary: true,
		},
		attributes: ["id"],
		transaction: transaction || null,
	});

	return Boolean(primary);
};

const get_first_remaining_user_role = async (
	user_id: string,
	exclude_id?: string,
	transaction?: Transaction,
): Promise<UserRole | null> => {
	const where: WhereOptions<UserRoleAttributes> = { user_id };

	if (exclude_id) {
		where.id = { [Op.ne]: exclude_id };
	}

	return UserRole.findOne({
		where,
		order: [["assigned_at", "ASC"]],
		transaction: transaction || null,
	});
};

const set_primary_role = async (user_id: string, user_role_id: string, transaction: Transaction): Promise<void> => {
	const now = new Date();

	await UserRole.update(
		{
			is_primary: false,
			updated_at: now,
		},
		{
			where: {
				user_id,
				id: {
					[Op.ne]: user_role_id,
				},
			},
			transaction,
		},
	);

	await UserRole.update(
		{
			is_primary: true,
			updated_at: now,
		},
		{
			where: {
				id: user_role_id,
			},
			transaction,
		},
	);
};

const ensure_primary_after_delete = async (user_id: string, transaction: Transaction): Promise<void> => {
	const current_primary = await UserRole.findOne({
		where: {
			user_id,
			is_primary: true,
		},
		attributes: ["id"],
		transaction,
	});

	if (current_primary) {
		return;
	}

	const fallback = await get_first_remaining_user_role(user_id, undefined, transaction);

	if (!fallback) {
		return;
	}

	await set_primary_role(user_id, fallback.id, transaction);
};

const get_user_role_by_id_or_throw = async (
	id: string,
	transaction?: Transaction,
	include_relations = true,
): Promise<UserRole> => {
	const options: Omit<FindOptions<UserRoleAttributes>, "where"> = {
		transaction: transaction || null,
	};

	if (include_relations) {
		options.include = get_user_role_include();
	}

	const record = await UserRole.findByPk(id, options);

	if (!record) {
		throw new GenericError(
			{ vi: "Phân quyền người dùng không tồn tại", en: "User role assignment not found" },
			"NOT_FOUND",
			404,
		);
	}

	return record;
};

export const userRoleService = {
	async getAll(payload: unknown, actor_id: string | null): Promise<UserRoleListResponse> {
		await assert_can_manage_user_role(actor_id);

		const p = (payload ?? {}) as ListPayload;

		const page = normalize_positive_integer(p.page, DEFAULT_PAGE);
		const page_size = Math.min(normalize_positive_integer(p.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

		const options: Omit<FindAndCountOptions<UserRoleAttributes>, "group"> = {
			include: get_user_role_include(),
			order: build_order(p.sortField, p.sortOrder),
			offset: (page - 1) * page_size,
			limit: page_size,
			distinct: true,
		};

		if (is_record(p.filters)) {
			options.where = p.filters as WhereOptions<UserRoleAttributes>;
		}

		const result = await UserRole.findAndCountAll(options);

		return {
			rows: result.rows.map(map_user_role_response),
			count: result.count,
			page,
			pageSize: page_size,
		};
	},

	async getById(id: string, actor_id: string | null, transaction?: Transaction): Promise<UserRoleResponse> {
		await assert_can_manage_user_role(actor_id, transaction);

		const record = await get_user_role_by_id_or_throw(id, transaction, true);
		return map_user_role_response(record);
	},

	async create(
		data: UserRoleCreateDto,
		actor_id: string | null,
		transaction?: Transaction,
	): Promise<UserRoleResponse> {
		await assert_can_manage_user_role(actor_id, transaction);

		return run_in_transaction(transaction, async (trx) => {
			await ensure_user_exists(data.user_id, trx);
			await ensure_role_exists(data.role_id, trx);
			await ensure_unique_user_role(data.user_id, data.role_id, undefined, trx);

			const should_set_primary = data.is_primary === true || !(await has_primary_role(data.user_id, trx));
			const now = new Date();

			const created = await UserRole.create(
				{
					user_id: data.user_id,
					role_id: data.role_id,
					assigned_by: actor_id,
					assigned_at: now,
					updated_at: now,
					is_primary: false,
				},
				{
					transaction: trx,
				},
			);

			if (should_set_primary) {
				await set_primary_role(data.user_id, created.id, trx);
			}

			const fresh = await get_user_role_by_id_or_throw(created.id, trx, true);
			return map_user_role_response(fresh);
		});
	},

	async updateById(
		id: string,
		data: UserRoleUpdateDto,
		actor_id: string | null,
		transaction?: Transaction,
	): Promise<UserRoleResponse> {
		await assert_can_manage_user_role(actor_id, transaction);

		return run_in_transaction(transaction, async (trx) => {
			const record = await get_user_role_by_id_or_throw(id, trx, false);
			const current_is_primary = record.is_primary === true;
			const next_role_id = data.role_id ?? record.role_id;

			if (data.role_id && data.role_id !== record.role_id) {
				await ensure_role_exists(data.role_id, trx);
				await ensure_unique_user_role(record.user_id, data.role_id, record.id, trx);
			}

			if (data.is_primary === false && current_is_primary) {
				const remaining = await get_first_remaining_user_role(record.user_id, record.id, trx);

				if (!remaining) {
					throw new GenericError(
						{
							vi: "Không thể bỏ vai trò chính khi người dùng chỉ còn một phân quyền",
							en: "Cannot unset primary role when the user has only one role assignment",
						},
						"BAD_REQUEST",
						400,
					);
				}
			}

			await record.update(
				{
					role_id: next_role_id,
					updated_at: new Date(),
				},
				{
					transaction: trx,
				},
			);

			if (data.is_primary === true) {
				await set_primary_role(record.user_id, record.id, trx);
			}

			if (data.is_primary === false && current_is_primary) {
				await UserRole.update(
					{
						is_primary: false,
						updated_at: new Date(),
					},
					{
						where: { id: record.id },
						transaction: trx,
					},
				);

				const remaining = await get_first_remaining_user_role(record.user_id, record.id, trx);

				if (remaining) {
					await set_primary_role(record.user_id, remaining.id, trx);
				}
			}

			const fresh = await get_user_role_by_id_or_throw(record.id, trx, true);
			return map_user_role_response(fresh);
		});
	},

	async deleteById(
		id: string,
		actor_id: string | null,
		transaction?: Transaction,
	): Promise<{ id: string; deleted: true }> {
		await assert_can_manage_user_role(actor_id, transaction);

		return run_in_transaction(transaction, async (trx) => {
			const record = await get_user_role_by_id_or_throw(id, trx, false);
			const was_primary = record.is_primary === true;
			const user_id = record.user_id;

			await UserRole.destroy({
				where: { id: record.id },
				transaction: trx,
			});

			if (was_primary) {
				await ensure_primary_after_delete(user_id, trx);
			}

			return {
				id,
				deleted: true,
			};
		});
	},
};