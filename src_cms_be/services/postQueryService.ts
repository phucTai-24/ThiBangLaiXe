import { Op, type Includeable, type Order, type WhereOptions, type FindAndCountOptions } from "sequelize";
import type { Req } from "#interfaces/IApi";
import { GenericError } from "#interfaces/error/generic";

import { Post, type PostAttributes } from "#models/Post";
import { File } from "#models/File";
import { PostCategory } from "#models/PostCategory";
import { Category, type CategoryAttributes } from "#models/Category";

import { generateCondition, generateConditionExtra } from "#services/database/build-condition";
import { fetchCategoriesForPosts } from "#services/postService";

type CategoryType = CategoryAttributes["type"]; // "post" | "trade" | "industry" | "page"
type UUID = string;

interface CategoryDTO {
	id: string;
	name: string;
	slug: string;
	type: CategoryType;
	url?: string | null;
}

interface PostRowDTO extends Record<string, unknown> {
	id: string;
	categories: CategoryDTO[];
}

interface PostListDTO {
	count: number;
	page?: number;
	pageSize?: number;
	rows: PostRowDTO[];
}

const CATEGORY_TYPES: readonly CategoryType[] = ["post", "trade", "industry", "page"] as const;

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function normalizeUuidToken(raw: string): UUID {
	return raw.replace(/^"|"$/g, "").trim();
}

// Type guard to work well with noUncheckedIndexedAccess
function isUuidToken(raw: unknown): raw is string {
	if (typeof raw !== "string") return false;
	return UUID_REGEX.test(normalizeUuidToken(raw));
}

function isCategoryType(value: string): value is CategoryType {
	return (CATEGORY_TYPES as readonly string[]).includes(value);
}

function normalizeCategoryType(raw: string): CategoryType {
	const v = raw.trim().toLowerCase();
	if (!isCategoryType(v)) {
		throw new GenericError(
			{
				vi: "Giá trị category.type không hợp lệ (chỉ nhận: post, trade, industry, page)",
				en: "Invalid category.type value (allowed: post, trade, industry, page)",
			},
			"BAD_REQUEST",
			400,
			{ value: raw },
		);
	}
	return v;
}

/**
 * Support:
 * - category.id==<uuid>
 * - category.id=="<uuid>"
 * - category.id==(<uuid>|<uuid>|...)
 *
 * Note: "category.id==uuid1, uuid2, uuid3" is supported by stripCategoryFilters lookahead.
 */
function tryParseCategoryIdFilterStart(part: string): UUID[] | null {
	const compact = part.replace(/\s+/g, "");

	const singleMatch = compact.match(/^category\.id=="?([0-9a-fA-F-]{36})"?$/);
	const singleValue = singleMatch?.[1];
	if (singleValue) {
		const id = normalizeUuidToken(singleValue);
		if (!isUuidToken(id)) {
			throw new GenericError(
				{ vi: "Giá trị category.id không hợp lệ (phải là UUID)", en: "Invalid category.id value (must be UUID)" },
				"BAD_REQUEST",
				400,
				{ value: singleValue },
			);
		}
		return [id];
	}

	const listMatch = compact.match(/^category\.id==\((.+)\)$/);
	const listValue = listMatch?.[1];
	if (listValue) {
		const items = listValue
			.split("|")
			.map((x) => normalizeUuidToken(x))
			.filter(Boolean);

		const ids = items.filter((x) => isUuidToken(x)).map((x) => normalizeUuidToken(x));
		if (ids.length === 0) {
			throw new GenericError(
				{ vi: "Giá trị category.id không hợp lệ (phải là UUID)", en: "Invalid category.id value (must be UUID)" },
				"BAD_REQUEST",
				400,
				{ value: listValue },
			);
		}
		return Array.from(new Set(ids));
	}

	if (compact.startsWith("category.id")) {
		throw new GenericError(
			{
				vi: 'Filter category.id hiện chỉ hỗ trợ toán tử "==" (vd: category.id==<uuid>)',
				en: 'Filter category.id currently supports only "==" (ex: category.id==<uuid>)',
			},
			"BAD_REQUEST",
			400,
			{ filter: part },
		);
	}

	return null;
}

/**
 * Support:
 * - category.type==trade
 * - category.type=="trade"
 * - category.type==(trade|post|industry|page)
 */
