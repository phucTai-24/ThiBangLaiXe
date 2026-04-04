import {
	ForeignKeyConstraintError,
	Transaction,
	UniqueConstraintError,
	type Sequelize,
	type ValidationErrorItem,
} from "sequelize";
import { Category, type CategoryAttributes, type CategoryCreationAttributes } from "#models/Category";
import { File } from "#models/File";
import { GenericError } from "#interfaces/error/generic";

export interface ThumbnailDTO {
	id: string;
	path: string;
	original: string;
	mime: string;
}

export type CategoryResponseDTO = Omit<CategoryAttributes, "thumbnail_id"> & {
	thumbnail: ThumbnailDTO | null;
};

export type CategoryType = CategoryAttributes["type"]; // "post" | "industry" | "trade" | "page"

export interface CategoryCreateDTO {
	name: string;
	slug: string;
	type: CategoryType;
	url?: string | null;
	thumbnail_id?: string | null;
}

export interface CategoryUpdateDTO {
	name?: string;
	slug?: string;
	type?: CategoryType;
	url?: string | null;
	thumbnail_id?: string | null;
}

const is_record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const build_thumbnail_dto = (input: unknown): ThumbnailDTO | null => {
	if (!is_record(input)) return null;

	const id = typeof input.id === "string" ? input.id : "";
	const path = typeof input.path === "string" ? input.path : "";
	const original = typeof input.original === "string" ? input.original : "";
	const mime = typeof input.mime === "string" ? input.mime : "";

	if (!id || !path) return null;
	return { id, path, original, mime };
};

