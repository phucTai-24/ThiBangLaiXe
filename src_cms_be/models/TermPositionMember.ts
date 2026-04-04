import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Member, MemberId } from "./Member";
import type { TermPosition, TermPositionId } from "./TermPosition";
import type { User, UserId } from "./User";

export interface TermPositionMemberAttributes {
	id: string;
	term_position_id: string;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
	member_id?: string | null;
}

export type TermPositionMemberPk = "id";
export type TermPositionMemberId = TermPositionMember[TermPositionMemberPk];
export type TermPositionMemberOptionalAttributes =
	| "id"
	| "created_at"
	| "created_by"
	| "updated_at"
	| "updated_by"
	| "member_id";
export type TermPositionMemberCreationAttributes = Optional<
	TermPositionMemberAttributes,
	TermPositionMemberOptionalAttributes
>;

export class TermPositionMember
	extends Model<TermPositionMemberAttributes, TermPositionMemberCreationAttributes>
	implements TermPositionMemberAttributes
{
	declare id: string;
	declare term_position_id: string;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;
	declare member_id?: string | null;

	// TermPositionMember belongsTo Member via member_id
	declare member: Member;
	declare getMember: Sequelize.BelongsToGetAssociationMixin<Member>;
	declare setMember: Sequelize.BelongsToSetAssociationMixin<Member, MemberId>;
	declare createMember: Sequelize.BelongsToCreateAssociationMixin<Member>;
	// TermPositionMember belongsTo TermPosition via term_position_id
	declare term_position: TermPosition;
	declare getTerm_position: Sequelize.BelongsToGetAssociationMixin<TermPosition>;
	declare setTerm_position: Sequelize.BelongsToSetAssociationMixin<TermPosition, TermPositionId>;
	declare createTerm_position: Sequelize.BelongsToCreateAssociationMixin<TermPosition>;
	// TermPositionMember belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// TermPositionMember belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof TermPositionMember {
		return TermPositionMember.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				term_position_id: {
					type: DataTypes.UUID,
					allowNull: false,
					references: {
						model: "term_positions",
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
				member_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "members",
						key: "id",
					},
				},
			},
			{
				sequelize,
				tableName: "term_position_members",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "idx_term_position_members_term_position_id",
						fields: [{ name: "term_position_id" }],
					},
					{
						name: "idx_term_position_members_updated_at",
						fields: [{ name: "updated_at" }],
					},
					{
						name: "term_position_members_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
