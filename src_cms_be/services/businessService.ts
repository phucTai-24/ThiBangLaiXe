import { Op } from "sequelize";
import type { FindAndCountOptions, Includeable, WhereOptions } from "sequelize";

import { Business } from "#models/Business";
import type { BusinessAttributes, BusinessCreationAttributes } from "#models/Business";
import { File } from "#models/File";
import { Category } from "#models/Category";
import { GenericError } from "#interfaces/error/generic";

type SortOrder = "ASC" | "DESC";

interface BusinessCreateBody {
	name: string;
	slug?: string;
	logo_id?: string | null;
	rating?: number | null;
	address?: string | null;
	phone?: string | null;
	website?: string | null;
	industry_ids?: string[] | null;
}

type BusinessUpdateBody = Partial<BusinessCreateBody>;

interface ListPayload {
	page?: unknown;
	pageSize?: unknown;
	sortField?: unknown;
	sortOrder?: unknown;
	filters?: unknown;
}

interface FileSummary {
	id: string;
	path: string;
}

type BusinessPlainWithAssociations = BusinessAttributes & {
	logo?: File | null;
};

type BusinessResponse = Omit<BusinessAttributes, "logo_id" | "rating" | "industry_ids"> & {
	rating: number | null;
	industry_ids: string[];
	logo: FileSummary | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIETNAMESE_TONE_REGEX = /[\u0300-\u036f]/g;

const INDUSTRY_IDS_MAX = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (obj: Record<string, unknown>, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(obj, key);

const assertUuid = (value: unknown, field: string): string => {
	if (typeof value !== "string" || !UUID_REGEX.test(value)) {
		throw new GenericError(
			{ vi: `${field} không hợp lệ`, en: `${field} is invalid` },
			"BAD_REQUEST",
			400,
			{ field, value },
		);
	}

	return value;
};

const toTrimmedString = (
	value: unknown,
	field: string,
	opts?: { allowEmpty?: boolean; max?: number },
): string => {
	if (typeof value !== "string") {
		throw new GenericError(
			{ vi: `${field} không hợp lệ`, en: `${field} is invalid` },
			"BAD_REQUEST",
			400,
			{ field, value },
		);
	}

	const trimmed = value.trim();

	if (!opts?.allowEmpty && trimmed.length === 0) {
		throw new GenericError(
			{ vi: `${field} không được rỗng`, en: `${field} must not be empty` },
			"BAD_REQUEST",
			400,
			{ field },
		);
	}

	if (typeof opts?.max === "number" && trimmed.length > opts.max) {
		throw new GenericError(
			{ vi: `${field} vượt quá độ dài cho phép`, en: `${field} exceeds maximum length` },
			"BAD_REQUEST",
			400,
			{ field, max: opts.max },
		);
	}

	return trimmed;
};

const toNullableString = (value: unknown, field: string, max: number): string | null => {
	if (value === null || typeof value === "undefined") return null;

	if (typeof value !== "string") {
		throw new GenericError(
			{ vi: `${field} không hợp lệ`, en: `${field} is invalid` },
			"BAD_REQUEST",
			400,
			{ field, value },
		);
	}

	const trimmed = value.trim();

	if (trimmed.length === 0) return null;

	if (trimmed.length > max) {
		throw new GenericError(
			{ vi: `${field} vượt quá độ dài cho phép`, en: `${field} exceeds maximum length` },
			"BAD_REQUEST",
			400,
			{ field, max },
		);
	}

	return trimmed;
};

const toNullableRating = (value: unknown): number | null => {
	if (value === null || typeof value === "undefined" || value === "") return null;

	const rating = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

	if (!Number.isFinite(rating)) {
		throw new GenericError(
			{ vi: "rating không hợp lệ", en: "rating is invalid" },
			"BAD_REQUEST",
			400,
			{ value },
		);
	}

	if (rating < 0 || rating > 5) {
		throw new GenericError(
			{ vi: "rating phải từ 0 đến 5", en: "rating must be between 0 and 5" },
			"BAD_REQUEST",
			400,
			{ value },
		);
	}

	return rating;
};

const normalizeIndustryIdsForResponse = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];

	const seen = new Set<string>();
	const result: string[] = [];

	for (const item of value) {
		if (typeof item !== "string") continue;
		if (!UUID_REGEX.test(item)) continue;
		if (seen.has(item)) continue;

		seen.add(item);
		result.push(item);
	}

	return result;
};

const normalizeSortOrder = (value: unknown): SortOrder | null => {
	if (typeof value !== "string") return null;

	const normalized = value.trim().toUpperCase();

	if (normalized === "ASC" || normalized === "DESC") return normalized;

	return null;
};