export const toCategoryResponse = (category: Category): CategoryResponseDTO => {
	const plain = category.get({ plain: true }) as unknown;

	if (!is_record(plain)) {
		throw new GenericError(
			{ vi: "Dữ liệu category không hợp lệ", en: "Invalid category data" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	const thumbnail_raw = plain.thumbnail;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { thumbnail_id: _thumbnail_id, thumbnail: _thumb, ...rest } = plain;

	return {
		...(rest as unknown as Omit<CategoryAttributes, "thumbnail_id">),
		thumbnail: build_thumbnail_dto(thumbnail_raw),
	};
};

const thumbnail_include = {
	model: File,
	as: "thumbnail",
	required: false,
	attributes: ["id", "path", "original", "mime"],
};

const get_sequelize = (): Sequelize => {
	const sequelize = Category.sequelize;
	if (!sequelize) throw new Error("Sequelize instance not found");
	return sequelize;
};

const assert_file_exists = async (file_id: string, field: string, transaction: Transaction) => {
	const file = await File.findByPk(file_id, { attributes: ["id"], transaction });
	if (!file) {
		throw new GenericError({ vi: `${field} không tồn tại`, en: `${field} not found` }, "NOT_FOUND", 404, {
			field,
			id: file_id,
		});
	}
};

const throw_slug_conflict = (): never => {
	throw new GenericError({ vi: "Slug đã tồn tại", en: "Slug already exists" }, "BAD_REQUEST", 400, { field: "slug" });
};

const has_slug_unique_error = (error: UniqueConstraintError): boolean => {
	const fields = error.fields ?? {};
	if (Object.prototype.hasOwnProperty.call(fields, "slug")) return true;

	const items: ValidationErrorItem[] = error.errors ?? [];
	return items.some((e) => e.path === "slug");
};

const handle_sequelize_error = (error: unknown): never => {
	if (error instanceof UniqueConstraintError && has_slug_unique_error(error)) {
		throw_slug_conflict();
	}

	if (error instanceof ForeignKeyConstraintError) {
		throw new GenericError(
			{ vi: "Dữ liệu đang được sử dụng, không thể thao tác", en: "Data is in use, cannot perform action" },
			"CONFLICT",
			409,
			{ table: error.table, fields: error.fields },
		);
	}

	throw error;
};

const normalize_create_payload = (body: CategoryCreateDTO): CategoryCreationAttributes => {
	return {
		name: body.name,
		slug: body.slug,
		type: body.type,
		url: typeof body.url === "undefined" ? null : body.url,
		thumbnail_id: typeof body.thumbnail_id === "undefined" ? null : body.thumbnail_id,
	};
};

const normalize_update_payload = (body: CategoryUpdateDTO): Partial<CategoryAttributes> => {
	const update_data: Partial<CategoryAttributes> = {};

	if (typeof body.name !== "undefined") update_data.name = body.name;
	if (typeof body.slug !== "undefined") update_data.slug = body.slug;
	if (typeof body.type !== "undefined") update_data.type = body.type;
	if (typeof body.url !== "undefined") update_data.url = body.url;
	if (typeof body.thumbnail_id !== "undefined") update_data.thumbnail_id = body.thumbnail_id;

	return update_data;
};

export const categoryService = {
	async getById(id: string): Promise<CategoryResponseDTO> {
		const category = await Category.findByPk(id, { include: [thumbnail_include] });

		if (!category) {
			throw new GenericError({ vi: "Category không tồn tại", en: "Category not found" }, "NOT_FOUND", 404);
		}

		return toCategoryResponse(category);
	},

	async create(body: CategoryCreateDTO, actorId: string | null): Promise<CategoryResponseDTO> {
		const sequelize = get_sequelize();

		try {
			return await sequelize.transaction(async (transaction: Transaction) => {
				const payload = normalize_create_payload(body);

				if (typeof payload.thumbnail_id === "string" && payload.thumbnail_id) {
					await assert_file_exists(payload.thumbnail_id, "thumbnail_id", transaction);
				}

				const created = await Category.create(
					{
						...payload,
						created_at: new Date(),
						created_by: actorId,
						updated_at: new Date(),
						updated_by: actorId,
					},
					{ transaction },
				);

				const reloaded = await Category.findByPk(created.id, { transaction, include: [thumbnail_include] });
				if (!reloaded) {
					throw new GenericError(
						{ vi: "Không thể tải lại category sau khi tạo", en: "Cannot reload category after create" },
						"INTERNAL_SERVER_ERROR",
						500,
					);
				}

				return toCategoryResponse(reloaded);
			});
		} catch (error) {
			return handle_sequelize_error(error);
		}
	},

	async updateById(id: string, body: CategoryUpdateDTO, actor_id: string | null): Promise<CategoryResponseDTO> {
		const sequelize = get_sequelize();

		try {
			return await sequelize.transaction(async (transaction: Transaction) => {
				const category = await Category.findByPk(id, { transaction });
				if (!category) {
					throw new GenericError({ vi: "Category không tồn tại", en: "Category not found" }, "NOT_FOUND", 404);
				}

				if (typeof body.thumbnail_id !== "undefined" && body.thumbnail_id !== null) {
					if (typeof body.thumbnail_id !== "string") {
						throw new GenericError(
							{ vi: "thumbnail_id không hợp lệ", en: "thumbnail_id is invalid" },
							"BAD_REQUEST",
							400,
						);
					}
					if (body.thumbnail_id) await assert_file_exists(body.thumbnail_id, "thumbnail_id", transaction);
				}

				const update_data = normalize_update_payload(body);

				await category.update(
					{
						...update_data,
						updated_at: new Date(),
						updated_by: actor_id,
					},
					{ transaction },
				);

				const reloaded = await Category.findByPk(id, { transaction, include: [thumbnail_include] });
				if (!reloaded) {
					throw new GenericError(
						{ vi: "Không thể tải lại category sau khi cập nhật", en: "Cannot reload category after update" },
						"INTERNAL_SERVER_ERROR",
						500,
					);
				}

				return toCategoryResponse(reloaded);
			});
		} catch (error) {
			return handle_sequelize_error(error);
		}
	},

	async deleteById(id: string): Promise<boolean> {
		try {
			const category = await Category.findByPk(id);
			if (!category) {
				throw new GenericError({ vi: "Category không tồn tại", en: "Category not found" }, "NOT_FOUND", 404);
			}

			await category.destroy();
			return true;
		} catch (error) {
			return handle_sequelize_error(error);
		}
	},
};
