import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Role, RoleId } from "./Role";
import type { User, UserId } from "./User";

export interface UserRoleAttributes {
	id: string;
	user_id: string;
	role_id: string;
	assigned_at?: Date | null;
	assigned_by?: string | null;
	is_primary?: boolean | null;
	updated_at?: Date | null;
}

export type UserRolePk = "id";
export type UserRoleId = UserRole[UserRolePk];
export type UserRoleOptionalAttributes = "id" | "assigned_at" | "assigned_by" | "is_primary" | "updated_at";
export type UserRoleCreationAttributes = Optional<UserRoleAttributes, UserRoleOptionalAttributes>;

export class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
	declare id: string;
	declare user_id: string;
	declare role_id: string;
	declare assigned_at?: Date | null;
	declare assigned_by?: string | null;
	declare is_primary?: boolean | null;
	declare updated_at?: Date | null;

	// UserRole belongsTo Role via role_id
	declare role: Role;
	declare getRole: Sequelize.BelongsToGetAssociationMixin<Role>;
	declare setRole: Sequelize.BelongsToSetAssociationMixin<Role, RoleId>;
	declare createRole: Sequelize.BelongsToCreateAssociationMixin<Role>;
	// UserRole belongsTo User via assigned_by
	declare assigned_by_user: User;
	declare getAssigned_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setAssigned_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createAssigned_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// UserRole belongsTo User via user_id
	declare user: User;
	declare getUser: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUser: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUser: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof UserRole {
		return UserRole.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				user_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "users",
						key: "id",
					},
					unique: "user_roles_user_id_role_id_key",
				},
				role_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "roles",
						key: "id",
					},
					unique: "user_roles_user_id_role_id_key",
				},
				assigned_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				assigned_by: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "users",
						key: "id",
					},
				},
				is_primary: {
					type: DataTypes.BOOLEAN,
					allowNull: true,
					defaultValue: false,
					comment: "Marks the primary role for the user",
				},
				updated_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
			},
			{
				sequelize,
				tableName: "user_roles",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "user_primary_role_unique",
						fields: [{ name: "user_id" }],
					},
					{
						name: "user_roles_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "user_roles_user_id_role_id_key",
						unique: true,
						fields: [{ name: "user_id" }, { name: "role_id" }],
					},
				],
			},
		);
	}
}
