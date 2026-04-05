import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Category, CategoryId } from "./Category";
import type { PageConfigCategory, PageConfigCategoryId } from "./PageConfigCategory";
import type { Post, PostId } from "./Post";
import type { User, UserId } from "./User";

export interface PageConfigAttributes {
	id: string;
	code?: string | null;
	name?: string | null;
	static_link?: string | null;
	static_link_en?: string | null;
	parent_id?: string | null;
	level?: number | null;
	sort_order?: number | null;
	is_article?: boolean | null;
	created_at?: Date | null;
	created_by?: string | null;
	updated_at?: Date | null;
	updated_by?: string | null;
}

export type PageConfigPk = "id";
export type PageConfigId = PageConfig[PageConfigPk];
export type PageConfigOptionalAttributes =
	| "id"
	| "code"
	| "name"
	| "static_link"
	| "static_link_en"
	| "parent_id"
	| "level"
	| "sort_order"
	| "is_article"
	| "created_at"
	| "created_by"
	| "updated_at"
	| "updated_by";
export type PageConfigCreationAttributes = Optional<PageConfigAttributes, PageConfigOptionalAttributes>;

export class PageConfig
	extends Model<PageConfigAttributes, PageConfigCreationAttributes>
	implements PageConfigAttributes
{
	declare id: string;
	declare code?: string | null;
	declare name?: string | null;
	declare static_link?: string | null;
	declare static_link_en?: string | null;
	declare parent_id?: string | null;
	declare level?: number | null;
	declare sort_order?: number | null;
	declare is_article?: boolean | null;
	declare created_at?: Date | null;
	declare created_by?: string | null;
	declare updated_at?: Date | null;
	declare updated_by?: string | null;

	// PageConfig belongsToMany Category via page_config_id and category_id
	declare category_id_categories: Category[];
	declare getCategory_id_categories: Sequelize.BelongsToManyGetAssociationsMixin<Category>;
	declare setCategory_id_categories: Sequelize.BelongsToManySetAssociationsMixin<Category, CategoryId>;
	declare addCategory_id_category: Sequelize.BelongsToManyAddAssociationMixin<Category, CategoryId>;
	declare addCategory_id_categories: Sequelize.BelongsToManyAddAssociationsMixin<Category, CategoryId>;
	declare createCategory_id_category: Sequelize.BelongsToManyCreateAssociationMixin<Category>;
	declare removeCategory_id_category: Sequelize.BelongsToManyRemoveAssociationMixin<Category, CategoryId>;
	declare removeCategory_id_categories: Sequelize.BelongsToManyRemoveAssociationsMixin<Category, CategoryId>;
	declare hasCategory_id_category: Sequelize.BelongsToManyHasAssociationMixin<Category, CategoryId>;
	declare hasCategory_id_categories: Sequelize.BelongsToManyHasAssociationsMixin<Category, CategoryId>;
	declare countCategory_id_categories: Sequelize.BelongsToManyCountAssociationsMixin;
	// PageConfig belongsTo PageConfig via parent_id
	declare parent: PageConfig;
	declare getParent: Sequelize.BelongsToGetAssociationMixin<PageConfig>;
	declare setParent: Sequelize.BelongsToSetAssociationMixin<PageConfig, PageConfigId>;
	declare createParent: Sequelize.BelongsToCreateAssociationMixin<PageConfig>;
	// PageConfig hasMany PageConfigCategory via page_config_id
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
	// PageConfig hasMany Post via page_config_id
	declare posts: Post[];
	declare getPosts: Sequelize.HasManyGetAssociationsMixin<Post>;
	declare setPosts: Sequelize.HasManySetAssociationsMixin<Post, PostId>;
	declare addPost: Sequelize.HasManyAddAssociationMixin<Post, PostId>;
	declare addPosts: Sequelize.HasManyAddAssociationsMixin<Post, PostId>;
	declare createPost: Sequelize.HasManyCreateAssociationMixin<Post>;
	declare removePost: Sequelize.HasManyRemoveAssociationMixin<Post, PostId>;
	declare removePosts: Sequelize.HasManyRemoveAssociationsMixin<Post, PostId>;
	declare hasPost: Sequelize.HasManyHasAssociationMixin<Post, PostId>;
	declare hasPosts: Sequelize.HasManyHasAssociationsMixin<Post, PostId>;
	declare countPosts: Sequelize.HasManyCountAssociationsMixin;
	// PageConfig belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// PageConfig belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof PageConfig {
		return PageConfig.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				code: {
					type: DataTypes.STRING(50),
					allowNull: true,
				},
				name: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				static_link: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				static_link_en: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				parent_id: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "page_config",
						key: "id",
					},
				},
				level: {
					type: DataTypes.INTEGER,
					allowNull: true,
					defaultValue: 1,
				},
				sort_order: {
					type: DataTypes.INTEGER,
					allowNull: true,
				},
				is_article: {
					type: DataTypes.BOOLEAN,
					allowNull: true,
					defaultValue: false,
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: true,
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
					allowNull: true,
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
				tableName: "page_config",
				schema: "public",
				hasTrigger: true,
				timestamps: false,
				indexes: [
					{
						name: "page_config_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
