import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Category, CategoryId } from "./Category";
import type { PageConfig, PageConfigId } from "./PageConfig";
import type { User, UserId } from "./User";

export interface PageConfigCategoryAttributes {
	page_config_id: string;
	category_id: string;
	created_at: Date;
	created_by?: string | null;
}

export type PageConfigCategoryPk = "page_config_id" | "category_id";
export type PageConfigCategoryId = PageConfigCategory[PageConfigCategoryPk];
export type PageConfigCategoryOptionalAttributes = "created_at" | "created_by";
export type PageConfigCategoryCreationAttributes = Optional<
	PageConfigCategoryAttributes,
	PageConfigCategoryOptionalAttributes
>;

export class PageConfigCategory
	extends Model<PageConfigCategoryAttributes, PageConfigCategoryCreationAttributes>
	implements PageConfigCategoryAttributes
{
	declare page_config_id: string;
	declare category_id: string;
	declare created_at: Date;
	declare created_by?: string | null;

	// PageConfigCategory belongsTo Category via category_id
	declare category: Category;
	declare getCategory: Sequelize.BelongsToGetAssociationMixin<Category>;
	declare setCategory: Sequelize.BelongsToSetAssociationMixin<Category, CategoryId>;
	declare createCategory: Sequelize.BelongsToCreateAssociationMixin<Category>;
	// PageConfigCategory belongsTo PageConfig via page_config_id
	declare page_config: PageConfig;
	declare getPage_config: Sequelize.BelongsToGetAssociationMixin<PageConfig>;
	declare setPage_config: Sequelize.BelongsToSetAssociationMixin<PageConfig, PageConfigId>;
	declare createPage_config: Sequelize.BelongsToCreateAssociationMixin<PageConfig>;
	// PageConfigCategory belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof PageConfigCategory {
		return PageConfigCategory.init(
			{
				page_config_id: {
					type: DataTypes.UUID,
					allowNull: false,
					primaryKey: true,
					references: {
						model: "page_config",
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
				tableName: "page_config_categories",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_page_config_categories_category_id",
						fields: [{ name: "category_id" }],
					},
					{
						name: "idx_page_config_categories_created_by",
						fields: [{ name: "created_by" }],
					},
					{
						name: "idx_page_config_categories_page_config_id",
						fields: [{ name: "page_config_id" }],
					},
					{
						name: "page_config_categories_pkey",
						unique: true,
						fields: [{ name: "page_config_id" }, { name: "category_id" }],
					},
				],
			},
		);
	}
}
