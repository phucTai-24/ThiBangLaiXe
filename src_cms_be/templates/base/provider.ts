import initExport from "#services/database/sequelize/initExport";
import LoggingService from "#services/file-system-handlers/logService";
import {
	ModelStatic,
	Model,
	CreationAttributes,
	WhereOptions,
	FindAndCountOptions,
	Order,
	FindAttributeOptions,
	Includeable,
	Attributes,
	Transaction,
	BulkCreateOptions,
	UpdateOptions,
	DestroyOptions,
	Op,
} from "sequelize";
import { MeUError } from "#interfaces/IApi";
import { FindManyOptions, FindManyReturnModel } from "#interfaces/IProvider";

// Enhanced cache interface supporting Redis and in-memory
interface CacheService {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, data: T, ttlSeconds?: number): Promise<void>;
	delete(key: string): Promise<void>;
	invalidatePattern(pattern: string): Promise<void>;
}

// Simple in-memory cache for development
class SimpleCache implements CacheService {
	private cache = new Map<string, { data: any; expiry: number }>();

	async get<T>(key: string): Promise<T | null> {
		const item = this.cache.get(key);
		if (!item || Date.now() > item.expiry) {
			this.cache.delete(key);
			return null;
		}
		return item.data;
	}

	async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
		this.cache.set(key, {
			data,
			expiry: Date.now() + ttlSeconds * 1000,
		});
	}

	async delete(key: string): Promise<void> {
		this.cache.delete(key);
	}

	async invalidatePattern(pattern: string): Promise<void> {
		const regex = new RegExp(pattern.replace("*", ".*"));
		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
			}
		}
	}
}

// Redis cache implementation (placeholder - implement based on your Redis setup)
class RedisCache implements CacheService {
	async get<T>(key: string): Promise<T | null> {
		// TODO: Implement Redis get
		return null;
	}

	async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
		// TODO: Implement Redis set
	}

	async delete(key: string): Promise<void> {
		// TODO: Implement Redis delete
	}

	async invalidatePattern(pattern: string): Promise<void> {
		// TODO: Implement Redis pattern invalidation
	}
}

class BaseProvider<ModelInterface extends Model> {
	private db: typeof initExport;
	private key: string;
	private model: ModelStatic<ModelInterface>;
	private logger: LoggingService;
	private cache: CacheService;
	private enableCache: boolean;
	private uniqueFields: string[] = [];
	private enableRedisCache: boolean;

	constructor(
		key: string,
		skipInitDb?: boolean,
		enableCache: boolean = true,
		enableRedisCache: boolean = false,
		uniqueFields: string[] = [],
	) {
		this.key = key;
		this.db = skipInitDb ? ({} as any) : initExport;
		this.model = skipInitDb ? ({} as any) : (this.db as any)[this.key];
		this.logger = new LoggingService();
		this.enableCache = enableCache && process.env.NODE_ENV === "production";
		this.enableRedisCache = enableRedisCache;
		this.uniqueFields = uniqueFields;

		// Initialize appropriate cache service
		this.cache = this.enableRedisCache ? new RedisCache() : new SimpleCache();
	}

	// ==================== CACHE MANAGEMENT ====================

	protected getCacheKey(operation: string, params: any = {}): string {
		try {
			// Create a safe key by limiting size and avoiding circular references
			const safeParams = JSON.stringify(params, (key, value) => {
				if (typeof value === "object" && value !== null) {
					// Limit object depth and size
					return value;
				}
				return value;
			});
			return `${this.key}:${operation}:${safeParams}`.substring(0, 200); // Limit key length
		} catch (error) {
			// Fallback to simple key if JSON stringify fails
			return `${this.key}:${operation}:${Date.now()}`;
		}
	}

	protected async getCachedResult<T>(cacheKey: string, queryFn: () => Promise<T>, ttl: number = 300): Promise<T> {
		if (!this.enableCache) return queryFn();

		const cached = await this.cache.get<T>(cacheKey);
		if (cached) {
			await this.logger.logInfoAsync("Cache", new Error(`Cache hit for ${cacheKey}`), null);
			return cached;
		}

		const result = await queryFn();
		await this.cache.set(cacheKey, result, ttl);
		return result;
	}

	protected async invalidateCache(): Promise<void> {
		if (!this.enableCache) return;
		await this.cache.invalidatePattern(`${this.key}:*`);
	}

	// ==================== UNIQUE VALIDATION ====================

