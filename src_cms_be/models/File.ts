import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Business, BusinessId } from "./Business";
import type { Category, CategoryId } from "./Category";
import type { Logo, LogoId } from "./Logo";
import type { Post, PostId } from "./Post";
import type { User, UserId } from "./User";

export interface FileAttributes {
	id: string;
	path: string;
	original: string;
	mime: string;
	compress_info?: object | null;
	compress_status?: string | null;
	created_by?: string | null;
	created_at?: Date | null;
}

export type FilePk = "id";
export type FileId = File[FilePk];
export type FileOptionalAttributes = "id" | "compress_info" | "compress_status" | "created_by" | "created_at";
export type FileCreationAttributes = Optional<FileAttributes, FileOptionalAttributes>;

export class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
	declare id: string;
	declare path: string;
	declare original: string;
	declare mime: string;
	declare compress_info?: object | null;
	declare compress_status?: string | null;
	declare created_by?: string | null;
	declare created_at?: Date | null;

	// File hasMany Business via logo_id
	declare businesses: Business[];
	declare getBusinesses: Sequelize.HasManyGetAssociationsMixin<Business>;
	declare setBusinesses: Sequelize.HasManySetAssociationsMixin<Business, BusinessId>;
	declare addBusiness: Sequelize.HasManyAddAssociationMixin<Business, BusinessId>;
	declare addBusinesses: Sequelize.HasManyAddAssociationsMixin<Business, BusinessId>;
	declare createBusiness: Sequelize.HasManyCreateAssociationMixin<Business>;
	declare removeBusiness: Sequelize.HasManyRemoveAssociationMixin<Business, BusinessId>;
	declare removeBusinesses: Sequelize.HasManyRemoveAssociationsMixin<Business, BusinessId>;
	declare hasBusiness: Sequelize.HasManyHasAssociationMixin<Business, BusinessId>;
	declare hasBusinesses: Sequelize.HasManyHasAssociationsMixin<Business, BusinessId>;
	declare countBusinesses: Sequelize.HasManyCountAssociationsMixin;
	// File hasMany Category via thumbnail_id
	declare categories: Category[];
	declare getCategories: Sequelize.HasManyGetAssociationsMixin<Category>;
	declare setCategories: Sequelize.HasManySetAssociationsMixin<Category, CategoryId>;
	declare addCategory: Sequelize.HasManyAddAssociationMixin<Category, CategoryId>;
	declare addCategories: Sequelize.HasManyAddAssociationsMixin<Category, CategoryId>;
	declare createCategory: Sequelize.HasManyCreateAssociationMixin<Category>;
	declare removeCategory: Sequelize.HasManyRemoveAssociationMixin<Category, CategoryId>;
	declare removeCategories: Sequelize.HasManyRemoveAssociationsMixin<Category, CategoryId>;
	declare hasCategory: Sequelize.HasManyHasAssociationMixin<Category, CategoryId>;
	declare hasCategories: Sequelize.HasManyHasAssociationsMixin<Category, CategoryId>;
	declare countCategories: Sequelize.HasManyCountAssociationsMixin;
	// File hasMany Logo via file_id
	declare logos: Logo[];
	declare getLogos: Sequelize.HasManyGetAssociationsMixin<Logo>;
	declare setLogos: Sequelize.HasManySetAssociationsMixin<Logo, LogoId>;
	declare addLogo: Sequelize.HasManyAddAssociationMixin<Logo, LogoId>;
	declare addLogos: Sequelize.HasManyAddAssociationsMixin<Logo, LogoId>;
	declare createLogo: Sequelize.HasManyCreateAssociationMixin<Logo>;
	declare removeLogo: Sequelize.HasManyRemoveAssociationMixin<Logo, LogoId>;
	declare removeLogos: Sequelize.HasManyRemoveAssociationsMixin<Logo, LogoId>;
	declare hasLogo: Sequelize.HasManyHasAssociationMixin<Logo, LogoId>;
	declare hasLogos: Sequelize.HasManyHasAssociationsMixin<Logo, LogoId>;
	declare countLogos: Sequelize.HasManyCountAssociationsMixin;
	// File hasMany Post via thumbnail_id
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
	// File belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof File {
		return File.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				path: {
					type: DataTypes.STRING(500),
					allowNull: false,
				},
				original: {
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				mime: {
					type: DataTypes.STRING(100),
					allowNull: false,
				},
				compress_info: {
					type: DataTypes.JSONB,
					allowNull: true,
				},
				compress_status: {
					type: DataTypes.STRING(50),
					allowNull: true,
				},
				created_by: {
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
					defaultValue: Sequelize.Sequelize.fn("now"),
				},
			},
			{
				sequelize,
				tableName: "files",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "files_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
				],
			},
		);
	}
}
