import { Op, Transaction, type Sequelize } from "sequelize";
import { Post, type PostAttributes, type PostCreationAttributes } from "#models/Post";
import { PostCategory } from "#models/PostCategory";
import { Category, type CategoryAttributes } from "#models/Category";
import { GenericError } from "#interfaces/error/generic";
import { File } from "#models/File";

/**
 * Post Service
 * Contains business logic for post operations
 */

export type CategoryType = CategoryAttributes["type"]; // "post" | "trade" | "industry"	| "page"

export interface CategoryDTO {
	id: string;
	name: string;
	slug: string;
	type: CategoryType;
	url: string | null;
}

export interface ThumbnailDTO {
	id: string;
	path: string;
	original: string;
	mime: string;
}

export type PostResponseDTO = Omit<PostAttributes, "thumbnail_id"> & {
	thumbnail: ThumbnailDTO | null;
	categories: CategoryDTO[];
};

interface CategoryValidationResult {
	ids: string[];
	type: CategoryType | null;
}

const is_record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const uniq_strings = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const parse_string_array = (value: unknown, field: string): string[] => {
	if (!Array.isArray(value)) {
		throw new GenericError({ vi: `${field} không hợp lệ`, en: `${field} is invalid` }, "BAD_REQUEST", 400, { field });
	}
	const all_strings = value.every((x) => typeof x === "string");
	if (!all_strings) {
		throw new GenericError(
			{ vi: `${field} phải là mảng string`, en: `${field} must be string[]` },
			"BAD_REQUEST",
			400,
			{ field },
		);
	}
	return uniq_strings(value);
};

