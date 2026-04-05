import type { Transaction } from "sequelize";
import { Role, type RoleAttributes } from "#models/Role";
import { GenericError } from "#interfaces/error/generic";

interface RoleCreateDto {
	name: string;
	description?: string | null;
}

interface RoleUpdateDto {
	name?: string;
	description?: string | null;
}

export const roleService = {
	/**
	 * Bulk create roles
	 */
	async bulkCreate(
		roles: RoleCreateDto[],
		actorId: string | null,
		transaction?: Transaction,
	): Promise<Role[]> {
		const rolesData = roles.map((item) => ({
			...item,
			created_by: actorId,
			updated_by: actorId,
			created_at: new Date(),
		}));

		return Role.bulkCreate(rolesData, {
			transaction: transaction || null,
			validate: true,
		});
	},

	/**
	 * Bulk delete roles by IDs
	 */
	async bulkDelete(ids: string[], transaction?: Transaction): Promise<number> {
		if (ids.length === 0) {
			throw new GenericError(
				{ vi: "Danh sách ID không được để trống", en: "IDs list cannot be empty" },
				"BAD_REQUEST",
				400,
			);
		}

		const deletedCount = await Role.destroy({
			where: { id: ids },
			transaction: transaction || null,
		});

		if (deletedCount === 0) {
			throw new GenericError(
				{ vi: "Không tìm thấy vai trò nào để xóa", en: "No roles found to delete" },
				"NOT_FOUND",
				404,
			);
		}

		return deletedCount;
	},

	/**
	 * Update a single role by ID
	 */
	async updateById(
		id: string,
		data: RoleUpdateDto,
		actorId: string | null,
		transaction?: Transaction,
	): Promise<Role> {
		const record = await Role.findByPk(id, {
			transaction: transaction || null,
		});

		if (!record) {
			throw new GenericError(
				{ vi: "Vai trò không tồn tại", en: "Role not found" },
				"NOT_FOUND",
				404,
			);
		}

		await record.update(
			{
				...data,
				updated_by: actorId,
			},
			{ transaction: transaction || null },
		);

		return record;
	},
};
