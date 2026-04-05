import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { TermPosition, TermPositionId } from "./TermPosition";
import type { User, UserId } from "./User";

export interface TermAttributes {
	id: string;
	name: string;
	start_date: string;
	end_date: string;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
}

export type TermPk = "id";
export type TermId = Term[TermPk];
export type TermOptionalAttributes = "id" | "created_at" | "created_by" | "updated_at" | "updated_by";
export type TermCreationAttributes = Optional<TermAttributes, TermOptionalAttributes>;

export class Term extends Model<TermAttributes, TermCreationAttributes> implements TermAttributes {
	declare id: string;
	declare name: string;
	declare start_date: string;
	declare end_date: string;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;

	// Term hasMany TermPosition via term_id
	declare term_positions: TermPosition[];
	declare getTerm_positions: Sequelize.HasManyGetAssociationsMixin<TermPosition>;
	declare setTerm_positions: Sequelize.HasManySetAssociationsMixin<TermPosition, TermPositionId>;
	declare addTerm_position: Sequelize.HasManyAddAssociationMixin<TermPosition, TermPositionId>;
	declare addTerm_positions: Sequelize.HasManyAddAssociationsMixin<TermPosition, TermPositionId>;
	declare createTerm_position: Sequelize.HasManyCreateAssociationMixin<TermPosition>;
	declare removeTerm_position: Sequelize.HasManyRemoveAssociationMixin<TermPosition, TermPositionId>;
	declare removeTerm_positions: Sequelize.HasManyRemoveAssociationsMixin<TermPosition, TermPositionId>;
	declare hasTerm_position: Sequelize.HasManyHasAssociationMixin<TermPosition, TermPositionId>;
	declare hasTerm_positions: Sequelize.HasManyHasAssociationsMixin<TermPosition, TermPositionId>;
	declare countTerm_positions: Sequelize.HasManyCountAssociationsMixin;
	// Term belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Term belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Term {
		return Term.init(
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
				start_date: {
					type: DataTypes.DATEONLY,
					allowNull: false,
				},
				end_date: {
					type: DataTypes.DATEONLY,
					allowNull: false,
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
				tableName: "terms",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "idx_terms_end_date",
						fields: [{ name: "end_date" }],
					},
					{
						name: "idx_terms_start_date",
						fields: [{ name: "start_date" }],
					},
					{
						name: "idx_terms_updated_at",
						fields: [{ name: "updated_at" }],
					},
					{
						name: "terms_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