	async checkUnique(
		data: object,
		options?: {
			uniqueFields?: string[];
			where?: WhereOptions<Attributes<ModelInterface>>;
			ignoreAttributes?: string[];
		},
	): Promise<{ isValid: boolean; duplicateFields: string[] }> {
		const uniqueFields = options?.uniqueFields || this.uniqueFields;
		if (uniqueFields.length === 0) return { isValid: true, duplicateFields: [] };

		const duplicateFields: string[] = [];
		const whereClause = options?.where || {};
		const ignoreAttributes = options?.ignoreAttributes || [];

		for (const field of uniqueFields) {
			if (ignoreAttributes.includes(field)) continue;

			const keys = field.split(",");
			const fieldWhere: WhereOptions<Attributes<ModelInterface>> = { ...whereClause };

			let hasValue = false;
			for (const key of keys) {
				const value = (data as any)[key];
				if (value !== undefined && value !== null) {
					(fieldWhere as any)[key] = value;
					hasValue = true;
				}
			}

			if (!hasValue) continue;

			try {
				const existing = await this.model.findOne({ where: fieldWhere, attributes: ["id"] });
				if (existing) {
					duplicateFields.push(field);
				}
			} catch (error) {
				// Log error but continue checking other fields
				await this.logger.logErrorAsync("Provider", new Error(`Check unique failed: ${error}`), null);
			}
		}

		return {
			isValid: duplicateFields.length === 0,
			duplicateFields,
		};
	}

	// ==================== TRANSACTION MANAGEMENT ====================

	public get transaction() {
		return (this.model as any).sequelize.transaction;
	}

