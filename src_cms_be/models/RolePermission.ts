import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Permission, PermissionId } from "./Permission";
import type { Role, RoleId } from "./Role";

export interface RolePermissionAttributes {
	id: string;
	permission_id: string;
	created_at?: Date | null;
	role_id?: string | null;
}

export type RolePermissionPk = "id";
export type RolePermissionId = RolePermission[RolePermissionPk];
export type RolePermissionOptionalAttributes = "id" | "created_at" | "role_id";
export type RolePermissionCreationAttributes = Optional<RolePermissionAttributes, RolePermissionOptionalAttributes>;

export class RolePermission
	extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>
	implements RolePermissionAttributes
{
	declare id: string;
	declare permission_id: string;
	declare created_at?: Date | null;
	declare role_id?: string | null;

	// RolePermission belongsTo Permission via permission_id
	declare permission: Permission;
	declare getPermission: Sequelize.BelongsToGetAssociationMixin<Permission>;
	declare setPermission: Sequelize.BelongsToSetAssociationMixin<Permission, PermissionId>;
	declare createPermission: Sequelize.BelongsToCreateAssociationMixin<Permission>;
	// RolePermission belongsTo Role via role_id
	declare role: Role;
	declare getRole: Sequelize.BelongsToGetAssociationMixin<Role>;
	declare setRole: Sequelize.BelongsToSetAssociationMixin<Role, RoleId>;
	declare createRole: Sequelize.BelongsToCreateAssociationMixin<Role>;

	static initModel(sequelize: Sequelize.Sequelize): typeof RolePermission {
		return RolePermission.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				permission_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "permissions",
						key: "id",
					},
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				role_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "roles",
						key: "id",
					},
				},
			},
			{
				sequelize,
				tableName: "role_permissions",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_role_permissions_role_id",
						fields: [{ name: "role_id" }],
					},
					{
						name: "role_permissions_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
