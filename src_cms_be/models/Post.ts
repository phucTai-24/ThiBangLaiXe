import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Category, CategoryId } from "./Category";
import type { File, FileId } from "./File";
import type { PageConfig, PageConfigId } from "./PageConfig";
import type { PostCategory, PostCategoryId } from "./PostCategory";
import type { User, UserId } from "./User";

export interface PostAttributes {
	id: string;
	title: string;
	thumbnail_id?: string | null;
	external_link: string;
	content: string;
	release_at?: Date | null;
	is_active: boolean;
	release_mode: "NOW" | "SCHEDULED";
	page_config_id?: string | null;
	created_at: Date;
	created_by?: string | null;
	updated_at: Date;
	updated_by?: string | null;
	is_featured?: boolean | null;
	status?: string | null;
	type?: string | null;
}

export type PostPk = "id";
export type PostId = Post[PostPk];
export type PostOptionalAttributes =
	| "id"
	| "thumbnail_id"
	| "release_at"
	| "is_active"
	| "release_mode"
	| "page_config_id"
	| "created_at"
	| "created_by"
	| "updated_at"
	| "updated_by"
	| "is_featured"
	| "status"
	| "type";
export type PostCreationAttributes = Optional<PostAttributes, PostOptionalAttributes>;

export class Post extends Model<PostAttributes, PostCreationAttributes> implements PostAttributes {
	declare id: string;
	declare title: string;
	declare thumbnail_id?: string | null;
	declare external_link: string;
	declare content: string;
	declare release_at?: Date | null;
	declare is_active: boolean;
	declare release_mode: "NOW" | "SCHEDULED";
	declare page_config_id?: string | null;
	declare created_at: Date;
	declare created_by?: string | null;
	declare updated_at: Date;
	declare updated_by?: string | null;
	declare is_featured?: boolean | null;
	declare status?: string | null;
	declare type?: string | null;

	// Post belongsTo File via thumbnail_id
	declare thumbnail: File;
	declare getThumbnail: Sequelize.BelongsToGetAssociationMixin<File>;
	declare setThumbnail: Sequelize.BelongsToSetAssociationMixin<File, FileId>;
	declare createThumbnail: Sequelize.BelongsToCreateAssociationMixin<File>;
	// Post belongsTo PageConfig via page_config_id
	declare page_config: PageConfig;
	declare getPage_config: Sequelize.BelongsToGetAssociationMixin<PageConfig>;
	declare setPage_config: Sequelize.BelongsToSetAssociationMixin<PageConfig, PageConfigId>;
	declare createPage_config: Sequelize.BelongsToCreateAssociationMixin<PageConfig>;
	// Post belongsToMany Category via post_id and category_id
	declare category_id_categories_post_categories: Category[];
	declare getCategory_id_categories_post_categories: Sequelize.BelongsToManyGetAssociationsMixin<Category>;
	declare setCategory_id_categories_post_categories: Sequelize.BelongsToManySetAssociationsMixin<Category, CategoryId>;
	declare addCategory_id_categories_post_category: Sequelize.BelongsToManyAddAssociationMixin<Category, CategoryId>;
	declare addCategory_id_categories_post_categories: Sequelize.BelongsToManyAddAssociationsMixin<Category, CategoryId>;
	declare createCategory_id_categories_post_category: Sequelize.BelongsToManyCreateAssociationMixin<Category>;
	declare removeCategory_id_categories_post_category: Sequelize.BelongsToManyRemoveAssociationMixin<
		Category,
		CategoryId
	>;
	declare removeCategory_id_categories_post_categories: Sequelize.BelongsToManyRemoveAssociationsMixin<
		Category,
		CategoryId
	>;
	declare hasCategory_id_categories_post_category: Sequelize.BelongsToManyHasAssociationMixin<Category, CategoryId>;
	declare hasCategory_id_categories_post_categories: Sequelize.BelongsToManyHasAssociationsMixin<Category, CategoryId>;
	declare countCategory_id_categories_post_categories: Sequelize.BelongsToManyCountAssociationsMixin;
	// Post hasMany PostCategory via post_id
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
	// Post belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// Post belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof Post {
		return Post.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				title: {
					type: DataTypes.TEXT,
					allowNull: false,
				},
				thumbnail_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "files",
						key: "id",
					},
				},
				external_link: {
					type: DataTypes.TEXT,
					allowNull: false,
				},
				content: {
					type: DataTypes.TEXT,
					allowNull: false,
				},
				release_at: {
					type: DataTypes.DATE,
					allowNull: true,
				},
				is_active: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: true,
				},
				release_mode: {
					type: DataTypes.ENUM("NOW", "SCHEDULED"),
					allowNull: false,
					defaultValue: "NOW",
				},
				page_config_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "page_config",
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
				is_featured: {
					type: DataTypes.BOOLEAN,
					allowNull: true,
					defaultValue: false,
				},
				status: {
					type: DataTypes.STRING(20),
					allowNull: true,
					defaultValue: "pending",
				},
				type: {
					type: DataTypes.STRING(20),
					allowNull: true,
				},
			},
			{
				sequelize,
				tableName: "posts",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_posts_page_config_id",
						fields: [{ name: "page_config_id" }],
					},
					{
						name: "posts_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
