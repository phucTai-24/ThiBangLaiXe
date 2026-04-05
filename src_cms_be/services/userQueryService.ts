import { GenericError } from "#interfaces/error/generic";
import { UserProvider } from "#providers/UserProvider";
import { buildUserWithRoles, buildUsersWithRoles, type UserWithRolesAndAvatar } from "#services/userService";

type GetAllResult = {
	rows?: unknown[];
	[key: string]: unknown;
};

export const userQueryService = {
	async getAllUsersWithRoles(payload: unknown): Promise<GetAllResult> {
		const userProvider = UserProvider.getInstance();

		const data = (await userProvider.getAll((payload || {}) as any)) as GetAllResult;
		const rows = Array.isArray(data?.rows) ? data.rows : [];

		const rowsWithRoles = await buildUsersWithRoles(rows);
		data.rows = rowsWithRoles;

		return data;
	},
	async getUserByIdWithRoles(id: string): Promise<UserWithRolesAndAvatar> {
		const userProvider = UserProvider.getInstance();

		const data = await userProvider.getById({ id });
		if (!data) {
			throw new GenericError({ vi: "User không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
		}

		return await buildUserWithRoles(data);
	},
};
