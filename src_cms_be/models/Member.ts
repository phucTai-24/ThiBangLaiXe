import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Business, BusinessId } from "./Business";
import type { Position, PositionId } from "./Position";
import type { TermPositionMember, TermPositionMemberId } from "./TermPositionMember";
import type { User, UserId } from "./User";

export interface MemberAttributes {
	id: string;
	full_name: string;
	avatar_url?: string | null;
	birth_date?: string | null;
	business_id?: string | null;
	position_id?: string | null;
	created_by?: string | null;
	updated_by?: string | null;
	created_at?: Date | null;
	updated_at?: Date | null;
}

export type MemberPk = "id";
export type MemberId = Member[MemberPk];
export type MemberOptionalAttributes =
	| "id"
	| "avatar_url"
	| "birth_date"
	| "business_id"
	| "position_id"
	| "created_by"
	| "updated_by"
	| "created_at"
	| "updated_at";
export type MemberCreationAttributes = Optional<MemberAttributes, MemberOptionalAttributes>;

export class Member extends Model<MemberAttributes, MemberCreationAttributes> implements MemberAttributes {
	declare id: string;
	declare full_name: string;
	declare avatar_url?: string | null;
	declare birth_date?: string | null;
	declare business_id?: string | null;
	declare position_id?: string | null;
	declare created_by?: string | null;
	declare updated_by?: string | null;
	declare created_at?: Date | null;
	declare updated_at?: Date | null;

	// Member belongsTo Business via business_id
	declare business: Business;
	declare getBusiness: Sequelize.BelongsToGetAssociationMixin<Business>;
	declare setBusiness: Sequelize.BelongsToSetAssociationMixin<Business, BusinessId>;
	declare createBusiness: Sequelize.BelongsToCreateAssociationMixin<Business>;
	// Member hasMany TermPositionMember via member_id
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
	// Member belongsTo Position via position_id
	declare position: Position;
	declare getPosition: Sequelize.BelongsToGetAssociationMixin<Position>;
	declare setPosition: Sequelize.BelongsToSetAssociationMixin<Position, PositionId>;
	declare createPosition: Sequelize.BelongsToCreateAssociationMixin<Position>;
	// Member belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Member belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Member {
		return Member.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				full_name: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				avatar_url: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				birth_date: {
					type: DataTypes.DATEONLY,
					allowNull: true,
				},
				business_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "businesses",
						key: "id",
					},
				},
				position_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "positions",
						key: "id",
					},
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
			},
			{
				sequelize,
				tableName: "members",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "members_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
