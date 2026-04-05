import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { File, FileId } from "./File";
import type { PageConfig, PageConfigId } from "./PageConfig";
import type { PageConfigCategory, PageConfigCategoryId } from "./PageConfigCategory";
import type { PostCategory, PostCategoryId } from "./PostCategory";
import type { Post, PostId } from "./Post";
import type { User, UserId } from "./User";

export interface CategoryAttributes {
	id: string;
	name: string;
	slug: string;
	type: "post" | "industry" | "trade" | "page";
	url?: string | null;
	thumbnail_id?: string | null;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
}

export type CategoryPk = "id";
export type CategoryId = Category[CategoryPk];
export type CategoryOptionalAttributes =
	| "id"
	| "url"
	| "thumbnail_id"
	| "created_at"
	| "created_by"
	| "updated_at"
	| "updated_by";
export type CategoryCreationAttributes = Optional<CategoryAttributes, CategoryOptionalAttributes>;

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
	declare id: string;
	declare name: string;
	declare slug: string;
	declare type: "post" | "industry" | "trade" | "page";
	declare url?: string | null;
	declare thumbnail_id?: string | null;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;

	// Category belongsToMany PageConfig via category_id and page_config_id
	declare page_config_id_page_configs: PageConfig[];
	declare getPage_config_id_page_configs: Sequelize.BelongsToManyGetAssociationsMixin<PageConfig>;
	declare setPage_config_id_page_configs: Sequelize.BelongsToManySetAssociationsMixin<PageConfig, PageConfigId>;
	declare addPage_config_id_page_config: Sequelize.BelongsToManyAddAssociationMixin<PageConfig, PageConfigId>;
	declare addPage_config_id_page_configs: Sequelize.BelongsToManyAddAssociationsMixin<PageConfig, PageConfigId>;
	declare createPage_config_id_page_config: Sequelize.BelongsToManyCreateAssociationMixin<PageConfig>;
	declare removePage_config_id_page_config: Sequelize.BelongsToManyRemoveAssociationMixin<PageConfig, PageConfigId>;
	declare removePage_config_id_page_configs: Sequelize.BelongsToManyRemoveAssociationsMixin<PageConfig, PageConfigId>;
	declare hasPage_config_id_page_config: Sequelize.BelongsToManyHasAssociationMixin<PageConfig, PageConfigId>;
	declare hasPage_config_id_page_configs: Sequelize.BelongsToManyHasAssociationsMixin<PageConfig, PageConfigId>;
	declare countPage_config_id_page_configs: Sequelize.BelongsToManyCountAssociationsMixin;
	// Category hasMany PageConfigCategory via category_id
	declare page_config_categories: PageConfigCategory[];
	declare getPage_config_categories: Sequelize.HasManyGetAssociationsMixin<PageConfigCategory>;
	declare setPage_config_categories: Sequelize.HasManySetAssociationsMixin<PageConfigCategory, PageConfigCategoryId>;
	declare addPage_config_category: Sequelize.HasManyAddAssociationMixin<PageConfigCategory, PageConfigCategoryId>;
	declare addPage_config_categories: Sequelize.HasManyAddAssociationsMixin<PageConfigCategory, PageConfigCategoryId>;
	declare createPage_config_category: Sequelize.HasManyCreateAssociationMixin<PageConfigCategory>;
	declare removePage_config_category: Sequelize.HasManyRemoveAssociationMixin<PageConfigCategory, PageConfigCategoryId>;
	declare removePage_config_categories: Sequelize.HasManyRemoveAssociationsMixin<
		PageConfigCategory,
		PageConfigCategoryId
	>;
	declare hasPage_config_category: Sequelize.HasManyHasAssociationMixin<PageConfigCategory, PageConfigCategoryId>;
	declare hasPage_config_categories: Sequelize.HasManyHasAssociationsMixin<PageConfigCategory, PageConfigCategoryId>;
	declare countPage_config_categories: Sequelize.HasManyCountAssociationsMixin;
	// Category hasMany PostCategory via category_id
	declare post_categories: PostCategory[];
	declare getPost_categories: Sequelize.HasManyGetAssociationsMixin<PostCategory>;
	declare setPost_categories: Sequelize.HasManySetAssociationsMixin<PostCategory, PostCategoryId>;
	declare addPost_category: Sequelize.HasManyAddAssociationMixin<PostCategory, PostCategoryId>;
	declare addPost_categories: Sequelize.HasManyAddAssociationsMixin<PostCategory, PostCategoryId>;
	declare createPost_category: Sequelize.HasManyCreateAssociationMixin<PostCategory>;
	declare removePost_category: Sequelize.HasManyRemoveAssociationMixin<PostCategory, PostCategoryId>;
	declare removePost_categories: Sequelize.HasManyRemoveAssociationsMixin<PostCategory, PostCategoryId>;
	declare hasPost_category: Sequelize.HasManyHasAssociationMixin<PostCategory, PostCategoryId>;
	declare hasPost_categories: Sequelize.HasManyHasAssociationsMixin<PostCategory, PostCategoryId>;
	declare countPost_categories: Sequelize.HasManyCountAssociationsMixin;
	// Category belongsToMany Post via category_id and post_id
	declare post_id_posts: Post[];
	declare getPost_id_posts: Sequelize.BelongsToManyGetAssociationsMixin<Post>;
	declare setPost_id_posts: Sequelize.BelongsToManySetAssociationsMixin<Post, PostId>;
	declare addPost_id_post: Sequelize.BelongsToManyAddAssociationMixin<Post, PostId>;
	declare addPost_id_posts: Sequelize.BelongsToManyAddAssociationsMixin<Post, PostId>;
	declare createPost_id_post: Sequelize.BelongsToManyCreateAssociationMixin<Post>;
	declare removePost_id_post: Sequelize.BelongsToManyRemoveAssociationMixin<Post, PostId>;
	declare removePost_id_posts: Sequelize.BelongsToManyRemoveAssociationsMixin<Post, PostId>;
	declare hasPost_id_post: Sequelize.BelongsToManyHasAssociationMixin<Post, PostId>;
	declare hasPost_id_posts: Sequelize.BelongsToManyHasAssociationsMixin<Post, PostId>;
	declare countPost_id_posts: Sequelize.BelongsToManyCountAssociationsMixin;
	// Category belongsTo File via thumbnail_id
	declare thumbnail: File;
	declare getThumbnail: Sequelize.BelongsToGetAssociationMixin<File>;
	declare setThumbnail: Sequelize.BelongsToSetAssociationMixin<File, FileId>;
	declare createThumbnail: Sequelize.BelongsToCreateAssociationMixin<File>;
	// Category belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Category belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Category {
		return Category.init(
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
					unique: "categories_slug_key",
				},
				type: {
					type: DataTypes.ENUM("post", "industry", "trade", "page"),
					allowNull: false,
				},
				url: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				thumbnail_id: {
					type: DataTypes.UUID,
					allowNull: true,
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
				tableName: "categories",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "categories_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "categories_slug_key",
						unique: true,
						fields: [{ name: "slug" }],
					},
				],
			},
		);
	}
}
