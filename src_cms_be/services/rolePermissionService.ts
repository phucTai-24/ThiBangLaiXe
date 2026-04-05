import type { Transaction } from "sequelize";
import { RolePermission } from "#models/RolePermission";
import { Role } from "#models/Role";
import { Permission } from "#models/Permission";
import { GenericError } from "#interfaces/error/generic";

interface RolePermissionBulkCreateDto {
	permission_ids: string[];
}

export const rolePermissionService = {
	/**
	 * Bulk create role permissions by role ID
	 * @param roleId - Role ID from params
	 * @param permissionIds - Array of permission IDs
	 */
	async bulkCreateByRole(
		roleId: string,
		permissionIds: string[],
		transaction?: Transaction,
	): Promise<RolePermission[]> {
		if (permissionIds.length === 0) {
			throw new GenericError(
				{ vi: "Danh sách permission không được để trống", en: "Permission list cannot be empty" },
				"BAD_REQUEST",
				400,
			);
		}

		// Verify role exists
		const role = await Role.findByPk(roleId, {
			transaction: transaction || null,
		});

		if (!role) {
			throw new GenericError(
				{ vi: "Vai trò không tồn tại", en: "Role not found" },
				"NOT_FOUND",
				404,
			);
		}

		// Verify all permissions exist
		const permissions = await Permission.findAll({
			where: { id: permissionIds },
			transaction: transaction || null,
		});

		if (permissions.length !== permissionIds.length) {
			throw new GenericError(
				{ vi: "Một hoặc nhiều permission không tồn tại", en: "One or more permissions not found" },
				"BAD_REQUEST",
				400,
			);
		}

		// Check for existing role-permission mappings
		const existing = await RolePermission.findAll({
			where: {
				role_id: roleId,
				permission_id: permissionIds,
			},
			transaction: transaction || null,
		});

		const existingPermissionIds = new Set(existing.map((rp) => rp.permission_id));
		const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.has(id));

		if (newPermissionIds.length === 0) {
			throw new GenericError(
				{
					vi: "Tất cả các permission đã được gán cho vai trò này",
					en: "All permissions are already assigned to this role",
				},
				"BAD_REQUEST",
				400,
			);
		}

		const rolePermissionsData = newPermissionIds.map((permissionId) => ({
			role_id: roleId,
			permission_id: permissionId,
			created_at: new Date(),
		}));

		return RolePermission.bulkCreate(rolePermissionsData, {
			transaction: transaction || null,
			validate: true,
		});
	},

	/**
	 * Bulk delete role permissions by IDs
	 */
	async bulkDelete(ids: string[], transaction?: Transaction): Promise<number> {
		if (ids.length === 0) {
			throw new GenericError(
				{ vi: "Danh sách ID không được để trống", en: "IDs list cannot be empty" },
				"BAD_REQUEST",
				400,
			);
		}

		const deletedCount = await RolePermission.destroy({
			where: { id: ids },
			transaction: transaction || null,
		});

		if (deletedCount === 0) {
			throw new GenericError(
				{
					vi: "Không tìm thấy role-permission nào để xóa",
					en: "No role-permissions found to delete",
				},
				"NOT_FOUND",
				404,
			);
		}

		return deletedCount;
	},

	/**
	 * Delete all permissions for a specific role
	 */
	async deleteByRole(roleId: string, transaction?: Transaction): Promise<number> {
		const role = await Role.findByPk(roleId, {
			transaction: transaction || null,
		});

		if (!role) {
			throw new GenericError(
				{ vi: "Vai trò không tồn tại", en: "Role not found" },
				"NOT_FOUND",
				404,
			);
		}

		const deletedCount = await RolePermission.destroy({
			where: { role_id: roleId },
			transaction: transaction || null,
		});

		return deletedCount;
	},
};