	protected async executeInTransaction<T>(
		fn: (transaction: Transaction) => Promise<T>,
		existingTransaction?: Transaction | null,
	): Promise<T> {
		if (existingTransaction) {
			return fn(existingTransaction);
		}

		const transaction = await (this.model as any).sequelize.transaction();
		try {
			const result = await fn(transaction);
			await transaction.commit();
			return result;
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	}

	// ==================== QUERY METHODS ====================

	protected transformQueryOptions(opts: FindManyOptions<ModelInterface>) {
		const { page, pageSize, sortField, sortOrder, where, filters, ...baseQuery } = opts;
		const payload: FindAndCountOptions = {
			...baseQuery,
		};

		if (where || filters) {
			payload.where = { ...where, ...filters };
		}

		if (sortField && sortOrder) {
			payload.order = [[sortField, sortOrder]];
		}

		if (page !== undefined && page < 0) throw new MeUError(410, "DB", { page });
		if (pageSize !== undefined && pageSize < 0) throw new MeUError(411, "DB", { pageSize });
		if (pageSize !== undefined && pageSize > 0) {
			payload.limit = pageSize;
			payload.offset = ((page || 1) - 1) * pageSize || 0;
		} else if (pageSize === 0) {
			// No pagination, get all records
			payload.offset = 0;
		}
		return payload;
	}

	public async getAll(opts: FindManyOptions<ModelInterface>): Promise<FindManyReturnModel<ModelInterface>> {
		try {
			const payload = this.transformQueryOptions(opts);
			const { count, rows } = await (this.model as any).findAndCountAll(payload);
			const result: FindManyReturnModel<ModelInterface> = {
				count,
				rows,
			};
			if (opts.page !== undefined) result.page = opts.page;
			if (opts.pageSize !== undefined) result.pageSize = opts.pageSize;
			return result;
		} catch (error) {
			await this.logError(error as Error);
			throw error;
		}
	}

	async getById({
		id,
		includeAttributes = Object.keys(this.model.getAttributes()),
		includeModels = [],
		transaction,
	}: {
		id: string;
		includeAttributes?: FindAttributeOptions;
		includeModels?: Includeable | Includeable[];
		transaction?: Transaction;
	}): Promise<ModelInterface> {
		const cacheKey = this.getCacheKey("getById", { id, includeAttributes, includeModels });

		return this.getCachedResult(
			cacheKey,
			async () => {
				try {
					const result = await (this.model as any).findByPk(id, {
						include: includeModels,
						attributes: includeAttributes ?? Object.keys((this.model as any).getAttributes()),
						transaction,
					});

					if (!result) {
						throw new MeUError(404, "DB", `Record with id ${id} not found`);
					}

					return result;
				} catch (error) {
					await this.logError(error as Error);
					throw error;
				}
			},
			600,
		);
	}

	async getOne({
		where,
		includeAttributes = Object.keys(this.model.getAttributes()),
		includeModels = [],
		raw = false,
		nest = false,
		order,
		transaction,
	}: {
		where: WhereOptions<Attributes<ModelInterface>> | null;
		includeAttributes?: FindAttributeOptions;
		includeModels?: Includeable | Includeable[];
		raw?: boolean;
		nest?: boolean;
		order?: Order;
		transaction?: Transaction;
	}): Promise<ModelInterface | null> {
		const cacheKey = this.getCacheKey("getOne", { where, includeAttributes, includeModels, order });

		return this.getCachedResult(
			cacheKey,
			async () => {
				try {
					const attributes =
						includeAttributes === null ? Object.keys((this.model as any).getAttributes()) : includeAttributes;

					return await (this.model as any).findOne({
						where: where || {},
						include: includeModels,
						attributes,
						raw,
						nest,
						order,
						transaction,
					});
				} catch (error) {
					await this.logError(error as Error);
					throw error;
				}
			},
			300,
		);
	}

	async getOneOrCreate({
		where,
		body,
		transaction,
		order,
	}: {
		where: WhereOptions<Attributes<ModelInterface>> | null;
		body: CreationAttributes<ModelInterface>;
		transaction?: Transaction;
		order?: Order;
	}): Promise<[ModelInterface, boolean]> {
		return this.executeInTransaction(async (tx) => {
			try {
				const result = await (this.model as any).findOrCreate({
					where,
					order: order || [["created_at", "DESC"]],
					defaults: body,
					transaction: tx,
				});
				await this.invalidateCache();
				return result;
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, transaction);
	}

	// ==================== MUTATION METHODS ====================

	async post(
		body: CreationAttributes<ModelInterface>,
		options?: {
			transaction?: Transaction;
			skipUniqueCheck?: boolean;
			uniqueFields?: string[];
		},
	): Promise<ModelInterface> {
		return this.executeInTransaction(async (tx) => {
			try {
				// Check unique constraints
				if (!options?.skipUniqueCheck) {
					const uniqueCheck = await this.checkUnique(body, {
						uniqueFields: options?.uniqueFields || [],
					});
					if (!uniqueCheck.isValid) {
						throw new MeUError(409, "DB", {
							duplicateFields: uniqueCheck.duplicateFields,
						});
					}
				}

				const result = await (this.model as any).create(body, { transaction: tx });
				await this.logger.logInfoAsync("Provider", new Error(`Created ${this.key} with id ${result.get("id")}`), null);

				await this.invalidateCache();
				return result;
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}

	async bulkCreate(
		body: Array<CreationAttributes<ModelInterface>>,
		options?: BulkCreateOptions,
	): Promise<ModelInterface[]> {
		return this.executeInTransaction(async (tx) => {
			try {
				const result = await this.model.bulkCreate(body, {
					...options,
					transaction: tx,
				});

				await this.logger.logInfoAsync(
					"Provider",
					new Error(`Bulk created ${result.length} ${this.key} records`),
					null,
				);
				await this.invalidateCache();
				return result;
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}

	async put(
		id: string,
		body: CreationAttributes<ModelInterface>,
		options?: {
			transaction?: Transaction;
			skipUniqueCheck?: boolean;
			uniqueFields?: string[];
		},
	): Promise<ModelInterface> {
		return this.executeInTransaction(async (tx) => {
			try {
				const toUpdate = await this.model.findByPk(id, { transaction: tx });
				if (!toUpdate) {
					throw new MeUError(404, "DB", `Record with id ${id} not found`);
				}

				// Check unique constraints
				if (!options?.skipUniqueCheck) {
					const uniqueCheck = await this.checkUnique(body, {
						uniqueFields: options?.uniqueFields || [],
						where: { [Op.not]: { id } } as WhereOptions<ModelInterface>,
					});
					if (!uniqueCheck.isValid) {
						throw new MeUError(409, "DB", {
							duplicateFields: uniqueCheck.duplicateFields,
						});
					}
				}

				const result = await toUpdate.update({ ...body, updated_at: new Date() }, { transaction: tx });
				await this.logger.logInfoAsync("Provider", new Error(`Updated ${this.key} with id ${id}`), null);

				await this.invalidateCache();
				return result;
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}

	async bulkUpdate(
		where: WhereOptions<ModelInterface>,
		body: CreationAttributes<ModelInterface>,
		options?: UpdateOptions<ModelInterface>,
	): Promise<[affectedCount: number]> {
		return this.executeInTransaction(async (tx) => {
			try {
				const result = await this.model.update(body, {
					...options,
					where,
					transaction: tx,
				});

				await this.logger.logInfoAsync("Provider", new Error(`Bulk updated ${result[0]} ${this.key} records`), null);
				await this.invalidateCache();
				return result;
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}

	async delete(
		id: string,
		options?: {
			transaction?: Transaction;
			force?: boolean;
		},
	): Promise<string> {
		return this.executeInTransaction(async (tx) => {
			try {
				const toDelete = await this.model.findByPk(id, { transaction: tx });
				if (!toDelete) {
					throw new MeUError(404, "DB", `Record with id ${id} not found`);
				}

				await toDelete.destroy({
					transaction: tx,
					force: options?.force || false,
				});

				await this.logger.logInfoAsync("Provider", new Error(`Deleted ${this.key} with id ${id}`), null);
				await this.invalidateCache();
				return "Successfully delete item";
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}

	async bulkDelete(
		where: WhereOptions<Attributes<ModelInterface>>,
		options?: DestroyOptions<ModelInterface>,
	): Promise<number> {
		return this.executeInTransaction(async (tx) => {
			try {
				const result = await this.model.destroy({
					...options,
					where,
					transaction: tx,
				});

				await this.logger.logInfoAsync("Provider", new Error(`Bulk deleted ${result} ${this.key} records`), null);
				await this.invalidateCache();
				return result;
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}

	// ==================== UTILITY METHODS ====================

	async exists(where: WhereOptions<Attributes<ModelInterface>>): Promise<boolean> {
		const count = await this.model.count({ where });
		return count > 0;
	}

	async count(where?: WhereOptions<Attributes<ModelInterface>>): Promise<number> {
		const cacheKey = this.getCacheKey("count", { where });
		return this.getCachedResult(
			cacheKey,
			async () => {
				return await (this.model as any).count({ where });
			},
			180,
		);
	}

	async findAll(options?: FindAndCountOptions): Promise<ModelInterface[]> {
		const cacheKey = this.getCacheKey("findAll", options);
		return this.getCachedResult(
			cacheKey,
			async () => {
				try {
					return await this.model.findAll(options);
				} catch (error) {
					await this.logError(error as Error);
					throw error;
				}
			},
			300,
		);
	}

	async findByPk(id: any, options?: any): Promise<ModelInterface | null> {
		const cacheKey = this.getCacheKey("findByPk", { id, options });
		return this.getCachedResult(
			cacheKey,
			async () => {
				try {
					return await this.model.findByPk(id, options);
				} catch (error) {
					await this.logError(error as Error);
					throw error;
				}
			},
			300,
		);
	}

	async create(data: CreationAttributes<ModelInterface>, options?: any): Promise<ModelInterface> {
		return this.post(data, options);
	}

	async updateById(
		id: string,
		data: Partial<Attributes<ModelInterface>>,
		options?: UpdateOptions<ModelInterface>,
	): Promise<ModelInterface | null> {
		const putOptions: any = {
			skipUniqueCheck: false,
			uniqueFields: [],
		};
		if (options?.transaction) {
			putOptions.transaction = options.transaction;
		}
		return this.put(id, data as CreationAttributes<ModelInterface>, putOptions);
	}

	async logError(err: MeUError | Error) {
		await this.logger.logErrorAsync("Provider", err, null);
		return;
	}

	// ==================== ADVANCED FEATURES ====================

	/**
	 * Optimized method for getting paginated results with search
	 */
	async getPaginatedWithSearch(
		opts: FindManyOptions<ModelInterface> & {
			searchFields?: string[];
			searchQuery?: string;
		},
	): Promise<FindManyReturnModel<ModelInterface>> {
		const { searchFields, searchQuery, ...queryOpts } = opts;

		if (searchQuery && searchFields?.length) {
			const searchWhere = searchFields.map((field) => ({
				[field]: { [Op.iLike]: `%${searchQuery}%` },
			}));

			queryOpts.where = {
				...queryOpts.where,
				[Op.or]: searchWhere,
			} as WhereOptions<ModelInterface>;
		}

		return this.getAll(queryOpts);
	}

	/**
	 * Method for upsert operations
	 */
	async upsert(
		values: CreationAttributes<ModelInterface>,
		options?: {
			transaction?: Transaction;
			conflictFields?: string[];
		},
	): Promise<ModelInterface> {
		return this.executeInTransaction(async (tx) => {
			try {
				const result = await this.model.upsert(values, {
					...options,
					transaction: tx,
					returning: true,
				});

				await this.invalidateCache();
				return result[0];
			} catch (error) {
				await this.logError(error as Error);
				throw error;
			}
		}, options?.transaction);
	}
}

export { BaseProvider };
export default BaseProvider;
