import {
	FindAndCountOptions,
	ForeignKeyConstraintError,
	Transaction,
	UniqueConstraintError,
	type OrderItem,
	type Sequelize,
	type WhereOptions,
} from "sequelize";
import { GenericError } from "#interfaces/error/generic";
import { File } from "#models/File";
import { Logo, type LogoAttributes, type LogoCreationAttributes } from "#models/Logo";

type SortOrder = "ASC" | "DESC";

interface ListPayload {
	page?: unknown;
	pageSize?: unknown;
	sortField?: unknown;
	sortOrder?: unknown;
	filters?: unknown;
	rawFilter?: unknown;
}

export interface LogoFileDTO {
	id: string;
	path: string;
	original: string;
	mime: string;
}

export type LogoResponseDTO = Omit<LogoAttributes, "file_id"> & {
	file_id: LogoFileDTO | null;
};

export interface LogoListResponseDTO {
	rows: LogoResponseDTO[];
	count: number;
	page: number;
	pageSize: number;
}

export interface LogoCreateDTO {
	logo_name: string;
	description?: string | null;
	file_id: string;
}

export interface LogoUpdateDTO {
	logo_name?: string;
	description?: string | null;
	file_id?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_FIELD = "created_at";
const DEFAULT_SORT_ORDER: SortOrder = "DESC";

const SORTABLE_FIELDS = new Set<keyof LogoAttributes>([
	"id",
	"logo_name",
	"file_id",
	"created_at",
	"updated_at",
]);

const is_record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const normalize_nullable_text = (value: string | null | undefined): string | null => {
	if (typeof value === "undefined" || value === null) return null;

	const trimmed_value = value.trim();
	return trimmed_value.length > 0 ? trimmed_value : null;
};

const normalize_page = (value: unknown): number => {
	if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
		return DEFAULT_PAGE;
	}

	return Math.floor(value);
};

const normalize_page_size = (value: unknown): number => {
	if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
		return DEFAULT_PAGE_SIZE;
	}

	return Math.min(Math.floor(value), MAX_PAGE_SIZE);
};

const normalize_sort_order = (value: unknown): SortOrder => {
	if (typeof value !== "string") return DEFAULT_SORT_ORDER;

	const upper_value = value.toUpperCase();
	return upper_value === "ASC" ? "ASC" : "DESC";
};

const normalize_sort_field = (value: unknown): keyof LogoAttributes => {
	if (typeof value !== "string") return DEFAULT_SORT_FIELD as keyof LogoAttributes;
	if (!SORTABLE_FIELDS.has(value as keyof LogoAttributes)) {
		return DEFAULT_SORT_FIELD as keyof LogoAttributes;
	}

	return value as keyof LogoAttributes;
};

const normalize_where = (value: unknown): WhereOptions<LogoAttributes> | undefined => {
	if (!is_record(value)) return undefined;
	return value as WhereOptions<LogoAttributes>;
};

const build_file_dto = (input: unknown): LogoFileDTO | null => {
	if (!is_record(input)) return null;

	const id = typeof input.id === "string" ? input.id : "";
	const path = typeof input.path === "string" ? input.path : "";
	const original = typeof input.original === "string" ? input.original : "";
	const mime = typeof input.mime === "string" ? input.mime : "";

	if (!id || !path || !original || !mime) return null;

	return {
		id,
		path,
		original,
		mime,
	};
};

