import { FindAttributeOptions, IncludeOptions, Model, ModelStatic, WhereOptions } from "sequelize";

export interface SequelizeApiPaginatePayload<T = unknown> {
	attributes?: FindAttributeOptions;
	pageSize: number;
	page: number;
	sortField: string;
	sortOrder: string;
	filters: WhereOptions<T>;
	rawFilter: string;
	dateField: Array<{
		opType: string;
		indexOp: number;
	}>;
}

export interface QueryOptions<T extends Model<any, any>> {
	model: ModelStatic<T>;
	payload?: SequelizeApiPaginatePayload<T>;
	includeModels?: IncludeOptions[];
	isHierarchy?: boolean;
	raw?: boolean;
	nest?: boolean;
	distinct?: boolean;
	subQuery?: unknown;
}
