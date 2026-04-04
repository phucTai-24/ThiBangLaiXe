import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { RolePermission, RolePermissionId } from "./RolePermission";
import type { UserRole, UserRoleId } from "./UserRole";
import type { User, UserId } from "./User";

export interface RoleAttributes {
	id: string;
	name: string;
	description?: string | null;
	permissions?: object | null;
	created_at?: Date | null;
	updated_at?: Date | null;
	created_by?: string | null;
	updated_by?: string | null;
}

export type RolePk = "id";
export type RoleId = Role[RolePk];
export type RoleOptionalAttributes =
	| "id"
	| "description"
	| "permissions"
	| "created_at"
	| "updated_at"
	| "created_by"
	| "updated_by";
export type RoleCreationAttributes = Optional<RoleAttributes, RoleOptionalAttributes>;

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
	declare id: string;
	declare name: string;
	declare description?: string | null;
	declare permissions?: object | null;
	declare created_at?: Date | null;
	declare updated_at?: Date | null;
	declare created_by?: string | null;
	declare updated_by?: string | null;

	// Role hasMany RolePermission via role_id
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
	// Role hasMany UserRole via role_id
	declare user_roles: UserRole[];
	declare getUser_roles: Sequelize.HasManyGetAssociationsMixin<UserRole>;
	declare setUser_roles: Sequelize.HasManySetAssociationsMixin<UserRole, UserRoleId>;
	declare addUser_role: Sequelize.HasManyAddAssociationMixin<UserRole, UserRoleId>;
	declare addUser_roles: Sequelize.HasManyAddAssociationsMixin<UserRole, UserRoleId>;
	declare createUser_role: Sequelize.HasManyCreateAssociationMixin<UserRole>;
	declare removeUser_role: Sequelize.HasManyRemoveAssociationMixin<UserRole, UserRoleId>;
	declare removeUser_roles: Sequelize.HasManyRemoveAssociationsMixin<UserRole, UserRoleId>;
	declare hasUser_role: Sequelize.HasManyHasAssociationMixin<UserRole, UserRoleId>;
	declare hasUser_roles: Sequelize.HasManyHasAssociationsMixin<UserRole, UserRoleId>;
	declare countUser_roles: Sequelize.HasManyCountAssociationsMixin;
	// Role belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Role belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Role {
		return Role.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING(50),
					allowNull: false,
					unique: "roles_name_key",
				},
				description: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				permissions: {
					type: DataTypes.JSONB,
					allowNull: true,
					defaultValue: [],
					comment: "JSONB array of permission strings for the role",
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				updated_at: {
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
				tableName: "roles",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "roles_name_key",
						unique: true,
						fields: [{ name: "name" }],
					},
					{
						name: "roles_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
