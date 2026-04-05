import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import type { Business, BusinessId } from "./Business";
import type { Category, CategoryId } from "./Category";
import type { Contact, ContactId } from "./Contact";
import type { File, FileId } from "./File";
import type { Logo, LogoId } from "./Logo";
import type { Member, MemberId } from "./Member";
import type { PageConfig, PageConfigId } from "./PageConfig";
import type { PageConfigCategory, PageConfigCategoryId } from "./PageConfigCategory";
import type { Permission, PermissionId } from "./Permission";
import type { Position, PositionId } from "./Position";
import type { PostCategory, PostCategoryId } from "./PostCategory";
import type { Post, PostId } from "./Post";
import type { Role, RoleId } from "./Role";
import type { SiteInformation, SiteInformationId } from "./SiteInformation";
import type { TermPositionMember, TermPositionMemberId } from "./TermPositionMember";
import type { TermPosition, TermPositionId } from "./TermPosition";
import type { Term, TermId } from "./Term";
import type { UserAuth, UserAuthCreationAttributes, UserAuthId } from "./UserAuth";
import type { UserRole, UserRoleId } from "./UserRole";
import type { UserSession, UserSessionId } from "./UserSession";

export interface UserAttributes {
	id: string;
	email: string;
	username?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	phone?: string | null;
	avatar_url?: string | null;
	status?: "active" | "inactive" | "suspended" | "pending_verification" | null;
	created_at?: Date | null;
	updated_at?: Date | null;
	deleted_at?: Date | null;
	created_by?: string | null;
	updated_by?: string | null;
	birth_date?: string | null;
	hometown?: string | null;
	gender?: "male" | "female" | "other" | null;
	bio?: string | null;
	type: "member" | "businessman" | "subscriber";
}

export type UserPk = "id";
export type UserId = User[UserPk];
export type UserOptionalAttributes =
	| "id"
	| "username"
	| "first_name"
	| "last_name"
	| "phone"
	| "avatar_url"
	| "status"
	| "created_at"
	| "updated_at"
	| "deleted_at"
	| "created_by"
	| "updated_by"
	| "birth_date"
	| "hometown"
	| "gender"
	| "bio"
	| "type";
