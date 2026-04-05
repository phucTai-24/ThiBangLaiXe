import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { File, FileId } from "./File";
import type { User, UserId } from "./User";

export interface LogoAttributes {
	id: string;
	logo_name: string;
	description?: string | null;
	file_id: string;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
}

export type LogoPk = "id";
export type LogoId = Logo[LogoPk];
export type LogoOptionalAttributes = "id" | "description" | "created_at" | "created_by" | "updated_at" | "updated_by";
export type LogoCreationAttributes = Optional<LogoAttributes, LogoOptionalAttributes>;

export class Logo extends Model<LogoAttributes, LogoCreationAttributes> implements LogoAttributes {
	declare id: string;
	declare logo_name: string;
	declare description?: string | null;
	declare file_id: string;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;

	// Logo belongsTo File via file_id
	declare file: File;
	declare getFile: Sequelize.BelongsToGetAssociationMixin<File>;
	declare setFile: Sequelize.BelongsToSetAssociationMixin<File, FileId>;
	declare createFile: Sequelize.BelongsToCreateAssociationMixin<File>;
	// Logo belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Logo belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Logo {
		return Logo.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				logo_name: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				description: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				file_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "files",
						key: "id",
					},
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: false,
					defaultValue: Sequelize.Sequelize.fn("now"),
				},
				created_by: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "users",
						key: "id",
					},
				},
				updated_at: {
					type: DataTypes.DATE,
					allowNull: false,
					defaultValue: Sequelize.Sequelize.fn("now"),
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
				tableName: "logos",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_logos_created_at",
						fields: [{ name: "created_at" }],
					},
					{
						name: "idx_logos_file_id",
						fields: [{ name: "file_id" }],
					},
					{
						name: "idx_logos_logo_name",
						fields: [{ name: "logo_name" }],
					},
					{
						name: "idx_logos_updated_at",
						fields: [{ name: "updated_at" }],
					},
					{
						name: "logos_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
