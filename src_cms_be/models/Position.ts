import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Member, MemberId } from "./Member";
import type { TermPosition, TermPositionId } from "./TermPosition";
import type { User, UserId } from "./User";

export interface PositionAttributes {
	id: string;
	name: string;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
}

export type PositionPk = "id";
export type PositionId = Position[PositionPk];
export type PositionOptionalAttributes = "id" | "created_at" | "created_by" | "updated_at" | "updated_by";
export type PositionCreationAttributes = Optional<PositionAttributes, PositionOptionalAttributes>;

export class Position extends Model<PositionAttributes, PositionCreationAttributes> implements PositionAttributes {
	declare id: string;
	declare name: string;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;

	// Position hasMany Member via position_id
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
	// Position hasMany TermPosition via position_id
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
	// Position belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Position belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Position {
		return Position.init(
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
					unique: "positions_name_unique",
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
				tableName: "positions",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_positions_name",
						fields: [{ name: "name" }],
					},
					{
						name: "idx_positions_updated_at",
						fields: [{ name: "updated_at" }],
					},
					{
						name: "positions_name_unique",
						unique: true,
						fields: [{ name: "name" }],
					},
					{
						name: "positions_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
