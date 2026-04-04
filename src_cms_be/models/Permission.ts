import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { RolePermission, RolePermissionId } from "./RolePermission";
import type { User, UserId } from "./User";

export interface PermissionAttributes {
	id: string;
	name: string;
	description?: string | null;
	resource: string;
	action: string;
	created_at?: Date | null;
	created_by?: string | null;
	updated_by?: string | null;
}

export type PermissionPk = "id";
export type PermissionId = Permission[PermissionPk];
export type PermissionOptionalAttributes = "id" | "description" | "created_at" | "created_by" | "updated_by";
export type PermissionCreationAttributes = Optional<PermissionAttributes, PermissionOptionalAttributes>;

export class Permission
	extends Model<PermissionAttributes, PermissionCreationAttributes>
	implements PermissionAttributes
{
	declare id: string;
	declare name: string;
	declare description?: string | null;
	declare resource: string;
	declare action: string;
	declare created_at?: Date | null;
	declare created_by?: string | null;
	declare updated_by?: string | null;

	// Permission hasMany RolePermission via permission_id
	declare role_permissions: RolePermission[];
	declare getRole_permissions: Sequelize.HasManyGetAssociationsMixin<RolePermission>;
	declare setRole_permissions: Sequelize.HasManySetAssociationsMixin<RolePermission, RolePermissionId>;
	declare addRole_permission: Sequelize.HasManyAddAssociationMixin<RolePermission, RolePermissionId>;
	declare addRole_permissions: Sequelize.HasManyAddAssociationsMixin<RolePermission, RolePermissionId>;
	declare createRole_permission: Sequelize.HasManyCreateAssociationMixin<RolePermission>;
	declare removeRole_permission: Sequelize.HasManyRemoveAssociationMixin<RolePermission, RolePermissionId>;
	declare removeRole_permissions: Sequelize.HasManyRemoveAssociationsMixin<RolePermission, RolePermissionId>;
	declare hasRole_permission: Sequelize.HasManyHasAssociationMixin<RolePermission, RolePermissionId>;
	declare hasRole_permissions: Sequelize.HasManyHasAssociationsMixin<RolePermission, RolePermissionId>;
	declare countRole_permissions: Sequelize.HasManyCountAssociationsMixin;
	// Permission belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Permission belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Permission {
		return Permission.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING(100),
					allowNull: false,
					unique: "permissions_name_key",
				},
				description: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				resource: {
					type: DataTypes.STRING(100),
					allowNull: false,
					unique: "permissions_unique_resource_action",
				},
				action: {
					type: DataTypes.STRING(50),
					allowNull: false,
					unique: "permissions_unique_resource_action",
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				created_by: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "users",
						key: "id",
					},
				},
				updated_by: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "users",
						key: "id",
					},
				},
			},
			{
				sequelize,
				tableName: "permissions",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "permissions_name_key",
						unique: true,
						fields: [{ name: "name" }],
					},
					{
						name: "permissions_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "permissions_unique_resource_action",
						unique: true,
						fields: [{ name: "resource" }, { name: "action" }],
					},
				],
			},
		);
	}
}
