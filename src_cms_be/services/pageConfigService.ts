import { Op, Transaction, col } from "sequelize";
import { PageConfig, PageConfigAttributes, PageConfigCreationAttributes } from "#models/PageConfig";
import { GenericError } from "#interfaces/error/generic";
import { pageConfigCategoryService, CategoryIdDto } from "#services/pageConfigCategory";
import { PageConfigProvider } from "#providers/PageConfigProvider";

const txOpt = (transaction?: Transaction) => (transaction ? { transaction } : {});

type CreateInput = {
	code: string;
	name: string;
	static_link: string;
	static_link_en?: string | null;
	parent_id: string;
	sort_order?: number | null;
	is_article?: boolean | null;
	category_ids?: string[];
};

type UpdateInput = Partial<Omit<CreateInput, "parent_id">> & {
	parent_id?: string;
	category_ids?: string[];
};

type PageConfigNode = PageConfigAttributes & {
	children?: PageConfigNode[];
	categories?: CategoryIdDto[];
	// parent_id will be attached for GET hierarchical
	parent_id?: string | null;
};

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const toPlain = (m: PageConfig): PageConfigAttributes =>
	m.toJSON ? (m.toJSON() as PageConfigAttributes) : (m as unknown as PageConfigAttributes);

const findParentOrThrow = async (parentId: string, transaction?: Transaction): Promise<PageConfigAttributes> => {
	const parent = (await PageConfig.findOne({
		where: { id: parentId },
		raw: true,
		...txOpt(transaction),
	})) as unknown as PageConfigAttributes | null;

	if (!parent) {
		throw new GenericError({ vi: "parent_id không tồn tại", en: "parent_id not found" }, "NOT_FOUND", 404);
	}
	return parent;
};

const collectIdsFromTree = (node: PageConfigNode | null | undefined, acc: string[]) => {
	if (!node) return;
	if (typeof node.id === "string" && node.id) acc.push(node.id);

	const children = Array.isArray(node.children) ? node.children : [];
	for (const c of children) collectIdsFromTree(c, acc);
};

type HasSetDataValue = {
	setDataValue: (key: string, value: unknown) => void;
};

const hasSetDataValue = (v: unknown): v is HasSetDataValue => {
	return typeof (v as HasSetDataValue).setDataValue === "function";
};

const setNodeField = (node: PageConfigNode, key: string, value: unknown) => {
	if (hasSetDataValue(node)) {
		node.setDataValue(key, value);
		return;
	}

	const target = node as unknown as Record<string, unknown>;
	target[key] = value;
};

const fetchParentIdMap = async (ids: string[], transaction?: Transaction): Promise<Map<string, string | null>> => {
	const map = new Map<string, string | null>();
	if (ids.length === 0) return map;

	const rows = (await PageConfig.findAll({
		where: { id: { [Op.in]: ids } },
		// Force select DB column parent_id and alias it back to "parent_id"
		attributes: ["id", [col("parent_id"), "parent_id"]],
		raw: true,
		...txOpt(transaction),
	})) as unknown as Array<{ id: string; parent_id: string | null }>;

	for (const r of rows) {
		map.set(r.id, r.parent_id ?? null);
	}

	return map;
};

const attachMetaToTree = (
	node: PageConfigNode,
	parents: Map<string, string | null>,
	categoriesMap: Map<string, CategoryIdDto[]>,
) => {
	const visit = (n: PageConfigNode) => {
		const parentId = parents.get(n.id) ?? null;
		setNodeField(n, "parent_id", parentId);

		const categories = categoriesMap.get(n.id) ?? [];
		setNodeField(n, "categories", categories);

		const children = Array.isArray(n.children) ? n.children : [];
		for (const c of children) visit(c);
	};

	visit(node);
	return node;
};