const build_category_dto = (input: Category): CategoryDTO => {
	const plain = input.get({ plain: true }) as unknown;

	if (!is_record(plain)) {
		throw new GenericError(
			{ vi: "Dữ liệu category không hợp lệ", en: "Invalid category data" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return {
		id: String(plain.id ?? ""),
		name: String(plain.name ?? ""),
		slug: String(plain.slug ?? ""),
		type: input.type as CategoryType,
		url: plain.url === null || typeof plain.url === "undefined" ? null : String(plain.url),
	};
};

const build_thumbnail_dto = (input: unknown): ThumbnailDTO | null => {
	if (!is_record(input)) return null;

	const id = typeof input.id === "string" ? input.id : "";
	const path = typeof input.path === "string" ? input.path : "";
	const original = typeof input.original === "string" ? input.original : "";
	const mime = typeof input.mime === "string" ? input.mime : "";

	if (!id || !path) return null;
	return { id, path, original, mime };
};

const to_post_response = (post: Post, categories: CategoryDTO[]): PostResponseDTO => {
	const plain = post.get({ plain: true }) as unknown;

	if (!is_record(plain)) {
		throw new GenericError(
			{ vi: "Dữ liệu post không hợp lệ", en: "Invalid post data" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	const { thumbnail_id: _thumbnail_id, thumbnail: thumbnail_raw, ...rest } = plain;

	return {
		...(rest as unknown as Omit<PostAttributes, "thumbnail_id">),
		thumbnail: build_thumbnail_dto(thumbnail_raw),
		categories,
	};
};

const thumbnail_include = {
	model: File,
	as: "thumbnail",
	required: false,
	attributes: ["id", "path", "original", "mime"],
};

const assert_file_exists = async (file_id: string, field: string, transaction?: Transaction | null) => {
	const file = await File.findByPk(file_id, { attributes: ["id"], transaction: transaction ?? null });
	if (!file) {
		throw new GenericError({ vi: `${field} không tồn tại`, en: `${field} not found` }, "NOT_FOUND", 404, {
			field,
			id: file_id,
		});
	}
};

/**
 * Validate that all category IDs exist and are of the same type
 * Rule: category_ids must all be of the same type (post | trade | industry | page)
 */
export const validateCategoriesSameType = async (
	category_ids: string[],
	transaction?: Transaction | null,
): Promise<CategoryValidationResult> => {
	const unique_ids = uniq_strings(category_ids || []);

	if (unique_ids.length === 0) {
		return { ids: unique_ids, type: null };
	}

	const categories = await Category.findAll({
		where: { id: { [Op.in]: unique_ids } },
		transaction: transaction ?? null,
		attributes: ["id", "type"],
	});

	const found_ids = new Set(categories.map((c) => String(c.get("id"))));
	const missing_ids = unique_ids.filter((id) => !found_ids.has(id));

	if (missing_ids.length > 0) {
		throw new GenericError({ vi: "Category không tồn tại", en: "Category not found" }, "NOT_FOUND", 404, {
			missing: missing_ids,
		});
	}

	const type_set = new Set(categories.map((c) => String(c.get("type"))));
	if (type_set.size > 1) {
		throw new GenericError(
			{ vi: "Các category phải cùng loại", en: "All categories must be of the same type" },
			"BAD_REQUEST",
			400,
			{ types: Array.from(type_set) },
		);
	}

	const first_type = categories[0]?.get("type");
	const category_type = typeof first_type === "string" ? (first_type as CategoryType) : null;

	return { ids: unique_ids, type: category_type };
};

/**
 * Fetch categories for multiple posts
 * Returns a map of post_id -> categories[]
 */
export const fetchCategoriesForPosts = async (post_ids: string[]): Promise<Map<string, CategoryDTO[]>> => {
	const ids = uniq_strings(post_ids);
	if (ids.length === 0) return new Map<string, CategoryDTO[]>();

	const links = await PostCategory.findAll({
		where: { post_id: { [Op.in]: ids } },
		order: [["created_at", "ASC"]],
	});

	const post_to_category_ids = new Map<string, string[]>();
	const all_category_ids: string[] = [];

	for (const link of links) {
		const plain = link.get({ plain: true }) as unknown;
		if (!is_record(plain)) continue;

		const post_id = typeof plain.post_id === "string" ? plain.post_id : null;
		const category_id = typeof plain.category_id === "string" ? plain.category_id : null;

		if (!post_id || !category_id) continue;

		const arr = post_to_category_ids.get(post_id) ?? [];
		arr.push(category_id);
		post_to_category_ids.set(post_id, arr);
		all_category_ids.push(category_id);
	}

	const unique_category_ids = uniq_strings(all_category_ids);

	const categories =
		unique_category_ids.length > 0
			? await Category.findAll({
					where: { id: { [Op.in]: unique_category_ids } },
					attributes: ["id", "name", "slug", "type", "url"],
				})
			: [];

	const category_map = new Map<string, CategoryDTO>(
		categories.map((c) => [String(c.get("id")), build_category_dto(c)]),
	);

	const post_to_categories = new Map<string, CategoryDTO[]>();
	for (const [post_id, category_ids] of post_to_category_ids.entries()) {
		const ordered = category_ids.map((cid) => category_map.get(cid)).filter((x): x is CategoryDTO => Boolean(x));
		post_to_categories.set(post_id, ordered);
	}

	return post_to_categories;
};

/**
 * Fetch categories for a single post
 */
export const fetchCategoriesForPost = async (post_id: string, transaction?: Transaction | null): Promise<CategoryDTO[]> => {
	const links = await PostCategory.findAll({
		where: { post_id },
		order: [["created_at", "ASC"]],
		transaction: transaction ?? null,
	});

	const category_ids = links
		.map((l) => {
			const plain = l.get({ plain: true }) as unknown;
			if (!is_record(plain)) return "";
			return typeof plain.category_id === "string" ? plain.category_id : "";
		})
		.filter(Boolean);

	if (category_ids.length === 0) return [];

	const categories = await Category.findAll({
		where: { id: { [Op.in]: category_ids } },
		attributes: ["id", "name", "slug", "type", "url"],
		transaction: transaction ?? null,
	});

	const category_map = new Map<string, CategoryDTO>(
		categories.map((c) => [String(c.get("id")), build_category_dto(c)]),
	);

	return category_ids.map((cid) => category_map.get(cid)).filter((x): x is CategoryDTO => Boolean(x));
};

/**
 * Link categories to a post
 */
export const linkCategoriesToPost = async (
	post_id: string,
	category_ids: string[],
	user_id: string | null,
	transaction?: Transaction | null,
): Promise<void> => {
	const ids = uniq_strings(category_ids);
	if (ids.length === 0) return;

	await validateCategoriesSameType(ids, transaction);

	await PostCategory.bulkCreate(
		ids.map((category_id) => ({
			post_id,
			category_id,
			created_at: new Date(),
			created_by: user_id,
		})),
		{ transaction: transaction ?? null, ignoreDuplicates: true },
	);
};

/**
 * Update post categories
 * - If category_ids is undefined: do not change existing mappings
 * - If category_ids is []: remove all mappings
 * - If category_ids is [ids...]: replace all mappings
 */
export const updatePostCategories = async (
	post_id: string,
	category_ids: string[] | undefined,
	user_id: string | null,
	transaction?: Transaction | null,
): Promise<void> => {
	if (!Array.isArray(category_ids)) return;

	await PostCategory.destroy({ where: { post_id }, transaction: transaction ?? null });

	if (category_ids.length > 0) {
		await linkCategoriesToPost(post_id, category_ids, user_id, transaction);
	}
};

/**
 * Build post with categories response
 * IMPORTANT: strip thumbnail_id (FE requirement), keep thumbnail object
 */
export const buildPostWithCategories = async (post: Post, transaction?: Transaction | null): Promise<PostResponseDTO> => {
	const categories = await fetchCategoriesForPost(post.id, transaction);
	return to_post_response(post, categories);
};

const get_sequelize = (): Sequelize => {
	const sequelize = Post.sequelize;
	if (!sequelize) throw new Error("Sequelize instance not found");
	return sequelize;
};

export const postService = {
	async getById(id: string): Promise<PostResponseDTO> {
		const post = await Post.findByPk(id, { include: [thumbnail_include] });
		if (!post) {
			throw new GenericError({ vi: "Post không tồn tại", en: "Post not found" }, "NOT_FOUND", 404);
		}
		return buildPostWithCategories(post);
	},

	async create(body: Record<string, unknown>, actorId: string | null): Promise<PostResponseDTO> {
		const sequelize = get_sequelize();

		return sequelize.transaction(async (transaction: Transaction) => {
			const raw = is_record(body) ? body : {};

			const category_ids_raw = raw.category_ids;
			const post_body: Record<string, unknown> = { ...raw };
			delete post_body.category_ids;

			if (typeof category_ids_raw !== "undefined" && !Array.isArray(category_ids_raw)) {
				throw new GenericError(
					{ vi: "category_ids không hợp lệ", en: "category_ids is invalid" },
					"BAD_REQUEST",
					400,
					{ field: "category_ids" },
				);
			}

			const thumbnail_id = post_body.thumbnail_id;
			if (typeof thumbnail_id !== "undefined" && typeof thumbnail_id === "string" && thumbnail_id) {
				await assert_file_exists(thumbnail_id, "thumbnail_id", transaction);
			}

			// NOTE: required fields are validated by middleware -> cast here to satisfy TS
			const created = await Post.create(
				{
					...(post_body as unknown as PostCreationAttributes),
					created_at: new Date(),
					created_by: actorId,
					updated_at: new Date(),
					updated_by: actorId,
				} as unknown as PostCreationAttributes,
				{ transaction },
			);

			if (typeof category_ids_raw !== "undefined") {
				const ids = parse_string_array(category_ids_raw, "category_ids");
				if (ids.length > 0) await linkCategoriesToPost(created.id, ids, actorId, transaction);
			}

			const reloaded = await Post.findByPk(created.id, { transaction, include: [thumbnail_include] });
			if (!reloaded) {
				throw new GenericError(
					{ vi: "Không thể tải lại post sau khi tạo", en: "Cannot reload post after create" },
					"INTERNAL_SERVER_ERROR",
					500,
				);
			}

			return buildPostWithCategories(reloaded, transaction);
		});
	},

	async updateById(id: string, body: Record<string, unknown>, actorId: string | null): Promise<PostResponseDTO> {
		const sequelize = get_sequelize();

		return sequelize.transaction(async (transaction: Transaction) => {
			const post = await Post.findByPk(id, { transaction });
			if (!post) {
				throw new GenericError({ vi: "Post không tồn tại", en: "Post not found" }, "NOT_FOUND", 404);
			}

			const raw = is_record(body) ? body : {};

			const category_ids_raw = raw.category_ids;
			const post_body: Record<string, unknown> = { ...raw };
			delete post_body.category_ids;

			if (typeof category_ids_raw !== "undefined" && !Array.isArray(category_ids_raw)) {
				throw new GenericError(
					{ vi: "category_ids không hợp lệ", en: "category_ids is invalid" },
					"BAD_REQUEST",
					400,
					{ field: "category_ids" },
				);
			}

			const thumbnail_id = post_body.thumbnail_id;
			if (typeof thumbnail_id !== "undefined" && typeof thumbnail_id === "string" && thumbnail_id) {
				await assert_file_exists(thumbnail_id, "thumbnail_id", transaction);
			}

			await post.update(
				{
					...(post_body as unknown as Partial<PostAttributes>),
					updated_at: new Date(),
					updated_by: actorId,
				},
				{ transaction },
			);

			// undefined -> keep, [] -> remove, [..] -> replace
			if (typeof category_ids_raw !== "undefined") {
				const ids = parse_string_array(category_ids_raw, "category_ids");
				await updatePostCategories(id, ids, actorId, transaction);
			}

			const reloaded = await Post.findByPk(id, { transaction, include: [thumbnail_include] });
			if (!reloaded) {
				throw new GenericError(
					{ vi: "Không thể tải lại post sau khi cập nhật", en: "Cannot reload post after update" },
					"INTERNAL_SERVER_ERROR",
					500,
				);
			}

			return buildPostWithCategories(reloaded, transaction);
		});
	},

	async deleteById(id: string): Promise<{ id: string }> {
		const post = await Post.findByPk(id);
		if (!post) {
			throw new GenericError({ vi: "Post không tồn tại", en: "Post not found" }, "NOT_FOUND", 404);
		}
		await post.destroy();
		return { id };
	},
};