export type UserCreationAttributes = Optional<UserAttributes, UserOptionalAttributes>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
	declare id: string;
	declare email: string;
	declare username?: string | null;
	declare first_name?: string | null;
	declare last_name?: string | null;
	declare phone?: string | null;
	declare avatar_url?: string | null;
	declare status?: "active" | "inactive" | "suspended" | "pending_verification" | null;
	declare created_at?: Date | null;
	declare updated_at?: Date | null;
	declare deleted_at?: Date | null;
	declare created_by?: string | null;
	declare updated_by?: string | null;
	declare birth_date?: string | null;
	declare hometown?: string | null;
	declare gender?: "male" | "female" | "other" | null;
	declare bio?: string | null;
	declare type: "member" | "businessman" | "subscriber";

	// User hasMany Business via created_by
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
	// User hasMany Business via updated_by
	declare updated_by_businesses: Business[];
	declare getUpdated_by_businesses: Sequelize.HasManyGetAssociationsMixin<Business>;
	declare setUpdated_by_businesses: Sequelize.HasManySetAssociationsMixin<Business, BusinessId>;
	declare addUpdated_by_business: Sequelize.HasManyAddAssociationMixin<Business, BusinessId>;
	declare addUpdated_by_businesses: Sequelize.HasManyAddAssociationsMixin<Business, BusinessId>;
	declare createUpdated_by_business: Sequelize.HasManyCreateAssociationMixin<Business>;
	declare removeUpdated_by_business: Sequelize.HasManyRemoveAssociationMixin<Business, BusinessId>;
	declare removeUpdated_by_businesses: Sequelize.HasManyRemoveAssociationsMixin<Business, BusinessId>;
	declare hasUpdated_by_business: Sequelize.HasManyHasAssociationMixin<Business, BusinessId>;
	declare hasUpdated_by_businesses: Sequelize.HasManyHasAssociationsMixin<Business, BusinessId>;
	declare countUpdated_by_businesses: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Category via created_by
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
	// User hasMany Category via updated_by
	declare updated_by_categories: Category[];
	declare getUpdated_by_categories: Sequelize.HasManyGetAssociationsMixin<Category>;
	declare setUpdated_by_categories: Sequelize.HasManySetAssociationsMixin<Category, CategoryId>;
	declare addUpdated_by_category: Sequelize.HasManyAddAssociationMixin<Category, CategoryId>;
	declare addUpdated_by_categories: Sequelize.HasManyAddAssociationsMixin<Category, CategoryId>;
	declare createUpdated_by_category: Sequelize.HasManyCreateAssociationMixin<Category>;
	declare removeUpdated_by_category: Sequelize.HasManyRemoveAssociationMixin<Category, CategoryId>;
	declare removeUpdated_by_categories: Sequelize.HasManyRemoveAssociationsMixin<Category, CategoryId>;
	declare hasUpdated_by_category: Sequelize.HasManyHasAssociationMixin<Category, CategoryId>;
	declare hasUpdated_by_categories: Sequelize.HasManyHasAssociationsMixin<Category, CategoryId>;
	declare countUpdated_by_categories: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Contact via created_by
	declare contacts: Contact[];
	declare getContacts: Sequelize.HasManyGetAssociationsMixin<Contact>;
	declare setContacts: Sequelize.HasManySetAssociationsMixin<Contact, ContactId>;
	declare addContact: Sequelize.HasManyAddAssociationMixin<Contact, ContactId>;
	declare addContacts: Sequelize.HasManyAddAssociationsMixin<Contact, ContactId>;
	declare createContact: Sequelize.HasManyCreateAssociationMixin<Contact>;
	declare removeContact: Sequelize.HasManyRemoveAssociationMixin<Contact, ContactId>;
	declare removeContacts: Sequelize.HasManyRemoveAssociationsMixin<Contact, ContactId>;
	declare hasContact: Sequelize.HasManyHasAssociationMixin<Contact, ContactId>;
	declare hasContacts: Sequelize.HasManyHasAssociationsMixin<Contact, ContactId>;
	declare countContacts: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Contact via updated_by
	declare updated_by_contacts: Contact[];
	declare getUpdated_by_contacts: Sequelize.HasManyGetAssociationsMixin<Contact>;
	declare setUpdated_by_contacts: Sequelize.HasManySetAssociationsMixin<Contact, ContactId>;
	declare addUpdated_by_contact: Sequelize.HasManyAddAssociationMixin<Contact, ContactId>;
	declare addUpdated_by_contacts: Sequelize.HasManyAddAssociationsMixin<Contact, ContactId>;
	declare createUpdated_by_contact: Sequelize.HasManyCreateAssociationMixin<Contact>;
	declare removeUpdated_by_contact: Sequelize.HasManyRemoveAssociationMixin<Contact, ContactId>;
	declare removeUpdated_by_contacts: Sequelize.HasManyRemoveAssociationsMixin<Contact, ContactId>;
	declare hasUpdated_by_contact: Sequelize.HasManyHasAssociationMixin<Contact, ContactId>;
	declare hasUpdated_by_contacts: Sequelize.HasManyHasAssociationsMixin<Contact, ContactId>;
	declare countUpdated_by_contacts: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany File via created_by
	declare files: File[];
	declare getFiles: Sequelize.HasManyGetAssociationsMixin<File>;
	declare setFiles: Sequelize.HasManySetAssociationsMixin<File, FileId>;
	declare addFile: Sequelize.HasManyAddAssociationMixin<File, FileId>;
	declare addFiles: Sequelize.HasManyAddAssociationsMixin<File, FileId>;
	declare createFile: Sequelize.HasManyCreateAssociationMixin<File>;
	declare removeFile: Sequelize.HasManyRemoveAssociationMixin<File, FileId>;
	declare removeFiles: Sequelize.HasManyRemoveAssociationsMixin<File, FileId>;
	declare hasFile: Sequelize.HasManyHasAssociationMixin<File, FileId>;
	declare hasFiles: Sequelize.HasManyHasAssociationsMixin<File, FileId>;
	declare countFiles: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Logo via created_by
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
	// User hasMany Logo via updated_by
	declare updated_by_logos: Logo[];
	declare getUpdated_by_logos: Sequelize.HasManyGetAssociationsMixin<Logo>;
	declare setUpdated_by_logos: Sequelize.HasManySetAssociationsMixin<Logo, LogoId>;
	declare addUpdated_by_logo: Sequelize.HasManyAddAssociationMixin<Logo, LogoId>;
	declare addUpdated_by_logos: Sequelize.HasManyAddAssociationsMixin<Logo, LogoId>;
	declare createUpdated_by_logo: Sequelize.HasManyCreateAssociationMixin<Logo>;
	declare removeUpdated_by_logo: Sequelize.HasManyRemoveAssociationMixin<Logo, LogoId>;
	declare removeUpdated_by_logos: Sequelize.HasManyRemoveAssociationsMixin<Logo, LogoId>;
	declare hasUpdated_by_logo: Sequelize.HasManyHasAssociationMixin<Logo, LogoId>;
	declare hasUpdated_by_logos: Sequelize.HasManyHasAssociationsMixin<Logo, LogoId>;
	declare countUpdated_by_logos: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Member via created_by
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
	// User hasMany Member via updated_by
	declare updated_by_members: Member[];
	declare getUpdated_by_members: Sequelize.HasManyGetAssociationsMixin<Member>;
	declare setUpdated_by_members: Sequelize.HasManySetAssociationsMixin<Member, MemberId>;
	declare addUpdated_by_member: Sequelize.HasManyAddAssociationMixin<Member, MemberId>;
	declare addUpdated_by_members: Sequelize.HasManyAddAssociationsMixin<Member, MemberId>;
	declare createUpdated_by_member: Sequelize.HasManyCreateAssociationMixin<Member>;
	declare removeUpdated_by_member: Sequelize.HasManyRemoveAssociationMixin<Member, MemberId>;
	declare removeUpdated_by_members: Sequelize.HasManyRemoveAssociationsMixin<Member, MemberId>;
	declare hasUpdated_by_member: Sequelize.HasManyHasAssociationMixin<Member, MemberId>;
	declare hasUpdated_by_members: Sequelize.HasManyHasAssociationsMixin<Member, MemberId>;
	declare countUpdated_by_members: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany PageConfig via created_by
	declare page_configs: PageConfig[];
	declare getPage_configs: Sequelize.HasManyGetAssociationsMixin<PageConfig>;
	declare setPage_configs: Sequelize.HasManySetAssociationsMixin<PageConfig, PageConfigId>;
	declare addPage_config: Sequelize.HasManyAddAssociationMixin<PageConfig, PageConfigId>;
	declare addPage_configs: Sequelize.HasManyAddAssociationsMixin<PageConfig, PageConfigId>;
	declare createPage_config: Sequelize.HasManyCreateAssociationMixin<PageConfig>;
	declare removePage_config: Sequelize.HasManyRemoveAssociationMixin<PageConfig, PageConfigId>;
	declare removePage_configs: Sequelize.HasManyRemoveAssociationsMixin<PageConfig, PageConfigId>;
	declare hasPage_config: Sequelize.HasManyHasAssociationMixin<PageConfig, PageConfigId>;
	declare hasPage_configs: Sequelize.HasManyHasAssociationsMixin<PageConfig, PageConfigId>;
	declare countPage_configs: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany PageConfig via updated_by
	declare updated_by_page_configs: PageConfig[];
	declare getUpdated_by_page_configs: Sequelize.HasManyGetAssociationsMixin<PageConfig>;
	declare setUpdated_by_page_configs: Sequelize.HasManySetAssociationsMixin<PageConfig, PageConfigId>;
	declare addUpdated_by_page_config: Sequelize.HasManyAddAssociationMixin<PageConfig, PageConfigId>;
	declare addUpdated_by_page_configs: Sequelize.HasManyAddAssociationsMixin<PageConfig, PageConfigId>;
	declare createUpdated_by_page_config: Sequelize.HasManyCreateAssociationMixin<PageConfig>;
	declare removeUpdated_by_page_config: Sequelize.HasManyRemoveAssociationMixin<PageConfig, PageConfigId>;
	declare removeUpdated_by_page_configs: Sequelize.HasManyRemoveAssociationsMixin<PageConfig, PageConfigId>;
	declare hasUpdated_by_page_config: Sequelize.HasManyHasAssociationMixin<PageConfig, PageConfigId>;
	declare hasUpdated_by_page_configs: Sequelize.HasManyHasAssociationsMixin<PageConfig, PageConfigId>;
	declare countUpdated_by_page_configs: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany PageConfigCategory via created_by
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
	// User hasMany Permission via created_by
	declare permissions: Permission[];
	declare getPermissions: Sequelize.HasManyGetAssociationsMixin<Permission>;
	declare setPermissions: Sequelize.HasManySetAssociationsMixin<Permission, PermissionId>;
	declare addPermission: Sequelize.HasManyAddAssociationMixin<Permission, PermissionId>;
	declare addPermissions: Sequelize.HasManyAddAssociationsMixin<Permission, PermissionId>;
	declare createPermission: Sequelize.HasManyCreateAssociationMixin<Permission>;
	declare removePermission: Sequelize.HasManyRemoveAssociationMixin<Permission, PermissionId>;
	declare removePermissions: Sequelize.HasManyRemoveAssociationsMixin<Permission, PermissionId>;
	declare hasPermission: Sequelize.HasManyHasAssociationMixin<Permission, PermissionId>;
	declare hasPermissions: Sequelize.HasManyHasAssociationsMixin<Permission, PermissionId>;
	declare countPermissions: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Permission via updated_by
	declare updated_by_permissions: Permission[];
	declare getUpdated_by_permissions: Sequelize.HasManyGetAssociationsMixin<Permission>;
	declare setUpdated_by_permissions: Sequelize.HasManySetAssociationsMixin<Permission, PermissionId>;
	declare addUpdated_by_permission: Sequelize.HasManyAddAssociationMixin<Permission, PermissionId>;
	declare addUpdated_by_permissions: Sequelize.HasManyAddAssociationsMixin<Permission, PermissionId>;
	declare createUpdated_by_permission: Sequelize.HasManyCreateAssociationMixin<Permission>;
	declare removeUpdated_by_permission: Sequelize.HasManyRemoveAssociationMixin<Permission, PermissionId>;
	declare removeUpdated_by_permissions: Sequelize.HasManyRemoveAssociationsMixin<Permission, PermissionId>;
	declare hasUpdated_by_permission: Sequelize.HasManyHasAssociationMixin<Permission, PermissionId>;
	declare hasUpdated_by_permissions: Sequelize.HasManyHasAssociationsMixin<Permission, PermissionId>;
	declare countUpdated_by_permissions: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Position via created_by
	declare positions: Position[];
	declare getPositions: Sequelize.HasManyGetAssociationsMixin<Position>;
	declare setPositions: Sequelize.HasManySetAssociationsMixin<Position, PositionId>;
	declare addPosition: Sequelize.HasManyAddAssociationMixin<Position, PositionId>;
	declare addPositions: Sequelize.HasManyAddAssociationsMixin<Position, PositionId>;
	declare createPosition: Sequelize.HasManyCreateAssociationMixin<Position>;
	declare removePosition: Sequelize.HasManyRemoveAssociationMixin<Position, PositionId>;
	declare removePositions: Sequelize.HasManyRemoveAssociationsMixin<Position, PositionId>;
	declare hasPosition: Sequelize.HasManyHasAssociationMixin<Position, PositionId>;
	declare hasPositions: Sequelize.HasManyHasAssociationsMixin<Position, PositionId>;
	declare countPositions: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Position via updated_by
	declare updated_by_positions: Position[];
	declare getUpdated_by_positions: Sequelize.HasManyGetAssociationsMixin<Position>;
	declare setUpdated_by_positions: Sequelize.HasManySetAssociationsMixin<Position, PositionId>;
	declare addUpdated_by_position: Sequelize.HasManyAddAssociationMixin<Position, PositionId>;
	declare addUpdated_by_positions: Sequelize.HasManyAddAssociationsMixin<Position, PositionId>;
	declare createUpdated_by_position: Sequelize.HasManyCreateAssociationMixin<Position>;
	declare removeUpdated_by_position: Sequelize.HasManyRemoveAssociationMixin<Position, PositionId>;
	declare removeUpdated_by_positions: Sequelize.HasManyRemoveAssociationsMixin<Position, PositionId>;
	declare hasUpdated_by_position: Sequelize.HasManyHasAssociationMixin<Position, PositionId>;
	declare hasUpdated_by_positions: Sequelize.HasManyHasAssociationsMixin<Position, PositionId>;
	declare countUpdated_by_positions: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany PostCategory via created_by
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
	// User hasMany Post via created_by
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
	// User hasMany Post via updated_by
	declare updated_by_posts: Post[];
	declare getUpdated_by_posts: Sequelize.HasManyGetAssociationsMixin<Post>;
	declare setUpdated_by_posts: Sequelize.HasManySetAssociationsMixin<Post, PostId>;
	declare addUpdated_by_post: Sequelize.HasManyAddAssociationMixin<Post, PostId>;
	declare addUpdated_by_posts: Sequelize.HasManyAddAssociationsMixin<Post, PostId>;
	declare createUpdated_by_post: Sequelize.HasManyCreateAssociationMixin<Post>;
	declare removeUpdated_by_post: Sequelize.HasManyRemoveAssociationMixin<Post, PostId>;
	declare removeUpdated_by_posts: Sequelize.HasManyRemoveAssociationsMixin<Post, PostId>;
	declare hasUpdated_by_post: Sequelize.HasManyHasAssociationMixin<Post, PostId>;
	declare hasUpdated_by_posts: Sequelize.HasManyHasAssociationsMixin<Post, PostId>;
	declare countUpdated_by_posts: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Role via created_by
	declare roles: Role[];
	declare getRoles: Sequelize.HasManyGetAssociationsMixin<Role>;
	declare setRoles: Sequelize.HasManySetAssociationsMixin<Role, RoleId>;
	declare addRole: Sequelize.HasManyAddAssociationMixin<Role, RoleId>;
	declare addRoles: Sequelize.HasManyAddAssociationsMixin<Role, RoleId>;
	declare createRole: Sequelize.HasManyCreateAssociationMixin<Role>;
	declare removeRole: Sequelize.HasManyRemoveAssociationMixin<Role, RoleId>;
	declare removeRoles: Sequelize.HasManyRemoveAssociationsMixin<Role, RoleId>;
	declare hasRole: Sequelize.HasManyHasAssociationMixin<Role, RoleId>;
	declare hasRoles: Sequelize.HasManyHasAssociationsMixin<Role, RoleId>;
	declare countRoles: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Role via updated_by
	declare updated_by_roles: Role[];
	declare getUpdated_by_roles: Sequelize.HasManyGetAssociationsMixin<Role>;
	declare setUpdated_by_roles: Sequelize.HasManySetAssociationsMixin<Role, RoleId>;
	declare addUpdated_by_role: Sequelize.HasManyAddAssociationMixin<Role, RoleId>;
	declare addUpdated_by_roles: Sequelize.HasManyAddAssociationsMixin<Role, RoleId>;
	declare createUpdated_by_role: Sequelize.HasManyCreateAssociationMixin<Role>;
	declare removeUpdated_by_role: Sequelize.HasManyRemoveAssociationMixin<Role, RoleId>;
	declare removeUpdated_by_roles: Sequelize.HasManyRemoveAssociationsMixin<Role, RoleId>;
	declare hasUpdated_by_role: Sequelize.HasManyHasAssociationMixin<Role, RoleId>;
	declare hasUpdated_by_roles: Sequelize.HasManyHasAssociationsMixin<Role, RoleId>;
	declare countUpdated_by_roles: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany SiteInformation via created_by
	declare site_informations: SiteInformation[];
	declare getSite_informations: Sequelize.HasManyGetAssociationsMixin<SiteInformation>;
	declare setSite_informations: Sequelize.HasManySetAssociationsMixin<SiteInformation, SiteInformationId>;
	declare addSite_information: Sequelize.HasManyAddAssociationMixin<SiteInformation, SiteInformationId>;
	declare addSite_informations: Sequelize.HasManyAddAssociationsMixin<SiteInformation, SiteInformationId>;
	declare createSite_information: Sequelize.HasManyCreateAssociationMixin<SiteInformation>;
	declare removeSite_information: Sequelize.HasManyRemoveAssociationMixin<SiteInformation, SiteInformationId>;
	declare removeSite_informations: Sequelize.HasManyRemoveAssociationsMixin<SiteInformation, SiteInformationId>;
	declare hasSite_information: Sequelize.HasManyHasAssociationMixin<SiteInformation, SiteInformationId>;
	declare hasSite_informations: Sequelize.HasManyHasAssociationsMixin<SiteInformation, SiteInformationId>;
	declare countSite_informations: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany SiteInformation via updated_by
	declare updated_by_site_informations: SiteInformation[];
	declare getUpdated_by_site_informations: Sequelize.HasManyGetAssociationsMixin<SiteInformation>;
	declare setUpdated_by_site_informations: Sequelize.HasManySetAssociationsMixin<SiteInformation, SiteInformationId>;
	declare addUpdated_by_site_information: Sequelize.HasManyAddAssociationMixin<SiteInformation, SiteInformationId>;
	declare addUpdated_by_site_informations: Sequelize.HasManyAddAssociationsMixin<SiteInformation, SiteInformationId>;
	declare createUpdated_by_site_information: Sequelize.HasManyCreateAssociationMixin<SiteInformation>;
	declare removeUpdated_by_site_information: Sequelize.HasManyRemoveAssociationMixin<
		SiteInformation,
		SiteInformationId
	>;
	declare removeUpdated_by_site_informations: Sequelize.HasManyRemoveAssociationsMixin<
		SiteInformation,
		SiteInformationId
	>;
	declare hasUpdated_by_site_information: Sequelize.HasManyHasAssociationMixin<SiteInformation, SiteInformationId>;
	declare hasUpdated_by_site_informations: Sequelize.HasManyHasAssociationsMixin<SiteInformation, SiteInformationId>;
	declare countUpdated_by_site_informations: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany TermPositionMember via created_by
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
	// User hasMany TermPositionMember via updated_by
	declare updated_by_term_position_members: TermPositionMember[];
	declare getUpdated_by_term_position_members: Sequelize.HasManyGetAssociationsMixin<TermPositionMember>;
	declare setUpdated_by_term_position_members: Sequelize.HasManySetAssociationsMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare addUpdated_by_term_position_member: Sequelize.HasManyAddAssociationMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare addUpdated_by_term_position_members: Sequelize.HasManyAddAssociationsMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare createUpdated_by_term_position_member: Sequelize.HasManyCreateAssociationMixin<TermPositionMember>;
	declare removeUpdated_by_term_position_member: Sequelize.HasManyRemoveAssociationMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare removeUpdated_by_term_position_members: Sequelize.HasManyRemoveAssociationsMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare hasUpdated_by_term_position_member: Sequelize.HasManyHasAssociationMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare hasUpdated_by_term_position_members: Sequelize.HasManyHasAssociationsMixin<
		TermPositionMember,
		TermPositionMemberId
	>;
	declare countUpdated_by_term_position_members: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany TermPosition via created_by
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
	// User hasMany TermPosition via updated_by
	declare updated_by_term_positions: TermPosition[];
	declare getUpdated_by_term_positions: Sequelize.HasManyGetAssociationsMixin<TermPosition>;
	declare setUpdated_by_term_positions: Sequelize.HasManySetAssociationsMixin<TermPosition, TermPositionId>;
	declare addUpdated_by_term_position: Sequelize.HasManyAddAssociationMixin<TermPosition, TermPositionId>;
	declare addUpdated_by_term_positions: Sequelize.HasManyAddAssociationsMixin<TermPosition, TermPositionId>;
	declare createUpdated_by_term_position: Sequelize.HasManyCreateAssociationMixin<TermPosition>;
	declare removeUpdated_by_term_position: Sequelize.HasManyRemoveAssociationMixin<TermPosition, TermPositionId>;
	declare removeUpdated_by_term_positions: Sequelize.HasManyRemoveAssociationsMixin<TermPosition, TermPositionId>;
	declare hasUpdated_by_term_position: Sequelize.HasManyHasAssociationMixin<TermPosition, TermPositionId>;
	declare hasUpdated_by_term_positions: Sequelize.HasManyHasAssociationsMixin<TermPosition, TermPositionId>;
	declare countUpdated_by_term_positions: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Term via created_by
	declare terms: Term[];
	declare getTerms: Sequelize.HasManyGetAssociationsMixin<Term>;
	declare setTerms: Sequelize.HasManySetAssociationsMixin<Term, TermId>;
	declare addTerm: Sequelize.HasManyAddAssociationMixin<Term, TermId>;
	declare addTerms: Sequelize.HasManyAddAssociationsMixin<Term, TermId>;
	declare createTerm: Sequelize.HasManyCreateAssociationMixin<Term>;
	declare removeTerm: Sequelize.HasManyRemoveAssociationMixin<Term, TermId>;
	declare removeTerms: Sequelize.HasManyRemoveAssociationsMixin<Term, TermId>;
	declare hasTerm: Sequelize.HasManyHasAssociationMixin<Term, TermId>;
	declare hasTerms: Sequelize.HasManyHasAssociationsMixin<Term, TermId>;
	declare countTerms: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany Term via updated_by
	declare updated_by_terms: Term[];
	declare getUpdated_by_terms: Sequelize.HasManyGetAssociationsMixin<Term>;
	declare setUpdated_by_terms: Sequelize.HasManySetAssociationsMixin<Term, TermId>;
	declare addUpdated_by_term: Sequelize.HasManyAddAssociationMixin<Term, TermId>;
	declare addUpdated_by_terms: Sequelize.HasManyAddAssociationsMixin<Term, TermId>;
	declare createUpdated_by_term: Sequelize.HasManyCreateAssociationMixin<Term>;
	declare removeUpdated_by_term: Sequelize.HasManyRemoveAssociationMixin<Term, TermId>;
	declare removeUpdated_by_terms: Sequelize.HasManyRemoveAssociationsMixin<Term, TermId>;
	declare hasUpdated_by_term: Sequelize.HasManyHasAssociationMixin<Term, TermId>;
	declare hasUpdated_by_terms: Sequelize.HasManyHasAssociationsMixin<Term, TermId>;
	declare countUpdated_by_terms: Sequelize.HasManyCountAssociationsMixin;
	// User hasOne UserAuth via user_id
	declare user_auth: UserAuth;
	declare getUser_auth: Sequelize.HasOneGetAssociationMixin<UserAuth>;
	declare setUser_auth: Sequelize.HasOneSetAssociationMixin<UserAuth, UserAuthId>;
	declare createUser_auth: Sequelize.HasOneCreateAssociationMixin<UserAuth>;
	// User hasMany UserRole via assigned_by
	declare user_roles: UserRole[];
	declare getUser_roles: Sequelize.HasManyGetAssociationsMixin<UserRole>;
	declare setUser_roles: Sequelize.HasManySetAssociationsMixin<UserRole, UserRoleId>;
	declare addUser_role: Sequelize.HasManyAddAssociationMixin<UserRole, UserRoleId>;
	declare addUser_roles: Sequelize.HasManyAddAssociationsMixin<UserRole, UserRoleId>;
	declare createUser_role: Sequelize.HasManyCreateAssociationMixin<UserRole>;
	declare removeUser_role: Sequelize.HasManyRemoveAssociationMixin<UserRole, UserRoleId>;
	declare removeUser_roles: Sequelize.HasManyRemoveAssociationsMixin<UserRole, UserRoleId>;
	declare hasUser_role: Sequelize.HasManyHasAssociationMixin<UserRole, UserRoleId>;
	declare hasUser_roles: Sequelize.HasManyHasAssociationsMixin<UserRole, UserRoleId>;
	declare countUser_roles: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany UserRole via user_id
	declare user_user_roles: UserRole[];
	declare getUser_user_roles: Sequelize.HasManyGetAssociationsMixin<UserRole>;
	declare setUser_user_roles: Sequelize.HasManySetAssociationsMixin<UserRole, UserRoleId>;
	declare addUser_user_role: Sequelize.HasManyAddAssociationMixin<UserRole, UserRoleId>;
	declare addUser_user_roles: Sequelize.HasManyAddAssociationsMixin<UserRole, UserRoleId>;
	declare createUser_user_role: Sequelize.HasManyCreateAssociationMixin<UserRole>;
	declare removeUser_user_role: Sequelize.HasManyRemoveAssociationMixin<UserRole, UserRoleId>;
	declare removeUser_user_roles: Sequelize.HasManyRemoveAssociationsMixin<UserRole, UserRoleId>;
	declare hasUser_user_role: Sequelize.HasManyHasAssociationMixin<UserRole, UserRoleId>;
	declare hasUser_user_roles: Sequelize.HasManyHasAssociationsMixin<UserRole, UserRoleId>;
	declare countUser_user_roles: Sequelize.HasManyCountAssociationsMixin;
	// User hasMany UserSession via user_id
	declare user_sessions: UserSession[];
	declare getUser_sessions: Sequelize.HasManyGetAssociationsMixin<UserSession>;
	declare setUser_sessions: Sequelize.HasManySetAssociationsMixin<UserSession, UserSessionId>;
	declare addUser_session: Sequelize.HasManyAddAssociationMixin<UserSession, UserSessionId>;
	declare addUser_sessions: Sequelize.HasManyAddAssociationsMixin<UserSession, UserSessionId>;
	declare createUser_session: Sequelize.HasManyCreateAssociationMixin<UserSession>;
	declare removeUser_session: Sequelize.HasManyRemoveAssociationMixin<UserSession, UserSessionId>;
	declare removeUser_sessions: Sequelize.HasManyRemoveAssociationsMixin<UserSession, UserSessionId>;
	declare hasUser_session: Sequelize.HasManyHasAssociationMixin<UserSession, UserSessionId>;
	declare hasUser_sessions: Sequelize.HasManyHasAssociationsMixin<UserSession, UserSessionId>;
	declare countUser_sessions: Sequelize.HasManyCountAssociationsMixin;
	// User belongsTo User via created_by
	declare created_by_user: User;
	declare getCreated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setCreated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createCreated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;
	// User belongsTo User via updated_by
	declare updated_by_user: User;
	declare getUpdated_by_user: Sequelize.BelongsToGetAssociationMixin<User>;
	declare setUpdated_by_user: Sequelize.BelongsToSetAssociationMixin<User, UserId>;
	declare createUpdated_by_user: Sequelize.BelongsToCreateAssociationMixin<User>;

	static initModel(sequelize: Sequelize.Sequelize): typeof User {
		return User.init(
			{
				id: {
					type: DataTypes.UUID,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
					primaryKey: true,
				},
				email: {
					type: DataTypes.STRING(255),
					allowNull: false,
					unique: "users_email_key",
				},
				username: {
					type: DataTypes.STRING(100),
					allowNull: true,
					unique: "users_username_key",
				},
				first_name: {
					type: DataTypes.STRING(100),
					allowNull: true,
				},
				last_name: {
					type: DataTypes.STRING(100),
					allowNull: true,
				},
				phone: {
					type: DataTypes.STRING(20),
					allowNull: true,
				},
				avatar_url: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				status: {
					type: DataTypes.ENUM("active", "inactive", "suspended", "pending_verification"),
					allowNull: true,
					defaultValue: "pending_verification",
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
				deleted_at: {
					type: DataTypes.DATE,
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
				updated_by: {
					type: DataTypes.UUID,
					allowNull: true,
					references: {
						model: "users",
						key: "id",
					},
				},
				birth_date: {
					type: DataTypes.DATEONLY,
					allowNull: true,
				},
				hometown: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				gender: {
					type: DataTypes.ENUM("male", "female", "other"),
					allowNull: true,
				},
				bio: {
					type: DataTypes.TEXT,
					allowNull: true,
				},
				type: {
					type: DataTypes.ENUM("member", "businessman", "subscriber"),
					allowNull: false,
					defaultValue: "member",
				},
			},
			{
				sequelize,
				tableName: "users",
				schema: "public",
				timestamps: false,
				indexes: [
					{
						name: "idx_users_type",
						fields: [{ name: "type" }],
					},
					{
						name: "users_email_key",
						unique: true,
						fields: [{ name: "email" }],
					},
					{
						name: "users_pkey",
						unique: true,
						fields: [{ name: "id" }],
					},
					{
						name: "users_username_key",
						unique: true,
						fields: [{ name: "username" }],
					},
				],
			},
		);
	}
}
