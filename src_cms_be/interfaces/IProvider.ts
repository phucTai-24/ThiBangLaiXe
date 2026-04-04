import { FindAttributeOptions, IncludeOptions, Model, WhereOptions } from "sequelize";

export type BaseQueryOptions<ModelInterface extends Model<any, any>> = {
	where?: WhereOptions<ModelInterface> | null;
	filters?: WhereOptions<ModelInterface> | null;
	include?: IncludeOptions[];
	attributes?: FindAttributeOptions;
};

export type PaginationOptions = {
	page?: number;
	pageSize?: number;
	sortField?: string;
	sortOrder?: string;
};

export type ExtraQueryOptions = {
	raw?: boolean;
	nest?: boolean;
	distinct?: boolean;
	subQuery?: boolean;
};

export type FindManyOptions<ModelInterface extends Model<any, any>> = BaseQueryOptions<ModelInterface> &
	PaginationOptions &
	ExtraQueryOptions;

// Return
export type FindManyReturnModel<ModelInterface extends Model<any, any>> = {
	count: number;
	rows: ModelInterface[];
	page?: number;
	pageSize?: number;
};
