import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { User, UserId } from "./User";

export interface ContactAttributes {
	id: string;
	fullname: string;
	email: string;
	phone: string;
	title: string;
	content: string;
	status: "new" | "seen" | "replied";
	created_at: Date;
	updated_at: Date;
	created_by?: string | null;
	updated_by?: string | null;
}

export type ContactPk = "id";
export type ContactId = Contact[ContactPk];
export type ContactOptionalAttributes = "id" | "status" | "created_at" | "updated_at" | "created_by" | "updated_by";
export type ContactCreationAttributes = Optional<ContactAttributes, ContactOptionalAttributes>;

export class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
	declare id: string;
	declare fullname: string;
	declare email: string;
	declare phone: string;
	declare title: string;
	declare content: string;
	declare status: "new" | "seen" | "replied";
	declare created_at: Date;
	declare updated_at: Date;
	declare created_by?: string | null;
	declare updated_by?: string | null;

	// Contact belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Contact belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Contact {
		return Contact.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				fullname: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				email: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				phone: {
					type: DataTypes.STRING(30),
					allowNull: false,
				},
				title: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				content: {
					type: DataTypes.TEXT,
					allowNull: false,
				},
				status: {
					type: DataTypes.ENUM("new", "seen", "replied"),
					allowNull: false,
					defaultValue: "new",
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: false,
					defaultValue: Sequelize.Sequelize.fn("now"),
				},
				updated_at: {
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
				tableName: "contacts",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "contacts_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "idx_contacts_created_by",
						fields: [{ name: "created_by" }],
					},
					{
						name: "idx_contacts_email",
						fields: [{ name: "email" }],
					},
					{
						name: "idx_contacts_status",
						fields: [{ name: "status" }],
					},
					{
						name: "idx_contacts_updated_by",
						fields: [{ name: "updated_by" }],
					},
				],
			},
		);
	}
}
