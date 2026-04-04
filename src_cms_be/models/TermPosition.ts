import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Position, PositionId } from "./Position";
import type { TermPositionMember, TermPositionMemberId } from "./TermPositionMember";
import type { Term, TermId } from "./Term";
import type { User, UserId } from "./User";

export interface TermPositionAttributes {
	id: string;
	term_id: string;
	position_id: string;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
}

export type TermPositionPk = "id";
export type TermPositionId = TermPosition[TermPositionPk];
export type TermPositionOptionalAttributes = "id" | "created_at" | "created_by" | "updated_at" | "updated_by";
export type TermPositionCreationAttributes = Optional<TermPositionAttributes, TermPositionOptionalAttributes>;

export class TermPosition
	extends Model<TermPositionAttributes, TermPositionCreationAttributes>
	implements TermPositionAttributes
{
	declare id: string;
	declare term_id: string;
	declare position_id: string;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;

	// TermPosition belongsTo Position via position_id
	declare position: Position;
	declare getPosition: Sequelize.BelongsToGetAssociationMixin<Position>;
	declare setPosition: Sequelize.BelongsToSetAssociationMixin<Position, PositionId>;
	declare createPosition: Sequelize.BelongsToCreateAssociationMixin<Position>;
	// TermPosition hasMany TermPositionMember via term_position_id
	declare term_position_members: TermPositionMember[];
	declare getTerm_position_members: Sequelize.HasManyGetAssociationsMixin<TermPositionMember>;
	declare setTerm_position_members: Sequelize.HasManySetAssociationsMixin<TermPositionMember, TermPositionMemberId>;
	declare addTerm_position_member: Sequelize.HasManyAddAssociationMixin<TermPositionMember, TermPositionMemberId>;
	declare addTerm_position_members: Sequelize.HasManyAddAssociationsMixin<TermPositionMember, TermPositionMemberId>;
	declare createTerm_position_member: Sequelize.HasManyCreateAssociationMixin<TermPositionMember>;
	declare removeTerm_position_member: Sequelize.HasManyRemoveAssociationMixin<TermPositionMember, TermPositionMemberId>;
	declare removeTerm_position_members: Sequelize.HasManyRemoveAssociationsMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare hasTerm_position_member: Sequelize.HasManyHasAssociationMixin<TermPositionMember, TermPositionMemberId>;
	declare hasTerm_position_members: Sequelize.HasManyHasAssociationsMixin<TermPositionMember, TermPositionMemberId>;
	declare countTerm_position_members: Sequelize.HasManyCountAssociationsMixin;
	// TermPosition belongsTo Term via term_id
	declare term: Term;
	declare getTerm: Sequelize.BelongsToGetAssociationMixin<Term>;
	declare setTerm: Sequelize.BelongsToSetAssociationMixin<Term, TermId>;
	declare createTerm: Sequelize.BelongsToCreateAssociationMixin<Term>;
	// TermPosition belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// TermPosition belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof TermPosition {
		return TermPosition.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				term_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "terms",
						key: "id",
					},
					unique: "term_positions_unique",
				},
				position_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "positions",
						key: "id",
					},
					unique: "term_positions_unique",
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
				tableName: "term_positions",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "idx_term_positions_position_id",
						fields: [{ name: "position_id" }],
					},
					{
						name: "idx_term_positions_term_id",
						fields: [{ name: "term_id" }],
					},
					{
						name: "idx_term_positions_updated_at",
						fields: [{ name: "updated_at" }],
					},
					{
						name: "term_positions_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "term_positions_unique",
						unique: true,
						fields: [{ name: "term_id" }, { name: "position_id" }],
					},
				],
			},
		);
	}
}
