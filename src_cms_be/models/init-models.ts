import type { Sequelize } from "sequelize";
import { Business as _Business } from "./Business";
import type { BusinessAttributes, BusinessCreationAttributes } from "./Business";
import { Category as _Category } from "./Category";
import type { CategoryAttributes, CategoryCreationAttributes } from "./Category";
import { Contact as _Contact } from "./Contact";
import type { ContactAttributes, ContactCreationAttributes } from "./Contact";
import { File as _File } from "./File";
import type { FileAttributes, FileCreationAttributes } from "./File";
import { Logo as _Logo } from "./Logo";
import type { LogoAttributes, LogoCreationAttributes } from "./Logo";
import { Member as _Member } from "./Member";
import type { MemberAttributes, MemberCreationAttributes } from "./Member";
import { PageConfig as _PageConfig } from "./PageConfig";
import type { PageConfigAttributes, PageConfigCreationAttributes } from "./PageConfig";
import { PageConfigCategory as _PageConfigCategory } from "./PageConfigCategory";
import type { PageConfigCategoryAttributes, PageConfigCategoryCreationAttributes } from "./PageConfigCategory";
import { Permission as _Permission } from "./Permission";
import type { PermissionAttributes, PermissionCreationAttributes } from "./Permission";
import { Position as _Position } from "./Position";
import type { PositionAttributes, PositionCreationAttributes } from "./Position";
import { PostCategory as _PostCategory } from "./PostCategory";
import type { PostCategoryAttributes, PostCategoryCreationAttributes } from "./PostCategory";
import { Post as _Post } from "./Post";
import type { PostAttributes, PostCreationAttributes } from "./Post";
import { RolePermission as _RolePermission } from "./RolePermission";
import type { RolePermissionAttributes, RolePermissionCreationAttributes } from "./RolePermission";
import { Role as _Role } from "./Role";
import type { RoleAttributes, RoleCreationAttributes } from "./Role";
import { SiteInformation as _SiteInformation } from "./SiteInformation";
import type { SiteInformationAttributes, SiteInformationCreationAttributes } from "./SiteInformation";
import { TermPositionMember as _TermPositionMember } from "./TermPositionMember";
import type { TermPositionMemberAttributes, TermPositionMemberCreationAttributes } from "./TermPositionMember";
import { TermPosition as _TermPosition } from "./TermPosition";
import type { TermPositionAttributes, TermPositionCreationAttributes } from "./TermPosition";
import { Term as _Term } from "./Term";
import type { TermAttributes, TermCreationAttributes } from "./Term";
import { UserAuth as _UserAuth } from "./UserAuth";
import type { UserAuthAttributes, UserAuthCreationAttributes } from "./UserAuth";
import { UserRole as _UserRole } from "./UserRole";
import type { UserRoleAttributes, UserRoleCreationAttributes } from "./UserRole";
import { UserSession as _UserSession } from "./UserSession";
import type { UserSessionAttributes, UserSessionCreationAttributes } from "./UserSession";
import { User as _User } from "./User";
import type { UserAttributes, UserCreationAttributes } from "./User";

export {
	_Business as Business,
	_Category as Category,
	_Contact as Contact,
	_File as File,
	_Logo as Logo,
	_Member as Member,
	_PageConfig as PageConfig,
	_PageConfigCategory as PageConfigCategory,
	_Permission as Permission,
	_Position as Position,
	_PostCategory as PostCategory,
	_Post as Post,
	_RolePermission as RolePermission,
	_Role as Role,
	_SiteInformation as SiteInformation,
	_TermPositionMember as TermPositionMember,
	_TermPosition as TermPosition,
	_Term as Term,
	_UserAuth as UserAuth,
	_UserRole as UserRole,
	_UserSession as UserSession,
	_User as User,
};

