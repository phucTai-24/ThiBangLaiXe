import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { File, FileId } from "./File";
import type { Member, MemberId } from "./Member";
import type { User, UserId } from "./User";

export interface BusinessAttributes {
	id: string;
	name: string;
	slug: string;
	rating?: number | null;
	address?: string | null;
	phone?: string | null;
	website?: string | null;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
	logo_id?: string | null;
	industry_ids?: string[] | null;
}

export type BusinessPk = "id";
export type BusinessId = Business[BusinessPk];
export type BusinessOptionalAttributes =
	| "id"
	| "rating"
	| "address"
	| "phone"
	| "website"
	| "created_at"
	| "created_by"
	| "updated_at"
	| "updated_by"
	| "logo_id"
	| "industry_ids";
export type BusinessCreationAttributes = Optional<BusinessAttributes, BusinessOptionalAttributes>;

export class Business extends Model<BusinessAttributes, BusinessCreationAttributes> implements BusinessAttributes {
	declare id: string;
	declare name: string;
	declare slug: string;
	declare rating?: number | null;
	declare address?: string | null;
	declare phone?: string | null;
	declare website?: string | null;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;
	declare logo_id?: string | null;
	declare industry_ids?: string[] | null;

	// Business hasMany Member via business_id
	declare members: Member[];
	declare getMembers: Sequelize.HasManyGetAssociationsMixin<Member>;
	declare setMembers: Sequelize.HasManySetAssociationsMixin<Member, MemberId>;
	declare addMember: Sequelize.HasManyAddAssociationMixin<Member, MemberId>;
	declare addMembers: Sequelize.HasManyAddAssociationsMixin<Member, MemberId>;
	declare createMember: Sequelize.HasManyCreateAssociationMixin<Member>;
	declare removeMember: Sequelize.HasManyRemoveAssociationMixin<Member, MemberId>;
	declare removeMembers: Sequelize.HasManyRemoveAssociationsMixin<Member, MemberId>;
	declare hasMember: Sequelize.HasManyHasAssociationMixin<Member, MemberId>;
	declare hasMembers: Sequelize.HasManyHasAssociationsMixin<Member, MemberId>;
	declare countMembers: Sequelize.HasManyCountAssociationsMixin;
	// Business belongsTo File via logo_id
	declare logo: File;
	declare getLogo: Sequelize.BelongsToGetAssociationMixin<File>;
	declare setLogo: Sequelize.BelongsToSetAssociationMixin<File, FileId>;
	declare createLogo: Sequelize.BelongsToCreateAssociationMixin<File>;
	// Business belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Business belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Business {
		return Business.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				slug: {
					type: DataTypes.STRING(255),
					allowNull: false,
					unique: "businesses_slug_unique",
				},
				rating: {
					type: DataTypes.DECIMAL,
					allowNull: true,
				},
				address: {
					type: DataTypes.STRING(500),
					allowNull: true,
				},
				phone: {
					type: DataTypes.STRING(30),
					allowNull: true,
				},
				website: {
					type: DataTypes.STRING(255),
					allowNull: true,
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
				logo_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "files",
						key: "id",
					},
				},
				industry_ids: {
					type: DataTypes.ARRAY(DataTypes.UUID),
					allowNull: true,
				},
			},
			{
				sequelize,
				tableName: "businesses",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "businesses_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "businesses_slug_unique",
						unique: true,
						fields: [{ name: "slug" }],
					},
					{
						name: "idx_businesses_industry_ids_gin",
						fields: [{ name: "industry_ids" }],
					},
					{
						name: "idx_businesses_logo_id",
						fields: [{ name: "logo_id" }],
					},
					{
						name: "idx_businesses_slug",
						fields: [{ name: "slug" }],
					},
					{
						name: "idx_businesses_updated_at",
						fields: [{ name: "updated_at" }],
					},
				],
			},
		);
	}
}