const toPositiveInt = (value: unknown, fallback: number): number => {
	const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;

	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

	return Math.floor(parsed);
};

const toNumberOrNull = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;

	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
};

const toUuidArray = (value: unknown, field: string, max: number): string[] => {
	if (!Array.isArray(value)) {
		throw new GenericError(
			{ vi: `${field} không hợp lệ`, en: `${field} is invalid` },
			"BAD_REQUEST",
			400,
			{ field, value },
		);
	}

	if (value.length > max) {
		throw new GenericError(
			{ vi: `${field} vượt quá số lượng cho phép`, en: `${field} exceeds maximum items` },
			"BAD_REQUEST",
			400,
			{ field, max },
		);
	}

	const seen = new Set<string>();
	const result: string[] = [];

	for (const item of value) {
		const id = assertUuid(item, field);

		if (seen.has(id)) continue;

		seen.add(id);
		result.push(id);
	}

	return result;
};

const normalizeNullableUuidArrayForResponse = (value: unknown): string[] | null => {
	if (value === null || typeof value === "undefined") return null;
	if (!Array.isArray(value)) return null;

	const seen = new Set<string>();
	const result: string[] = [];

	for (const item of value) {
		if (typeof item !== "string") continue;
		if (!UUID_REGEX.test(item)) continue;
		if (seen.has(item)) continue;

		seen.add(item);
		result.push(item);
	}

	return result;
};

const assertIndustryCategoriesExist = async (ids: string[]): Promise<void> => {
	if (ids.length === 0) return;

	const found = await Category.findAll({
		where: {
			id: {
				[Op.in]: ids,
			},
			type: "industry",
		},
		attributes: ["id"],
	});

	const found_set = new Set(found.map((item) => item.id));
	const invalid_ids = ids.filter((id) => !found_set.has(id));

	if (invalid_ids.length > 0) {
		throw new GenericError(
			{
				vi: "industry_ids chỉ chấp nhận category có type = industry",
				en: "industry_ids must be categories with type = industry",
			},
			"BAD_REQUEST",
			400,
			{
				field: "industry_ids",
				invalid_ids,
			},
		);
	}
};