function tryParseCategoryTypeFilterPart(part: string): CategoryType[] | null {
	const compact = part.replace(/\s+/g, "");

	const singleMatch = compact.match(/^category\.type=="?([a-zA-Z_]+)"?$/);
	const singleValue = singleMatch?.[1];
	if (singleValue) return [normalizeCategoryType(singleValue)];

	const listMatch = compact.match(/^category\.type==\((.+)\)$/);
	const listValue = listMatch?.[1];
	if (listValue) {
		const items = listValue
			.split("|")
			.map((x) => x.replace(/^"|"$/g, "").trim())
			.filter(Boolean);

		if (items.length === 0) return null;
		return Array.from(new Set(items.map(normalizeCategoryType)));
	}

	if (compact.startsWith("category.type")) {
		throw new GenericError(
			{
				vi: 'Filter category.type hiện chỉ hỗ trợ toán tử "==" (vd: category.type==trade)',
				en: 'Filter category.type currently supports only "==" (ex: category.type==trade)',
			},
			"BAD_REQUEST",
			400,
			{ filter: part },
		);
	}

	return null;
}

function stripCategoryFilters(rawFilter: string): {
	remainingRawFilter: string;
	categoryTypes: CategoryType[];
	categoryIds: UUID[];
} {
	const parts = rawFilter
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);

	const remaining: string[] = [];
	const collectedTypes: CategoryType[] = [];
	const collectedIds: UUID[] = [];

	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i];
		if (!part) continue;

		const types = tryParseCategoryTypeFilterPart(part);
		if (types) {
			collectedTypes.push(...types);
			continue;
		}

		const idsStart = tryParseCategoryIdFilterStart(part);
		if (idsStart) {
			collectedIds.push(...idsStart);

			// Allow comma-separated list: category.id==uuid1, uuid2, uuid3
			while (true) {
				const next = parts[i + 1];
				if (!isUuidToken(next)) break;

				collectedIds.push(normalizeUuidToken(next));
				i += 1;
			}
			continue;
		}

		remaining.push(part);
	}

	return {
		remainingRawFilter: remaining.join(","),
		categoryTypes: Array.from(new Set(collectedTypes)),
		categoryIds: Array.from(new Set(collectedIds)),
	};
}

function buildWhereFromRawFilter(rawFilter: string): WhereOptions<PostAttributes> {
	const parts = rawFilter
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);

	const andConditions: Array<WhereOptions<PostAttributes>> = [];

	for (const element of parts) {
		if (element.includes("|")) {
			const orConditions = generateConditionExtra(element);
			if (!orConditions || orConditions.length === 0) continue;

			andConditions.push({ [Op.or]: orConditions } as unknown as WhereOptions<PostAttributes>);
			continue;
		}

		const cond = generateCondition(element);
		if (!cond || Object.keys(cond).length === 0) continue;

		andConditions.push(cond as unknown as WhereOptions<PostAttributes>);
	}

	if (andConditions.length === 0) return {};
	return { [Op.and]: andConditions } as unknown as WhereOptions<PostAttributes>;
}

function buildOrder(sortField: string, sortOrder: string): Order | null {
	const field = (sortField || "").trim();
	const order = (sortOrder || "").trim().toLowerCase();

	if (!field || !["asc", "desc"].includes(order)) return null;
	return [[field, order]];
}

function buildThumbnailInclude(): Includeable {
	return {
		model: File,
		as: "thumbnail",
		required: false,
		attributes: ["id", "path", "original", "mime"],
	};
}

function buildCategoryFilterInclude(input: { categoryTypes: CategoryType[]; categoryIds: UUID[] }): Includeable {
	const where: Record<string, unknown> = {};

	if (input.categoryTypes.length > 0) {
		where.type = input.categoryTypes.length === 1 ? input.categoryTypes[0] : { [Op.in]: input.categoryTypes };
	}

	if (input.categoryIds.length > 0) {
		where.id = input.categoryIds.length === 1 ? input.categoryIds[0] : { [Op.in]: input.categoryIds };
	}

	return {
		model: PostCategory,
		as: "post_categories",
		required: true,
		attributes: [],
		include: [
			{
				model: Category,
				as: "category",
				required: true,
				attributes: [],
				where,
			},
		],
	};
}