export type {
	BusinessAttributes,
	BusinessCreationAttributes,
	CategoryAttributes,
	CategoryCreationAttributes,
	ContactAttributes,
	ContactCreationAttributes,
	FileAttributes,
	FileCreationAttributes,
	LogoAttributes,
	LogoCreationAttributes,
	MemberAttributes,
	MemberCreationAttributes,
	PageConfigAttributes,
	PageConfigCreationAttributes,
	PageConfigCategoryAttributes,
	PageConfigCategoryCreationAttributes,
	PermissionAttributes,
	PermissionCreationAttributes,
	PositionAttributes,
	PositionCreationAttributes,
	PostCategoryAttributes,
	PostCategoryCreationAttributes,
	PostAttributes,
	PostCreationAttributes,
	RolePermissionAttributes,
	RolePermissionCreationAttributes,
	RoleAttributes,
	RoleCreationAttributes,
	SiteInformationAttributes,
	SiteInformationCreationAttributes,
	TermPositionMemberAttributes,
	TermPositionMemberCreationAttributes,
	TermPositionAttributes,
	TermPositionCreationAttributes,
	TermAttributes,
	TermCreationAttributes,
	UserAuthAttributes,
	UserAuthCreationAttributes,
	UserRoleAttributes,
	UserRoleCreationAttributes,
	UserSessionAttributes,
	UserSessionCreationAttributes,
	UserAttributes,
	UserCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
	const Business = _Business.initModel(sequelize);
	const Category = _Category.initModel(sequelize);
	const Contact = _Contact.initModel(sequelize);
	const File = _File.initModel(sequelize);
	const Logo = _Logo.initModel(sequelize);
	const Member = _Member.initModel(sequelize);
	const PageConfig = _PageConfig.initModel(sequelize);
	const PageConfigCategory = _PageConfigCategory.initModel(sequelize);
	const Permission = _Permission.initModel(sequelize);
	const Position = _Position.initModel(sequelize);
	const PostCategory = _PostCategory.initModel(sequelize);
	const Post = _Post.initModel(sequelize);
	const RolePermission = _RolePermission.initModel(sequelize);
	const Role = _Role.initModel(sequelize);
	const SiteInformation = _SiteInformation.initModel(sequelize);
	const TermPositionMember = _TermPositionMember.initModel(sequelize);
	const TermPosition = _TermPosition.initModel(sequelize);
	const Term = _Term.initModel(sequelize);
	const UserAuth = _UserAuth.initModel(sequelize);
	const UserRole = _UserRole.initModel(sequelize);
	const UserSession = _UserSession.initModel(sequelize);
	const User = _User.initModel(sequelize);

	Category.belongsToMany(PageConfig, {
		as: "page_config_id_page_configs",
		through: PageConfigCategory,
		foreignKey: "category_id",
		otherKey: "page_config_id",
	});
	Category.belongsToMany(Post, {
		as: "post_id_posts",
		through: PostCategory,
		foreignKey: "category_id",
		otherKey: "post_id",
	});
	PageConfig.belongsToMany(Category, {
		as: "category_id_categories",
		through: PageConfigCategory,
		foreignKey: "page_config_id",
		otherKey: "category_id",
	});
	Post.belongsToMany(Category, {
		as: "category_id_categories_post_categories",
		through: PostCategory,
		foreignKey: "post_id",
		otherKey: "category_id",
	});
	Member.belongsTo(Business, { as: "business", foreignKey: "business_id" });
	Business.hasMany(Member, { as: "members", foreignKey: "business_id" });
	PageConfigCategory.belongsTo(Category, { as: "category", foreignKey: "category_id" });
	Category.hasMany(PageConfigCategory, { as: "page_config_categories", foreignKey: "category_id" });
	PostCategory.belongsTo(Category, { as: "category", foreignKey: "category_id" });
	Category.hasMany(PostCategory, { as: "post_categories", foreignKey: "category_id" });
	Business.belongsTo(File, { as: "logo", foreignKey: "logo_id" });
	File.hasMany(Business, { as: "businesses", foreignKey: "logo_id" });
	Category.belongsTo(File, { as: "thumbnail", foreignKey: "thumbnail_id" });
	File.hasMany(Category, { as: "categories", foreignKey: "thumbnail_id" });
	Logo.belongsTo(File, { as: "file", foreignKey: "file_id" });
	File.hasMany(Logo, { as: "logos", foreignKey: "file_id" });
	Post.belongsTo(File, { as: "thumbnail", foreignKey: "thumbnail_id" });
	File.hasMany(Post, { as: "posts", foreignKey: "thumbnail_id" });
	TermPositionMember.belongsTo(Member, { as: "member", foreignKey: "member_id" });
	Member.hasMany(TermPositionMember, { as: "term_position_members", foreignKey: "member_id" });
	PageConfig.belongsTo(PageConfig, { as: "parent", foreignKey: "parent_id" });
	PageConfig.hasMany(PageConfig, { as: "page_configs", foreignKey: "parent_id" });
	PageConfigCategory.belongsTo(PageConfig, { as: "page_config", foreignKey: "page_config_id" });
	PageConfig.hasMany(PageConfigCategory, { as: "page_config_categories", foreignKey: "page_config_id" });
	Post.belongsTo(PageConfig, { as: "page_config", foreignKey: "page_config_id" });
	PageConfig.hasMany(Post, { as: "posts", foreignKey: "page_config_id" });
	RolePermission.belongsTo(Permission, { as: "permission", foreignKey: "permission_id" });
	Permission.hasMany(RolePermission, { as: "role_permissions", foreignKey: "permission_id" });
	Member.belongsTo(Position, { as: "position", foreignKey: "position_id" });
	Position.hasMany(Member, { as: "members", foreignKey: "position_id" });
	TermPosition.belongsTo(Position, { as: "position", foreignKey: "position_id" });
	Position.hasMany(TermPosition, { as: "term_positions", foreignKey: "position_id" });
	PostCategory.belongsTo(Post, { as: "post", foreignKey: "post_id" });
	Post.hasMany(PostCategory, { as: "post_categories", foreignKey: "post_id" });
	RolePermission.belongsTo(Role, { as: "role", foreignKey: "role_id" });
	Role.hasMany(RolePermission, { as: "role_permissions", foreignKey: "role_id" });
	UserRole.belongsTo(Role, { as: "role", foreignKey: "role_id" });
	Role.hasMany(UserRole, { as: "user_roles", foreignKey: "role_id" });
	TermPositionMember.belongsTo(TermPosition, { as: "term_position", foreignKey: "term_position_id" });
	TermPosition.hasMany(TermPositionMember, { as: "term_position_members", foreignKey: "term_position_id" });
	TermPosition.belongsTo(Term, { as: "term", foreignKey: "term_id" });
	Term.hasMany(TermPosition, { as: "term_positions", foreignKey: "term_id" });
	Business.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Business, { as: "businesses", foreignKey: "created_by" });
	Business.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Business, { as: "updated_by_businesses", foreignKey: "updated_by" });
	Category.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Category, { as: "categories", foreignKey: "created_by" });
	Category.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Category, { as: "updated_by_categories", foreignKey: "updated_by" });
	Contact.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Contact, { as: "contacts", foreignKey: "created_by" });
	Contact.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Contact, { as: "updated_by_contacts", foreignKey: "updated_by" });
	File.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(File, { as: "files", foreignKey: "created_by" });
	Logo.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Logo, { as: "logos", foreignKey: "created_by" });
	Logo.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Logo, { as: "updated_by_logos", foreignKey: "updated_by" });
	Member.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Member, { as: "members", foreignKey: "created_by" });
	Member.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Member, { as: "updated_by_members", foreignKey: "updated_by" });
	PageConfig.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(PageConfig, { as: "page_configs", foreignKey: "created_by" });
	PageConfig.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(PageConfig, { as: "updated_by_page_configs", foreignKey: "updated_by" });
	PageConfigCategory.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(PageConfigCategory, { as: "page_config_categories", foreignKey: "created_by" });
	Permission.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Permission, { as: "permissions", foreignKey: "created_by" });
	Permission.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Permission, { as: "updated_by_permissions", foreignKey: "updated_by" });
	Position.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Position, { as: "positions", foreignKey: "created_by" });
	Position.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Position, { as: "updated_by_positions", foreignKey: "updated_by" });
	PostCategory.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(PostCategory, { as: "post_categories", foreignKey: "created_by" });
	Post.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Post, { as: "posts", foreignKey: "created_by" });
	Post.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Post, { as: "updated_by_posts", foreignKey: "updated_by" });
	Role.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Role, { as: "roles", foreignKey: "created_by" });
	Role.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Role, { as: "updated_by_roles", foreignKey: "updated_by" });
	SiteInformation.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(SiteInformation, { as: "site_informations", foreignKey: "created_by" });
	SiteInformation.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(SiteInformation, { as: "updated_by_site_informations", foreignKey: "updated_by" });
	TermPositionMember.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(TermPositionMember, { as: "term_position_members", foreignKey: "created_by" });
	TermPositionMember.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(TermPositionMember, { as: "updated_by_term_position_members", foreignKey: "updated_by" });
	TermPosition.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(TermPosition, { as: "term_positions", foreignKey: "created_by" });
	TermPosition.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(TermPosition, { as: "updated_by_term_positions", foreignKey: "updated_by" });
	Term.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(Term, { as: "terms", foreignKey: "created_by" });
	Term.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(Term, { as: "updated_by_terms", foreignKey: "updated_by" });
	UserAuth.belongsTo(User, { as: "user", foreignKey: "user_id" });
	User.hasOne(UserAuth, { as: "user_auth", foreignKey: "user_id" });
	UserRole.belongsTo(User, { as: "assigned_by_user", foreignKey: "assigned_by" });
	User.hasMany(UserRole, { as: "user_roles", foreignKey: "assigned_by" });
	UserRole.belongsTo(User, { as: "user", foreignKey: "user_id" });
	User.hasMany(UserRole, { as: "user_user_roles", foreignKey: "user_id" });
	UserSession.belongsTo(User, { as: "user", foreignKey: "user_id" });
	User.hasMany(UserSession, { as: "user_sessions", foreignKey: "user_id" });
	User.belongsTo(User, { as: "created_by_user", foreignKey: "created_by" });
	User.hasMany(User, { as: "users", foreignKey: "created_by" });
	User.belongsTo(User, { as: "updated_by_user", foreignKey: "updated_by" });
	User.hasMany(User, { as: "updated_by_users", foreignKey: "updated_by" });

	return {
		Business: Business,
		Category: Category,
		Contact: Contact,
		File: File,
		Logo: Logo,
		Member: Member,
		PageConfig: PageConfig,
		PageConfigCategory: PageConfigCategory,
		Permission: Permission,
		Position: Position,
		PostCategory: PostCategory,
		Post: Post,
		RolePermission: RolePermission,
		Role: Role,
		SiteInformation: SiteInformation,
		TermPositionMember: TermPositionMember,
		TermPosition: TermPosition,
		Term: Term,
		UserAuth: UserAuth,
		UserRole: UserRole,
		UserSession: UserSession,
		User: User,
	};
}
