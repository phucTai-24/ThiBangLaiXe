import type { Transaction } from "sequelize";
import { Permission, type PermissionAttributes } from "#models/Permission";
import { GenericError } from "#interfaces/error/generic";

interface PermissionCreateDto {
	name: string;
	description?: string | null;
	resource: string;
	action: string;
}

interface PermissionUpdateDto {
	name?: string;
	description?: string | null;
	resource?: string;
	action?: string;
}

export const permissionService = {
	/**
	 * Bulk create permissions
	 */
	async bulkCreate(
		permissions: PermissionCreateDto[],
		actorId: string | null,
		transaction?: Transaction,
	): Promise<Permission[]> {
		const permissionsData = permissions.map((perm) => ({
			name: perm.name,
			description: perm.description || null,
			resource: perm.resource,
			action: perm.action,
			created_by: actorId,
			updated_by: actorId,
			created_at: new Date(),
		}));

		return Permission.bulkCreate(permissionsData, {
			transaction: transaction || null,
			validate: true,
		});
	},

	/**
	 * Bulk delete permissions by IDs
	 */
	async bulkDelete(ids: string[], transaction?: Transaction): Promise<number> {
		if (ids.length === 0) {
			throw new GenericError(
				{ vi: "Danh sách ID không được để trống", en: "IDs list cannot be empty" },
				"BAD_REQUEST",
				400,
			);
		}

		const deletedCount = await Permission.destroy({
			where: {
				id: ids,
			},
			transaction: transaction || null,
		});

		if (deletedCount === 0) {
			throw new GenericError(
				{ vi: "Không tìm thấy permission nào để xóa", en: "No permissions found to delete" },
				"NOT_FOUND",
				404,
			);
		}

		return deletedCount;
	},

	/**
	 * Update a single permission by ID
	 */
	async updateById(
		id: string,
		data: PermissionUpdateDto,
		actorId: string | null,
		transaction?: Transaction,
	): Promise<Permission> {
		const record = await Permission.findByPk(id, { 
			transaction: transaction || null 
		});
		if (!record) {
			throw new GenericError(
				{ vi: "Permission không tồn tại", en: "Permission not found" },
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

	/**
	 * Get permission by ID
	 */
	async getById(id: string, transaction?: Transaction): Promise<Permission> {
		const record = await Permission.findByPk(id, { 
			transaction: transaction || null 
		});
		if (!record) {
			throw new GenericError(
				{ vi: "Permission không tồn tại", en: "Permission not found" },
				"NOT_FOUND",
				404,
			);
		}
		return record;
	},
};
