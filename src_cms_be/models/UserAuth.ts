import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { User, UserId } from "./User";

export interface UserAuthAttributes {
	id: string;
	user_id: string;
	password_hash: string;
	last_login_at?: Date | null;
	password_changed_at?: Date | null;
	login_attempts?: number | null;
	locked_until?: Date | null;
	twofa_secret?: string | null;
	twofa_backup_codes?: string[] | null;
	twofa_enabled?: boolean | null;
	twofa_method?: string | null;
	password_history?: object | null;
	created_at?: Date | null;
	updated_at?: Date | null;
	reset_password_otp_hash?: string | null;
	reset_password_otp_expires_at?: Date | null;
	reset_password_otp_attempts: number;
	reset_password_otp_sent_at?: Date | null;
}

export type UserAuthPk = "id";
export type UserAuthId = UserAuth[UserAuthPk];
export type UserAuthOptionalAttributes =
	| "id"
	| "last_login_at"
	| "password_changed_at"
	| "login_attempts"
	| "locked_until"
	| "twofa_secret"
	| "twofa_backup_codes"
	| "twofa_enabled"
	| "twofa_method"
	| "password_history"
	| "created_at"
	| "updated_at"
	| "reset_password_otp_hash"
	| "reset_password_otp_expires_at"
	| "reset_password_otp_attempts"
	| "reset_password_otp_sent_at";
export type UserAuthCreationAttributes = Optional<UserAuthAttributes, UserAuthOptionalAttributes>;

export class UserAuth extends Model<UserAuthAttributes, UserAuthCreationAttributes> implements UserAuthAttributes {
	declare id: string;
	declare user_id: string;
	declare password_hash: string;
	declare last_login_at?: Date | null;
	declare password_changed_at?: Date | null;
	declare login_attempts?: number | null;
	declare locked_until?: Date | null;
	declare twofa_secret?: string | null;
	declare twofa_backup_codes?: string[] | null;
	declare twofa_enabled?: boolean | null;
	declare twofa_method?: string | null;
	declare password_history?: object | null;
	declare created_at?: Date | null;
	declare updated_at?: Date | null;
	declare reset_password_otp_hash?: string | null;
	declare reset_password_otp_expires_at?: Date | null;
	declare reset_password_otp_attempts: number;
	declare reset_password_otp_sent_at?: Date | null;

	// UserAuth belongsTo User via user_id
	declare user: User;
	declare getUser: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUser: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUser: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof UserAuth {
		return UserAuth.init(
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
					unique: "user_auth_user_id_key",
				},
				password_hash: {
					type: DataTypes.STRING(255),
					allowNull: false,
					comment: "Bcrypt hashed password",
				},
				last_login_at: {
					type: DataTypes.DATE,
					allowNull: true,
				},
				password_changed_at: {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: Sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				login_attempts: {
					type: DataTypes.INTEGER,
					allowNull: true,
					defaultValue: 0,
					comment: "Failed login attempts counter",
				},
				locked_until: {
					type: DataTypes.DATE,
					allowNull: true,
					comment: "Account lockout timestamp",
				},
				twofa_secret: {
					type: DataTypes.STRING(255),
					allowNull: true,
					comment: "TOTP secret key",
				},
				twofa_backup_codes: {
					type: DataTypes.ARRAY(DataTypes.TEXT),
					allowNull: true,
					comment: "Hashed backup codes for 2FA recovery",
				},
				twofa_enabled: {
					type: DataTypes.BOOLEAN,
					allowNull: true,
					defaultValue: false,
				},
				twofa_method: {
					type: DataTypes.STRING(20),
					allowNull: true,
					defaultValue: "totp",
				},
				password_history: {
					type: DataTypes.JSONB,
					allowNull: true,
					defaultValue: [],
					comment: "JSON array of recent password hashes",
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
				reset_password_otp_hash: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				reset_password_otp_expires_at: {
					type: DataTypes.DATE,
					allowNull: true,
				},
				reset_password_otp_attempts: {
					type: DataTypes.INTEGER,
					allowNull: false,
					defaultValue: 0,
				},
				reset_password_otp_sent_at: {
					type: DataTypes.DATE,
					allowNull: true,
				},
			},
			{
				sequelize,
				tableName: "user_auth",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "idx_user_auth_locked_until",
						fields: [{ name: "locked_until" }],
					},
					{
						name: "idx_user_auth_reset_otp_expires_at",
						fields: [{ name: "reset_password_otp_expires_at" }],
					},
					{
						name: "idx_user_auth_user_id",
						fields: [{ name: "user_id" }],
					},
					{
						name: "user_auth_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "user_auth_user_id_key",
						unique: true,
						fields: [{ name: "user_id" }],
					},
				],
			},
		);
	}
}
