import { Op, Transaction } from "sequelize";
import { GenericError } from "#interfaces/error/generic";
import { Category, type CategoryAttributes } from "#models/Category";
import { PageConfigCategory } from "#models/PageConfigCategory";

export type CategoryType = CategoryAttributes["type"]; // "post" | "trade" | "industry" | "page"

// Compact response: categories is a list of UUIDs
export type CategoryIdDto = string;

const ALLOWED_PAGECONFIG_CATEGORY_TYPES: ReadonlyArray<CategoryType> = ["post"];

const uniq = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const txOpt = (transaction?: Transaction) => (transaction ? { transaction } : {});

const ensureCategoriesExistAndValid = async (
	categoryIds: string[],
	transaction?: Transaction,
): Promise<{ ids: string[]; type: CategoryType | null }> => {
	const ids = uniq(categoryIds);
	if (ids.length === 0) return { ids, type: null };

	const categories = await Category.findAll({
		where: { id: { [Op.in]: ids } },
		attributes: ["id", "type"],
		...txOpt(transaction),
	});

	const found = new Set(categories.map((c) => c.id));
	const missing = ids.filter((id) => !found.has(id));
	if (missing.length > 0) {
		throw new GenericError({ vi: "Category không tồn tại", en: "Category not found" }, "NOT_FOUND", 404, { missing });
	}

	const typeSet = new Set(categories.map((c) => c.type as CategoryType));
	if (typeSet.size > 1) {
		throw new GenericError(
			{ vi: "Các category phải cùng loại", en: "All categories must be of the same type" },
			"BAD_REQUEST",
			400,
			{ types: Array.from(typeSet) },
		);
	}

	const type = (categories[0]?.type as CategoryType) ?? null;
	if (type && !ALLOWED_PAGECONFIG_CATEGORY_TYPES.includes(type)) {
		throw new GenericError(
			{ vi: "Category type không hợp lệ cho pageConfig", en: "Category type is not allowed for pageConfig" },
			"BAD_REQUEST",
			400,
			{ allowedTypes: ALLOWED_PAGECONFIG_CATEGORY_TYPES, receivedType: type },
		);
	}

	return { ids, type };
};

export const pageConfigCategoryService = {
	async fetchCategoriesForPageConfigs(
		pageConfigIds: string[],
		transaction?: Transaction,
	): Promise<Map<string, CategoryIdDto[]>> {
		const ids = uniq(pageConfigIds);
		const map = new Map<string, CategoryIdDto[]>();
		if (ids.length === 0) return map;

		// Only retrieve category_id from pivot table for simplicity (no need to join Category)
		const rows = await PageConfigCategory.findAll({
			where: { page_config_id: { [Op.in]: ids } },
			attributes: ["page_config_id", "category_id"],
			...txOpt(transaction),
		});

		for (const r of rows) {
			const key = r.page_config_id;
			const current = map.get(key) ?? [];
			current.push(r.category_id);
			map.set(key, current);
		}

		return map;
	},

	// Replace mapping neu category_ids duoc truyen (giong post)
	async updatePageConfigCategories(
		pageConfigId: string,
		categoryIds: unknown,
		actorId: string | null,
		transaction: Transaction,
	): Promise<void> {
		// Not provided -> do nothing
		if (typeof categoryIds === "undefined") return;

		if (!Array.isArray(categoryIds)) {
			throw new GenericError({ vi: "category_ids không hợp lệ", en: "category_ids is invalid" }, "BAD_REQUEST", 400);
		}

		const ids = categoryIds.filter((x): x is string => typeof x === "string");
		const { ids: validIds } = await ensureCategoriesExistAndValid(ids, transaction);

		// clear all
		await PageConfigCategory.destroy({
			where: { page_config_id: pageConfigId },
			transaction,
		});

		// provided as [] -> done
		if (validIds.length === 0) return;

		await PageConfigCategory.bulkCreate(
			validIds.map((cid) => ({
				page_config_id: pageConfigId,
				category_id: cid,
				created_at: new Date(),
				created_by: actorId,
			})),
			{ transaction },
		);
	},
};