export const pageConfigService = {
	async create(body: unknown, actorId: string | null) {
		const input = body as unknown as CreateInput;

		if (!isNonEmptyString(input.parent_id)) {
			throw new GenericError({ vi: "parent_id là bắt buộc", en: "parent_id is required" }, "BAD_REQUEST", 400);
		}

		const sequelize = PageConfig.sequelize;
		if (!sequelize) throw new Error("Sequelize instance not found");

		const data = await sequelize.transaction(async (transaction) => {
			const parent = await findParentOrThrow(input.parent_id.trim(), transaction);
			const computedLevel = (parent.level ?? 0) + 1;

			const payload: PageConfigCreationAttributes = {
				code: input.code,
				name: input.name,
				static_link: input.static_link,
				static_link_en: input.static_link_en ?? null,

				parent_id: input.parent_id.trim(),
				level: computedLevel,

				sort_order: input.sort_order ?? null,
				is_article: input.is_article ?? null,

				created_at: new Date(),
				created_by: actorId,
				updated_at: new Date(),
				updated_by: null,
			};

			const created = await PageConfig.create(payload, { transaction });

			await pageConfigCategoryService.updatePageConfigCategories(created.id, input.category_ids, actorId, transaction);

			const fresh = await PageConfig.findByPk(created.id, { transaction });
			if (!fresh) {
				throw new GenericError({ vi: "PageConfig không tồn tại", en: "PageConfig not found" }, "NOT_FOUND", 404);
			}

			const catMap = await pageConfigCategoryService.fetchCategoriesForPageConfigs([created.id], transaction);
			return {
				...toPlain(fresh),
				categories: catMap.get(created.id) ?? [],
			};
		});

		return data;
	},

	async updateById(id: string, body: unknown, actorId: string | null) {
		const input = (body || {}) as unknown as UpdateInput;

		const sequelize = PageConfig.sequelize;
		if (!sequelize) throw new Error("Sequelize instance not found");

		const data = await sequelize.transaction(async (transaction) => {
			const b = (input || {}) as Record<string, unknown>;

			const patch: Partial<PageConfigAttributes> = {
				updated_at: new Date(),
				updated_by: actorId,
			};

			if ("code" in b) patch.code = (b.code as string | null | undefined) ?? null;
			if ("name" in b) patch.name = (b.name as string | null | undefined) ?? null;
			if ("static_link" in b) patch.static_link = (b.static_link as string | null | undefined) ?? null;
			if ("static_link_en" in b) patch.static_link_en = (b.static_link_en as string | null | undefined) ?? null;
			if ("sort_order" in b) patch.sort_order = (b.sort_order as number | null | undefined) ?? null;
			if ("is_article" in b) patch.is_article = (b.is_article as boolean | null | undefined) ?? null;

			if ("parent_id" in b) {
				const nextParentId = b.parent_id;

				if (!isNonEmptyString(nextParentId)) {
					throw new GenericError({ vi: "parent_id không hợp lệ", en: "parent_id is invalid" }, "BAD_REQUEST", 400);
				}
				if (nextParentId.trim() === id) {
					throw new GenericError({ vi: "parent_id không hợp lệ", en: "parent_id is invalid" }, "BAD_REQUEST", 400);
				}

				const parent = await findParentOrThrow(nextParentId.trim(), transaction);
				patch.parent_id = nextParentId.trim();
				patch.level = (parent.level ?? 0) + 1;
			}

			const [affected] = await PageConfig.update(patch, { where: { id }, transaction });
			if (!affected) {
				throw new GenericError({ vi: "PageConfig không tồn tại", en: "PageConfig not found" }, "NOT_FOUND", 404);
			}

			await pageConfigCategoryService.updatePageConfigCategories(id, input.category_ids, actorId, transaction);

			const fresh = await PageConfig.findByPk(id, { transaction });
			if (!fresh) {
				throw new GenericError({ vi: "PageConfig không tồn tại", en: "PageConfig not found" }, "NOT_FOUND", 404);
			}

			const catMap = await pageConfigCategoryService.fetchCategoriesForPageConfigs([id], transaction);
			return {
				...toPlain(fresh),
				categories: catMap.get(id) ?? [],
			};
		});

		return data;
	},

	async deleteById(id: string) {
		const affected = await PageConfig.destroy({ where: { id } });
		if (!affected) {
			throw new GenericError({ vi: "PageConfig không tồn tại", en: "PageConfig not found" }, "NOT_FOUND", 404);
		}
		return true;
	},

	async getHierarchicalWithCategories(options: { id?: string; staticLink?: string; code?: string }) {
		const provider = PageConfigProvider.getInstance();

		const tree = (await provider.getHierarchical(options)) as unknown as PageConfigNode;
		if (!tree) {
			throw new GenericError({ vi: "PageConfig không tồn tại", en: "PageConfig not found" }, "NOT_FOUND", 404);
		}

		const ids: string[] = [];
		collectIdsFromTree(tree, ids);

		const [parentsMap, categoriesMap] = await Promise.all([
			fetchParentIdMap(ids),
			pageConfigCategoryService.fetchCategoriesForPageConfigs(ids),
		]);

		return attachMetaToTree(tree, parentsMap, categoriesMap);
	},
};