export async function getAllPostsWithCategories(req: Req): Promise<PostListDTO> {
	const payload = (req.payload ?? {}) as Record<string, unknown>;

	const page = Number(payload.page ?? 1);
	const pageSize = Number(payload.pageSize ?? 10);
	const sortField = String(payload.sortField ?? "");
	const sortOrder = String(payload.sortOrder ?? "");
	const rawFilter = String(payload.rawFilter ?? "");

	if (!Number.isFinite(page) || page <= 0) {
		throw new GenericError({ vi: "page không hợp lệ", en: "Invalid page" }, "BAD_REQUEST", 400, { page });
	}
	if (!Number.isFinite(pageSize) || pageSize < 0) {
		throw new GenericError({ vi: "pageSize không hợp lệ", en: "Invalid pageSize" }, "BAD_REQUEST", 400, { pageSize });
	}

	const { remainingRawFilter, categoryTypes, categoryIds } = stripCategoryFilters(rawFilter);
	const where = buildWhereFromRawFilter(remainingRawFilter);
	const order = buildOrder(sortField, sortOrder);
	const limit = pageSize > 0 ? pageSize : null;
	const offset = pageSize > 0 ? (page - 1) * pageSize : null;

	// Step 1: Get filtered post IDs (if filtering by category)
	let categoryFilteredPostIds: string[] | null = null;
	if (categoryTypes.length > 0 || categoryIds.length > 0) {
		// Query PostCategory table to get post_ids that match category filters
		const categoryWhere: Record<string, unknown> = {};
		if (categoryIds.length > 0) {
			categoryWhere.category_id = categoryIds.length === 1 ? categoryIds[0] : { [Op.in]: categoryIds };
		}

		const postCategoryInclude: Includeable[] = [];
		if (categoryTypes.length > 0) {
			postCategoryInclude.push({
				model: Category,
				as: "category",
				required: true,
				attributes: [],
				where: {
					type: categoryTypes.length === 1 ? categoryTypes[0] : { [Op.in]: categoryTypes },
				},
			});
		}

		const postCategories = await PostCategory.findAll({
			attributes: ["post_id"],
			where: categoryWhere,
			...(postCategoryInclude.length > 0 ? { include: postCategoryInclude } : {}),
			raw: true,
		});

		categoryFilteredPostIds = Array.from(new Set(postCategories.map((pc: any) => String(pc.post_id))));

		// If no posts match category filter, return empty result
		if (categoryFilteredPostIds.length === 0) {
			return {
				count: 0,
				page,
				pageSize,
				rows: [],
			};
		}
	}

	// Step 2: Build final where condition
	const finalWhere: any = { ...where };
	if (categoryFilteredPostIds) {
		finalWhere.id = { [Op.in]: categoryFilteredPostIds };
	}

	// Step 3: Query unique post IDs with pagination
	// Always prioritize is_featured = true, then apply user's order
	const finalOrder: Order = [["is_featured", "DESC NULLS LAST"]];
	if (order && Array.isArray(order) && order.length > 0) {
		finalOrder.push(...order);
	}
	const uniquePostIds = await Post.findAll({
		attributes: ["id"],
		where: finalWhere,
		order: finalOrder,
		...(typeof limit === "number" ? { limit } : {}),
		...(typeof offset === "number" ? { offset } : {}),
		raw: true,
	});
	const postIds = uniquePostIds.map((p: any) => String(p.id));

	// Step 4: Query total count
	const totalCount = await Post.count({
		where: finalWhere,
	});

	// Step 5: Query full post data by IDs
	let rows: PostRowDTO[] = [];
	if (postIds.length > 0) {
		const posts = await Post.findAll({
			where: { id: { [Op.in]: postIds } },
			include: [buildThumbnailInclude()],
			order: finalOrder,
		});

		const postToCategories = (await fetchCategoriesForPosts(postIds)) as Map<string, CategoryDTO[]>;

		rows = posts.map((post: any) => {
			const plain = post.get({ plain: true });
			const { thumbnail_id: _thumbnailId, ...rest } = plain;
			return {
				...rest,
				id: String(post.id),
				categories: postToCategories.get(String(post.id)) ?? [],
			};
		});
	}

	return {
		count: totalCount,
		page,
		pageSize,
		rows,
	};
}
