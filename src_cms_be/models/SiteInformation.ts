import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { User, UserId } from "./User";

export interface SiteInformationAttributes {
	id: string;
	code: string;
	telephone?: string | null;
	email?: string | null;
	address?: string | null;
	working_hours?: string | null;
	link_socials: object;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
}

export type SiteInformationPk = "id";
export type SiteInformationId = SiteInformation[SiteInformationPk];
export type SiteInformationOptionalAttributes =
	| "id"
	| "code"
	| "telephone"
	| "email"
	| "address"
	| "working_hours"
	| "link_socials"
	| "created_at"
	| "created_by"
	| "updated_at"
	| "updated_by";
export type SiteInformationCreationAttributes = Optional<SiteInformationAttributes, SiteInformationOptionalAttributes>;

export class SiteInformation
	extends Model<SiteInformationAttributes, SiteInformationCreationAttributes>
	implements SiteInformationAttributes
{
	declare id: string;
	declare code: string;
	declare telephone?: string | null;
	declare email?: string | null;
	declare address?: string | null;
	declare working_hours?: string | null;
	declare link_socials: object;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;

	// SiteInformation belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// SiteInformation belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof SiteInformation {
		return SiteInformation.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				code: {
					type: DataTypes.STRING(50),
					allowNull: false,
					defaultValue: "default",
					unique: "site_informations_code_key",
				},
				telephone: {
					type: DataTypes.STRING(100),
					allowNull: true,
				},
				email: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				address: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				working_hours: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				link_socials: {
					type: DataTypes.JSONB,
					allowNull: false,
					defaultValue: [],
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
				tableName: "site_informations",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_site_informations_code",
						fields: [{ name: "code" }],
					},
					{
						name: "site_informations_code_key",
						unique: true,
						fields: [{ name: "code" }],
					},
					{
						name: "site_informations_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
