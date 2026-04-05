import { Op, type Includeable, type Order, type WhereOptions, type FindAndCountOptions } from "sequelize";
import type { Req } from "#interfaces/IApi";
import { GenericError } from "#interfaces/error/generic";

import { Category, type CategoryAttributes } from "#models/Category";
import { File } from "#models/File";
import { generateCondition, generateConditionExtra } from "#services/database/build-condition";

import { toCategoryResponse, type CategoryResponseDTO } from "#services/categoryService";

export interface CategoryListDTO {
	count: number;
	page?: number;
	pageSize?: number;
	rows: CategoryResponseDTO[];
}

function buildWhereFromRawFilter(rawFilter: string): WhereOptions<CategoryAttributes> {
	const parts = (rawFilter || "")
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);

	const andConditions: Array<WhereOptions<CategoryAttributes>> = [];

	for (const element of parts) {
		if (element.includes("|")) {
			const orConditions = generateConditionExtra(element);
			if (!orConditions || orConditions.length === 0) continue;
			andConditions.push({ [Op.or]: orConditions } as unknown as WhereOptions<CategoryAttributes>);
			continue;
		}

		const cond = generateCondition(element);
		if (!cond || Object.keys(cond).length === 0) continue;
		andConditions.push(cond as unknown as WhereOptions<CategoryAttributes>);
	}

	if (andConditions.length === 0) return {};
	return { [Op.and]: andConditions } as unknown as WhereOptions<CategoryAttributes>;
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

export async function getAllCategories(req: Req): Promise<CategoryListDTO> {
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

	const where = buildWhereFromRawFilter(rawFilter);
	const include: Includeable[] = [buildThumbnailInclude()];

	const order = buildOrder(sortField, sortOrder);
	const limit = pageSize > 0 ? pageSize : null;
	const offset = pageSize > 0 ? (page - 1) * pageSize : null;

	const options: FindAndCountOptions<CategoryAttributes> = {
		where,
		include,
		subQuery: false,
		...(order ? { order } : {}),
		...(typeof limit === "number" ? { limit } : {}),
		...(typeof offset === "number" ? { offset } : {}),
	};

	const result = await Category.findAndCountAll(options);

	const rows = result.rows.map((r) => toCategoryResponse(r));
	const count = Array.isArray(result.count) ? result.count.length : (result.count as number);

	return {
		count,
		page,
		pageSize,
		rows,
	};
}