export const to_logo_response = (logo: Logo): LogoResponseDTO => {
	const plain_logo = logo.get({ plain: true }) as unknown;

	if (!is_record(plain_logo)) {
		throw new GenericError(
			{ vi: "Dữ liệu logo không hợp lệ", en: "Invalid logo data" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	const file_raw = plain_logo.file;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { file: _file, file_id: _file_id, ...rest } = plain_logo;

	return {
		...(rest as Omit<LogoAttributes, "file_id">),
		file_id: build_file_dto(file_raw),
	};
};

const file_include = {
	model: File,
	as: "file",
	required: false,
	attributes: ["id", "path", "original", "mime"],
};

const get_sequelize = (): Sequelize => {
	const sequelize = Logo.sequelize;

	if (!sequelize) {
		throw new Error("Sequelize instance not found");
	}

	return sequelize;
};

const assert_logo_exists = async (
	id: string,
	transaction?: Transaction,
): Promise<Logo> => {
	const logo = await Logo.findByPk(id, {
		transaction: transaction || null,
	});

	if (!logo) {
		throw new GenericError(
			{ vi: "Logo không tồn tại", en: "Logo not found" },
			"NOT_FOUND",
			404,
		);
	}

	return logo;
};

const assert_file_exists = async (
	file_id: string,
	transaction: Transaction,
): Promise<void> => {
	const file = await File.findByPk(file_id, {
		attributes: ["id", "mime"],
		transaction: transaction || null,
	});

	if (!file) {
		throw new GenericError(
			{ vi: "file_id không tồn tại", en: "file_id not found" },
			"NOT_FOUND",
			404,
			{
				field: "file_id",
				id: file_id,
			},
		);
	}

	if (!file.mime.startsWith("image/")) {
		throw new GenericError(
			{ vi: "file_id phải là file ảnh", en: "file_id must be an image file" },
			"BAD_REQUEST",
			400,
			{
				field: "file_id",
				id: file_id,
				mime: file.mime,
			},
		);
	}
};

const normalize_create_payload = (body: LogoCreateDTO): LogoCreationAttributes => {
	return {
		logo_name: body.logo_name.trim(),
		description: normalize_nullable_text(body.description),
		file_id: body.file_id,
	};
};

const normalize_update_payload = (body: LogoUpdateDTO): Partial<LogoAttributes> => {
	const update_data: Partial<LogoAttributes> = {};

	if (typeof body.logo_name !== "undefined") {
		update_data.logo_name = body.logo_name.trim();
	}

	if (typeof body.description !== "undefined") {
		update_data.description = normalize_nullable_text(body.description);
	}

	if (typeof body.file_id !== "undefined") {
		update_data.file_id = body.file_id;
	}

	return update_data;
};

const build_order = (payload: ListPayload): OrderItem[] => {
	const sort_field = normalize_sort_field(payload.sortField);
	const sort_order = normalize_sort_order(payload.sortOrder);

	return [[sort_field, sort_order]];
};

const reload_logo_or_throw = async (
	id: string,
	transaction: Transaction,
): Promise<Logo> => {
	const reloaded_logo = await Logo.findByPk(id, {
		transaction: transaction || null,
		include: [file_include],
	});

	if (!reloaded_logo) {
		throw new GenericError(
			{ vi: "Không thể tải lại logo sau khi thao tác", en: "Cannot reload logo after operation" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return reloaded_logo;
};

const handle_sequelize_error = (error: unknown): never => {
	if (error instanceof UniqueConstraintError) {
		throw new GenericError(
			{ vi: "Dữ liệu logo bị trùng", en: "Duplicate logo data" },
			"CONFLICT",
			409,
			{
				fields: error.fields,
			},
		);
	}

	if (error instanceof ForeignKeyConstraintError) {
		throw new GenericError(
			{ vi: "Dữ liệu đang được sử dụng, không thể thao tác", en: "Data is in use, cannot perform action" },
			"CONFLICT",
			409,
			{
				table: error.table,
				fields: error.fields,
			},
		);
	}

	throw error;
};

export const logoService = {
	async getAll(payload: ListPayload = {}): Promise<LogoListResponseDTO> {
	const page = normalize_page(payload.page);
	const page_size = normalize_page_size(payload.pageSize);
	const where = normalize_where(payload.filters);
	const order = build_order(payload);

	const find_options: FindAndCountOptions<LogoAttributes> = {
		include: [file_include],
		distinct: true,
		limit: page_size,
		offset: (page - 1) * page_size,
		order,
	};

	if (where) {
		find_options.where = where;
	}

	const { rows, count } = await Logo.findAndCountAll(find_options);

	return {
		rows: rows.map((logo) => to_logo_response(logo)),
		count,
		page,
		pageSize: page_size,
	};
},

	async getById(id: string, transaction?: Transaction): Promise<LogoResponseDTO> {
		const logo = await Logo.findByPk(id, {
			transaction: transaction || null,
			include: [file_include],
		});

		if (!logo) {
			throw new GenericError(
				{ vi: "Logo không tồn tại", en: "Logo not found" },
				"NOT_FOUND",
				404,
			);
		}

		return to_logo_response(logo);
	},

	async create(
		body: LogoCreateDTO,
		actorId: string | null,
	): Promise<LogoResponseDTO> {
		const sequelize = get_sequelize();

		try {
			return await sequelize.transaction(async (transaction: Transaction) => {
				const payload = normalize_create_payload(body);

				await assert_file_exists(payload.file_id, transaction);

				const created_logo = await Logo.create(
					{
						...payload,
						created_at: new Date(),
						created_by: actorId,
						updated_at: new Date(),
						updated_by: actorId,
					},
					{
						transaction: transaction || null,
					},
				);

				const reloaded_logo = await reload_logo_or_throw(created_logo.id, transaction);
				return to_logo_response(reloaded_logo);
			});
		} catch (error) {
			return handle_sequelize_error(error);
		}
	},

	async updateById(
		id: string,
		body: LogoUpdateDTO,
		actorId: string | null,
	): Promise<LogoResponseDTO> {
		const sequelize = get_sequelize();

		try {
			return await sequelize.transaction(async (transaction: Transaction) => {
				const logo = await assert_logo_exists(id, transaction);

				if (typeof body.file_id !== "undefined") {
					await assert_file_exists(body.file_id, transaction);
				}

				const update_data = normalize_update_payload(body);

				if (Object.keys(update_data).length === 0) {
					throw new GenericError(
						{ vi: "Phải có ít nhất một trường để cập nhật", en: "At least one field is required to update" },
						"BAD_REQUEST",
						400,
					);
				}

				await logo.update(
					{
						...update_data,
						updated_at: new Date(),
						updated_by: actorId,
					},
					{
						transaction: transaction || null,
					},
				);

				const reloaded_logo = await reload_logo_or_throw(id, transaction);
				return to_logo_response(reloaded_logo);
			});
		} catch (error) {
			return handle_sequelize_error(error);
		}
	},

	async deleteById(id: string, transaction?: Transaction): Promise<boolean> {
		try {
			const logo = await assert_logo_exists(id, transaction);

			await logo.destroy({
				transaction: transaction || null,
			});

			return true;
		} catch (error) {
			return handle_sequelize_error(error);
		}
	},
};