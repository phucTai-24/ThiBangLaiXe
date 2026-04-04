import type { FindAndCountOptions, Order, WhereOptions } from "sequelize";
import { Position, type PositionAttributes } from "#models/Position";
import { GenericError } from "#interfaces/error/generic";

type SortOrder = "ASC" | "DESC";

interface QueryPayload {
	page?: number;
	pageSize?: number;
	sortField?: string;
	sortOrder?: string | null;
	filters?: WhereOptions<PositionAttributes>;
}

interface PositionCreateDto {
	name: string;
}

interface PositionUpdateDto {
	name?: string;
}

const normalizeSortOrder = (value: string | null | undefined): SortOrder => {
	if (!value) return "DESC";
	return value.toUpperCase() === "ASC" ? "ASC" : "DESC";
};

const buildOrder = (payload: QueryPayload): Order => {
	if (payload.sortField && payload.sortField.trim()) {
		return [[payload.sortField.trim(), normalizeSortOrder(payload.sortOrder)]];
	}
	return [["updated_at", "DESC"]];
};

export const positionService = {
	async getAll(payload: QueryPayload) {
		const page = Math.max(1, Number(payload.page ?? 1));
		const pageSize = Math.max(1, Number(payload.pageSize ?? 10));
		const offset = (page - 1) * pageSize;

		const options: FindAndCountOptions<PositionAttributes> = {
			limit: pageSize,
			offset,
			order: buildOrder(payload),
		};

		if (payload.filters) {
			options.where = payload.filters;
		}

		const result = await Position.findAndCountAll(options);

		return {
			rows: result.rows,
			count: result.count,
			page,
			pageSize,
		};
	},

	async getById(id: string) {
		const record = await Position.findByPk(id);
		if (!record) {
			throw new GenericError({ vi: "Position không tồn tại", en: "Position not found" }, "NOT_FOUND", 404);
		}
		return record;
	},

	async create(data: PositionCreateDto, actorId: string | null) {
		return Position.create({
			name: data.name,
			created_by: actorId,
			updated_by: actorId,
			created_at: new Date(),
			updated_at: new Date(),
		});
	},

	async updateById(id: string, data: PositionUpdateDto, actorId: string | null) {
		const record = await Position.findByPk(id);
		if (!record) {
			throw new GenericError({ vi: "Position không tồn tại", en: "Position not found" }, "NOT_FOUND", 404);
		}

		await record.update({
			...data,
			updated_at: new Date(),
			updated_by: actorId,
		});

		return record;
	},

	async deleteById(id: string) {
		const record = await Position.findByPk(id);
		if (!record) {
			throw new GenericError({ vi: "Position không tồn tại", en: "Position not found" }, "NOT_FOUND", 404);
		}

		await record.destroy();
		return { id };
	},
};
