import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { User, UserId } from "./User";

export interface UserSessionAttributes {
	id: string;
	user_id: string;
	session_token: any;
	refresh_token: any;
	token_version?: number | null;
	device_info?: object | null;
	ip_address?: string | null;
	user_agent?: string | null;
	expires_at: Date;
	refresh_expires_at: Date;
	is_active?: boolean | null;
	created_at?: Date | null;
	last_activity_at?: Date | null;
}

export type UserSessionPk = "id";
export type UserSessionId = UserSession[UserSessionPk];
export type UserSessionOptionalAttributes =
	| "id"
	| "token_version"
	| "device_info"
	| "ip_address"
	| "user_agent"
	| "is_active"
	| "created_at"
	| "last_activity_at";
export type UserSessionCreationAttributes = Optional<UserSessionAttributes, UserSessionOptionalAttributes>;

export class UserSession
	extends Model<UserSessionAttributes, UserSessionCreationAttributes>
	implements UserSessionAttributes
{
	declare id: string;
	declare user_id: string;
	declare session_token: any;
	declare refresh_token: any;
	declare token_version?: number | null;
	declare device_info?: object | null;
	declare ip_address?: string | null;
	declare user_agent?: string | null;
	declare expires_at: Date;
	declare refresh_expires_at: Date;
	declare is_active?: boolean | null;
	declare created_at?: Date | null;
	declare last_activity_at?: Date | null;

	// UserSession belongsTo User via user_id
	declare user: User;
	declare getUser: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUser: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUser: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof UserSession {
		return UserSession.init(
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
				},
				session_token: {
					type: DataTypes.BLOB,
					allowNull: false,
					comment: "Encrypted JWT access token (BYTEA)",
					unique: "user_sessions_session_token_key",
				},
				refresh_token: {
					type: DataTypes.BLOB,
					allowNull: false,
					comment: "Encrypted JWT refresh token (BYTEA)",
					unique: "user_sessions_refresh_token_key",
				},
				token_version: {
					type: DataTypes.INTEGER,
					allowNull: true,
					defaultValue: 1,
					comment: "Token version for rotation",
				},
				device_info: {
					type: DataTypes.JSONB,
					allowNull: true,
				},
				ip_address: {
					type: DataTypes.INET,
					allowNull: true,
				},
				user_agent: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				expires_at: {
					type: DataTypes.DATE,
					allowNull: false,
				},
				refresh_expires_at: {
					type: DataTypes.DATE,
					allowNull: false,
				},
				is_active: {
					type: DataTypes.BOOLEAN,
					allowNull: true,
					defaultValue: true,
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				last_activity_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
			},
			{
				sequelize,
				tableName: "user_sessions",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "idx_user_sessions_expires_at",
						fields: [{ name: "expires_at" }],
					},
					{
						name: "idx_user_sessions_is_active",
						fields: [{ name: "is_active" }],
					},
					{
						name: "idx_user_sessions_refresh_token",
						fields: [{ name: "refresh_token" }],
					},
					{
						name: "idx_user_sessions_session_token",
						fields: [{ name: "session_token" }],
					},
					{
						name: "idx_user_sessions_token_version",
						fields: [{ name: "token_version" }],
					},
					{
						name: "idx_user_sessions_user_id",
						fields: [{ name: "user_id" }],
					},
					{
						name: "user_sessions_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "user_sessions_refresh_token_key",
						unique: true,
						fields: [{ name: "refresh_token" }],
					},
					{
						name: "user_sessions_session_token_key",
						unique: true,
						fields: [{ name: "session_token" }],
					},
				],
			},
		);
	}
}
