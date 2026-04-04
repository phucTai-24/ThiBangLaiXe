import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Category, CategoryId } from "./Category";
import type { Post, PostId } from "./Post";
import type { User, UserId } from "./User";

export interface PostCategoryAttributes {
	post_id: string;
	category_id: string;
	created_at: Date;
	created_by?: string | null;
}

export type PostCategoryPk = "post_id" | "category_id";
export type PostCategoryId = PostCategory[PostCategoryPk];
export type PostCategoryOptionalAttributes = "created_at" | "created_by";
export type PostCategoryCreationAttributes = Optional<PostCategoryAttributes, PostCategoryOptionalAttributes>;

export class PostCategory
	extends Model<PostCategoryAttributes, PostCategoryCreationAttributes>
	implements PostCategoryAttributes
{
	declare post_id: string;
	declare category_id: string;
	declare created_at: Date;
	declare created_by?: string | null;

	// PostCategory belongsTo Category via category_id
	declare category: Category;
	declare getCategory: Sequelize.BelongsToGetAssociationMixin<Category>;
	declare setCategory: Sequelize.BelongsToSetAssociationMixin<Category, CategoryId>;
	declare createCategory: Sequelize.BelongsToCreateAssociationMixin<Category>;
	// PostCategory belongsTo Post via post_id
	declare post: Post;
	declare getPost: Sequelize.BelongsToGetAssociationMixin<Post>;
	declare setPost: Sequelize.BelongsToSetAssociationMixin<Post, PostId>;
	declare createPost: Sequelize.BelongsToCreateAssociationMixin<Post>;
	// PostCategory belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof PostCategory {
		return PostCategory.init(
			{
				post_id: {
					type: DataTypes.UUID,
					allowNull: false,
					primaryKey: true,
					references: {
						model: "posts",
						key: "id",
					},
				},
				category_id: {
					type: DataTypes.UUID,
					allowNull: false,
					primaryKey: true,
					references: {
						model: "categories",
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
			},
			{
				sequelize,
				tableName: "post_categories",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_post_categories_category_id",
						fields: [{ name: "category_id" }],
					},
					{
						name: "idx_post_categories_created_by",
						fields: [{ name: "created_by" }],
					},
					{
						name: "idx_post_categories_post_id",
						fields: [{ name: "post_id" }],
					},
					{
						name: "post_categories_pkey",
						unique: true,
						fields: [{ name: "post_id" }, { name: "category_id" }],
					},
				],
			},
		);
	}
}