const removeVietnameseTones = (input: string): string => {
	return input
		.normalize("NFKD")
		.replace(VIETNAMESE_TONE_REGEX, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D");
};

const slugify = (input: string): string => {
	const cleaned = removeVietnameseTones(input).toLowerCase().trim();

	return cleaned
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
};

const normalizeSlug = (raw: string): string => {
	const normalized = slugify(raw);

	if (!normalized) {
		throw new GenericError(
			{ vi: "Slug không hợp lệ", en: "Invalid slug" },
			"BAD_REQUEST",
			400,
		);
	}

	return normalized;
};

const logo_include: Includeable = {
	model: File,
	as: "logo",
	required: false,
	attributes: ["id", "path"],
};

const buildFileSummary = (file: File | null): FileSummary | null => {
	if (!file) return null;

	return {
		id: file.id,
		path: file.path,
	};
};

const getLogoFromBusiness = (business: Business): File | null => {
	const maybe = business as unknown as { logo?: File | null };
	return maybe.logo ?? null;
};

const toPlainBusinessWithoutAssociations = (business: Business): BusinessAttributes => {
	const raw = business.toJSON() as unknown as BusinessPlainWithAssociations;
	const { logo: _logo, ...rest } = raw;

	return rest;
};

const toBusinessResponse = (business: Business): BusinessResponse => {
	const plain = toPlainBusinessWithoutAssociations(business);
	const logo = buildFileSummary(getLogoFromBusiness(business));

	return {
		...plain,
		rating: toNumberOrNull((plain as { rating?: unknown }).rating),
		industry_ids: normalizeIndustryIdsForResponse((plain as { industry_ids?: unknown }).industry_ids),
		logo,
	};
};

const assertFileExists = async (file_id: string, field: string): Promise<void> => {
	const file = await File.findByPk(file_id, {
		attributes: ["id"],
	});

	if (!file) {
		throw new GenericError(
			{ vi: `${field} không tồn tại`, en: `${field} not found` },
			"NOT_FOUND",
			404,
			{
				field,
				id: file_id,
			},
		);
	}
};

const buildUniqueSlug = async (base: string): Promise<string> => {
	const normalized = normalizeSlug(base);

	const existed = await Business.count({
		where: {
			slug: normalized,
		},
	});

	if (existed === 0) return normalized;

	for (let index = 2; index <= 50; index += 1) {
		const candidate = `${normalized}-${index}`;

		// eslint-disable-next-line no-await-in-loop
		const count = await Business.count({
			where: {
				slug: candidate,
			},
		});

		if (count === 0) return candidate;
	}

	throw new GenericError(
		{ vi: "Không thể tạo slug duy nhất", en: "Cannot generate unique slug" },
		"CONFLICT",
		409,
		{ slug: normalized },
	);
};

const assertSlugNotTaken = async (slug: string, exclude_id: string): Promise<string> => {
	const normalized = normalizeSlug(slug);

	const existed = await Business.count({
		where: {
			slug: normalized,
			id: {
				[Op.ne]: exclude_id,
			},
		},
	});

	if (existed > 0) {
		throw new GenericError(
			{ vi: "Slug đã tồn tại", en: "Slug already exists" },
			"CONFLICT",
			409,
			{ slug: normalized },
		);
	}

	return normalized;
};

const allowed_sort_fields: ReadonlyArray<keyof BusinessAttributes> = [
	"updated_at",
	"created_at",
	"name",
	"slug",
	"rating",
	"logo_id",
];

const normalizeSortField = (value: unknown): keyof BusinessAttributes => {
	if (typeof value !== "string") return "updated_at";

	const normalized = value.trim() as keyof BusinessAttributes;

	return allowed_sort_fields.includes(normalized) ? normalized : "updated_at";
};

const parseCreateBody = (input: unknown): BusinessCreateBody => {
	if (!isRecord(input)) {
		throw new GenericError(
			{ vi: "Body không hợp lệ", en: "Invalid body" },
			"BAD_REQUEST",
			400,
		);
	}

	const name = toTrimmedString(input.name, "name", { max: 255 });

	const body: BusinessCreateBody = { name };

	if (hasOwn(input, "slug")) body.slug = toTrimmedString(input.slug, "slug", { max: 255 });

	if (hasOwn(input, "logo_id")) {
		if (input.logo_id === null) body.logo_id = null;
		else body.logo_id = assertUuid(input.logo_id, "logo_id");
	}

	if (hasOwn(input, "rating")) body.rating = toNullableRating(input.rating);
	if (hasOwn(input, "address")) body.address = toNullableString(input.address, "address", 500);
	if (hasOwn(input, "phone")) body.phone = toNullableString(input.phone, "phone", 30);
	if (hasOwn(input, "website")) body.website = toNullableString(input.website, "website", 255);

	if (hasOwn(input, "industry_ids")) {
		if (input.industry_ids === null) body.industry_ids = null;
		else body.industry_ids = toUuidArray(input.industry_ids, "industry_ids", INDUSTRY_IDS_MAX);
	}

	return body;
};

const parseUpdateBody = (input: unknown): BusinessUpdateBody => {
	if (!isRecord(input)) {
		throw new GenericError(
			{ vi: "Body không hợp lệ", en: "Invalid body" },
			"BAD_REQUEST",
			400,
		);
	}

	const patch: BusinessUpdateBody = {};

	if (hasOwn(input, "name")) patch.name = toTrimmedString(input.name, "name", { max: 255 });
	if (hasOwn(input, "slug")) patch.slug = toTrimmedString(input.slug, "slug", { max: 255 });

	if (hasOwn(input, "logo_id")) {
		if (input.logo_id === null) patch.logo_id = null;
		else patch.logo_id = assertUuid(input.logo_id, "logo_id");
	}

	if (hasOwn(input, "rating")) patch.rating = toNullableRating(input.rating);
	if (hasOwn(input, "address")) patch.address = toNullableString(input.address, "address", 500);
	if (hasOwn(input, "phone")) patch.phone = toNullableString(input.phone, "phone", 30);
	if (hasOwn(input, "website")) patch.website = toNullableString(input.website, "website", 255);

	if (hasOwn(input, "industry_ids")) {
		if (input.industry_ids === null) patch.industry_ids = null;
		else patch.industry_ids = toUuidArray(input.industry_ids, "industry_ids", INDUSTRY_IDS_MAX);
	}

	return patch;
};

export const businessService = {
	async getAll(payload: unknown) {
		const parsed_payload = (payload ?? {}) as ListPayload;

		const page = toPositiveInt(parsed_payload.page, 1);
		const pageSize = toPositiveInt(parsed_payload.pageSize, 10);

		const sortField = normalizeSortField(parsed_payload.sortField);
		const sortOrder = normalizeSortOrder(parsed_payload.sortOrder) ?? "DESC";

		const where = isRecord(parsed_payload.filters)
			? (parsed_payload.filters as WhereOptions<BusinessAttributes>)
			: null;

		const options: FindAndCountOptions<BusinessAttributes> = {
			limit: pageSize,
			offset: (page - 1) * pageSize,
			order: [[String(sortField), sortOrder]],
			include: [logo_include],
		};

		if (where) {
			options.where = where;
		}

		const { rows, count } = await Business.findAndCountAll(options);

		return {
			rows: rows.map((item) => toBusinessResponse(item)),
			count,
			page,
			pageSize,
		};
	},

	async getById(id_raw: unknown): Promise<BusinessResponse> {
		const id = assertUuid(id_raw, "id");

		const business = await Business.findByPk(id, {
			include: [logo_include],
		});

		if (!business) {
			throw new GenericError(
				{ vi: "Business không tồn tại", en: "Business not found" },
				"NOT_FOUND",
				404,
			);
		}

		return toBusinessResponse(business);
	},

	async create(body_raw: unknown, actor_id: string | null): Promise<BusinessResponse> {
		const body = parseCreateBody(body_raw);

		if (body.logo_id) {
			await assertFileExists(body.logo_id, "logo_id");
		}

		if (typeof body.industry_ids !== "undefined" && body.industry_ids !== null) {
			await assertIndustryCategoriesExist(body.industry_ids);
		}

		const slug_input = (body.slug ?? body.name).trim();
		const final_slug = await buildUniqueSlug(slug_input);
		const now = new Date();

		const create_payload: BusinessCreationAttributes = {
			name: body.name,
			slug: final_slug,
			logo_id: typeof body.logo_id === "undefined" ? null : body.logo_id,
			rating: typeof body.rating === "undefined" ? null : body.rating,
			address: typeof body.address === "undefined" ? null : body.address,
			phone: typeof body.phone === "undefined" ? null : body.phone,
			website: typeof body.website === "undefined" ? null : body.website,
			industry_ids: typeof body.industry_ids === "undefined" ? null : body.industry_ids,
			created_at: now,
			created_by: actor_id,
			updated_at: now,
			updated_by: actor_id,
		};

		const created = await Business.create(create_payload);

		const reloaded = await Business.findByPk(created.id, {
			include: [logo_include],
		});

		if (!reloaded) {
			throw new GenericError(
				{
					vi: "Không thể tải lại business sau khi tạo",
					en: "Cannot reload business after create",
				},
				"INTERNAL_SERVER_ERROR",
				500,
			);
		}

		return toBusinessResponse(reloaded);
	},

	async updateById(
		id_raw: unknown,
		body_raw: unknown,
		actor_id: string | null,
	): Promise<BusinessResponse> {
		const id = assertUuid(id_raw, "id");
		const body = parseUpdateBody(body_raw);

		const business = await Business.findByPk(id);

		if (!business) {
			throw new GenericError(
				{ vi: "Business không tồn tại", en: "Business not found" },
				"NOT_FOUND",
				404,
			);
		}

		if (typeof body.logo_id !== "undefined" && body.logo_id) {
			await assertFileExists(body.logo_id, "logo_id");
		}

		const patch: Partial<BusinessAttributes> = {};

		if (typeof body.name !== "undefined") patch.name = body.name.trim();

		if (typeof body.slug !== "undefined") {
			patch.slug = await assertSlugNotTaken(body.slug, id);
		}

		if (typeof body.logo_id !== "undefined") patch.logo_id = body.logo_id ?? null;
		if (typeof body.rating !== "undefined") patch.rating = body.rating ?? null;
		if (typeof body.address !== "undefined") patch.address = body.address ?? null;
		if (typeof body.phone !== "undefined") patch.phone = body.phone ?? null;
		if (typeof body.website !== "undefined") patch.website = body.website ?? null;

		if (typeof body.industry_ids !== "undefined") {
			if (body.industry_ids !== null) {
				await assertIndustryCategoriesExist(body.industry_ids);
			}

			patch.industry_ids = body.industry_ids ?? null;
		}

		patch.updated_at = new Date();
		patch.updated_by = actor_id;

		await business.update(patch);

		const reloaded = await Business.findByPk(id, {
			include: [logo_include],
		});

		if (!reloaded) {
			throw new GenericError(
				{
					vi: "Không thể tải lại business sau khi cập nhật",
					en: "Cannot reload business after update",
				},
				"INTERNAL_SERVER_ERROR",
				500,
			);
		}

		return toBusinessResponse(reloaded);
	},

	async deleteById(id_raw: unknown) {
		const id = assertUuid(id_raw, "id");

		const business = await Business.findByPk(id);

		if (!business) {
			throw new GenericError(
				{ vi: "Business không tồn tại", en: "Business not found" },
				"NOT_FOUND",
				404,
			);
		}

		await business.destroy();

		return { id };
	},
};