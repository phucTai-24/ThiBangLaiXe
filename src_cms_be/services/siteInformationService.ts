import { Transaction, UniqueConstraintError, type Sequelize } from "sequelize";
import { SiteInformation, type SiteInformationAttributes } from "#models/SiteInformation";
import { GenericError } from "#interfaces/error/generic";

const DEFAULT_SITE_INFORMATION_CODE = "default";
const MAX_SOCIAL_LINKS = 20;

export interface SiteSocialLinkDTO {
	platform: string;
	label: string;
	url: string;
	icon_key: string;
	is_active: boolean;
}

export interface SiteInformationGetQueryDTO {
	platform?: string | string[];
	is_active?: boolean;
}

export type SiteInformationResponseDTO = Omit<SiteInformationAttributes, "link_socials"> & {
	link_socials: SiteSocialLinkDTO[];
};

const is_record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const get_sequelize = (): Sequelize => {
	const sequelize = SiteInformation.sequelize;

	if (!sequelize) {
		throw new GenericError(
			{ vi: "Không tìm thấy kết nối cơ sở dữ liệu", en: "Database connection not found" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return sequelize;
};

const get_single_query_string = (value: unknown): string | undefined => {
	if (typeof value === "undefined" || value === null) return undefined;

	if (typeof value === "string") {
		const normalized = value.trim();
		return normalized || undefined;
	}

	if (Array.isArray(value)) {
		const first = value.find((v) => typeof v === "string");
		if (typeof first === "string") {
			const normalized = first.trim();
			return normalized || undefined;
		}
		return undefined;
	}

	return undefined;
};

const normalize_required_string = (value: unknown, field: string): string => {
	if (typeof value !== "string") {
		throw new GenericError({ vi: `${field} không hợp lệ`, en: `${field} is invalid` }, "BAD_REQUEST", 400, { field });
	}

	const normalized = value.trim();
	if (!normalized) {
		throw new GenericError({ vi: `${field} là bắt buộc`, en: `${field} is required` }, "BAD_REQUEST", 400, { field });
	}

	return normalized;
};

const normalize_nullable_string = (value: unknown, field: string): string | null => {
	if (value === null) return null;

	if (typeof value !== "string") {
		throw new GenericError({ vi: `${field} không hợp lệ`, en: `${field} is invalid` }, "BAD_REQUEST", 400, { field });
	}

	const normalized = value.trim();
	return normalized || null;
};

const normalize_boolean = (value: unknown, field: string): boolean => {
	if (typeof value !== "boolean") {
		throw new GenericError({ vi: `${field} không hợp lệ`, en: `${field} is invalid` }, "BAD_REQUEST", 400, { field });
	}

	return value;
};

const is_valid_http_url = (value: string): boolean => {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

const normalize_social_link = (value: unknown, index: number): SiteSocialLinkDTO => {
	if (!is_record(value)) {
		throw new GenericError(
			{ vi: `link_socials[${index}] không hợp lệ`, en: `link_socials[${index}] is invalid` },
			"BAD_REQUEST",
			400,
			{ field: `link_socials[${index}]` },
		);
	}

	const url = normalize_required_string(value.url, `link_socials[${index}].url`);
	if (!is_valid_http_url(url)) {
		throw new GenericError(
			{ vi: `link_socials[${index}].url không hợp lệ`, en: `link_socials[${index}].url is invalid` },
			"BAD_REQUEST",
			400,
			{ field: `link_socials[${index}].url` },
		);
	}

	return {
		platform: normalize_required_string(value.platform, `link_socials[${index}].platform`).toLowerCase(),
		label: normalize_required_string(value.label, `link_socials[${index}].label`),
		url,
		icon_key: normalize_required_string(value.icon_key, `link_socials[${index}].icon_key`).toLowerCase(),
		is_active: normalize_boolean(value.is_active, `link_socials[${index}].is_active`),
	};
};

const normalize_link_socials = (value: unknown): SiteSocialLinkDTO[] => {
	if (!Array.isArray(value)) {
		throw new GenericError({ vi: "link_socials phải là mảng", en: "link_socials must be an array" }, "BAD_REQUEST", 400, {
			field: "link_socials",
		});
	}

	if (value.length > MAX_SOCIAL_LINKS) {
		throw new GenericError(
			{ vi: `link_socials vượt quá ${MAX_SOCIAL_LINKS} phần tử`, en: `link_socials exceeds ${MAX_SOCIAL_LINKS} items` },
			"BAD_REQUEST",
			400,
			{ field: "link_socials", max: MAX_SOCIAL_LINKS },
		);
	}

	const normalized = value.map((item, index) => normalize_social_link(item, index));
	const platform_set = new Set<string>();

	for (const item of normalized) {
		if (platform_set.has(item.platform)) {
			throw new GenericError(
				{ vi: "platform trong link_socials bị trùng", en: "Duplicate platform in link_socials" },
				"BAD_REQUEST",
				400,
				{ field: "link_socials.platform", platform: item.platform },
			);
		}
		platform_set.add(item.platform);
	}

	return normalized;
};

const parse_date_value = (value: unknown, field: string): Date => {
	if (value instanceof Date) return value;

	if (typeof value === "string" || typeof value === "number") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	throw new GenericError({ vi: `Dữ liệu ${field} không hợp lệ`, en: `Invalid ${field} data` }, "INTERNAL_SERVER_ERROR", 500, {
		field,
	});
};

const read_stored_string = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const build_link_social_from_storage = (value: unknown, index: number): SiteSocialLinkDTO => {
	if (!is_record(value)) {
		throw new GenericError(
			{ vi: `Dữ liệu link_socials[${index}] không hợp lệ`, en: `Invalid link_socials[${index}] data` },
			"INTERNAL_SERVER_ERROR",
			500,
			{ field: `link_socials[${index}]` },
		);
	}

	const platform = read_stored_string(value.platform).toLowerCase();
	const icon_key = read_stored_string(value.icon_key).toLowerCase();
	const label = read_stored_string(value.label);
	const url = read_stored_string(value.url);
	const is_active = typeof value.is_active === "boolean" ? value.is_active : null;

	if (!platform || !icon_key || !label || !url || is_active === null) {
		throw new GenericError(
			{ vi: `Dữ liệu link_socials[${index}] không hợp lệ`, en: `Invalid link_socials[${index}] data` },
			"INTERNAL_SERVER_ERROR",
			500,
			{ field: `link_socials[${index}]` },
		);
	}

	return { platform, label, url, icon_key, is_active };
};

const parse_link_socials_from_storage = (value: unknown): SiteSocialLinkDTO[] => {
	if (!Array.isArray(value)) {
		throw new GenericError(
			{ vi: "Dữ liệu link_socials trong cơ sở dữ liệu không hợp lệ", en: "Invalid link_socials data in database" },
			"INTERNAL_SERVER_ERROR",
			500,
			{ field: "link_socials" },
		);
	}

	return value.map((item, index) => build_link_social_from_storage(item, index));
};

const filter_link_socials = (link_socials: SiteSocialLinkDTO[], query: SiteInformationGetQueryDTO): SiteSocialLinkDTO[] => {
	let filtered = [...link_socials];

	if (typeof query.platform !== "undefined") {
		const platforms = Array.isArray(query.platform)
			? new Set(query.platform.map((x) => x.trim().toLowerCase()).filter(Boolean))
			: new Set([query.platform.trim().toLowerCase()].filter(Boolean));

		if (platforms.size > 0) {
			filtered = filtered.filter((item) => platforms.has(item.platform.toLowerCase()));
		}
	}

	if (typeof query.is_active === "boolean") {
		filtered = filtered.filter((item) => item.is_active === query.is_active);
	}

	return filtered;
};

const to_site_information_response = (site_information: SiteInformation, query?: SiteInformationGetQueryDTO): SiteInformationResponseDTO => {
	const plain = site_information.get({ plain: true }) as unknown;

	if (!is_record(plain)) {
		throw new GenericError(
			{ vi: "Dữ liệu site information không hợp lệ", en: "Invalid site information data" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	const link_socials = parse_link_socials_from_storage(plain.link_socials);
	const filtered_link_socials = query ? filter_link_socials(link_socials, query) : link_socials;

	return {
		id: typeof plain.id === "string" ? plain.id : "",
		code: typeof plain.code === "string" && plain.code.trim() ? plain.code : DEFAULT_SITE_INFORMATION_CODE,
		telephone: plain.telephone === null || typeof plain.telephone === "undefined" ? null : String(plain.telephone),
		email: plain.email === null || typeof plain.email === "undefined" ? null : String(plain.email),
		address: plain.address === null || typeof plain.address === "undefined" ? null : String(plain.address),
		working_hours: plain.working_hours === null || typeof plain.working_hours === "undefined" ? null : String(plain.working_hours),
		link_socials: filtered_link_socials,
		created_at: parse_date_value(plain.created_at, "created_at"),
		created_by: plain.created_by === null || typeof plain.created_by === "undefined" ? null : String(plain.created_by),
		updated_at: parse_date_value(plain.updated_at, "updated_at"),
		updated_by: plain.updated_by === null || typeof plain.updated_by === "undefined" ? null : String(plain.updated_by),
	};
};

const find_default_site_information = async (transaction?: Transaction | null): Promise<SiteInformation> => {
	const existed = await SiteInformation.findOne({
		where: { code: DEFAULT_SITE_INFORMATION_CODE },
		transaction: transaction ?? null,
	});

	if (existed) return existed;

	try {
		return await SiteInformation.create(
			{
				code: DEFAULT_SITE_INFORMATION_CODE,
				telephone: null,
				email: null,
				address: null,
				working_hours: null,
				link_socials: [],
				created_at: new Date(),
				created_by: null,
				updated_at: new Date(),
				updated_by: null,
			},
			{ transaction: transaction ?? null },
		);
	} catch (error) {
		if (error instanceof UniqueConstraintError) {
			const fallback = await SiteInformation.findOne({
				where: { code: DEFAULT_SITE_INFORMATION_CODE },
				transaction: transaction ?? null,
			});
			if (fallback) return fallback;
		}

		throw error;
	}
};

const normalize_update_payload = (body: Record<string, unknown>): Partial<SiteInformationAttributes> => {
	const update_data: Partial<SiteInformationAttributes> = {};

	if (Object.prototype.hasOwnProperty.call(body, "telephone")) {
		update_data.telephone = normalize_nullable_string(body.telephone, "telephone");
	}

	if (Object.prototype.hasOwnProperty.call(body, "email")) {
		update_data.email = normalize_nullable_string(body.email, "email");
	}

	if (Object.prototype.hasOwnProperty.call(body, "address")) {
		update_data.address = normalize_nullable_string(body.address, "address");
	}

	if (Object.prototype.hasOwnProperty.call(body, "working_hours")) {
		update_data.working_hours = normalize_nullable_string(body.working_hours, "working_hours");
	}

	if (Object.prototype.hasOwnProperty.call(body, "link_socials")) {
		update_data.link_socials = normalize_link_socials(body.link_socials);
	}

	return update_data;
};

const parse_or_values = (raw: string): string[] => {
	let value = raw.trim();
	if (!value) return [];

	if (value.startsWith("(") && value.endsWith(")")) {
		value = value.slice(1, -1).trim();
	}

	if (!value) return [];

	return value
		.split("|")
		.map((x) => x.trim())
		.filter(Boolean);
};

const build_site_information_get_query = (query: unknown): SiteInformationGetQueryDTO => {
	if (!is_record(query)) return {};

	const raw_filters = get_single_query_string(query.filters);
	if (!raw_filters) return {};

	const site_information_query: SiteInformationGetQueryDTO = {};

	const parts = raw_filters
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);

	for (const part of parts) {
		const idx = part.indexOf("==");
		if (idx < 0) continue;

		const field = part.slice(0, idx).trim();
		const raw_value = part.slice(idx + 2).trim();

		if (!field || !raw_value) continue;

		if (field === "platform") {
			const values = parse_or_values(raw_value).map((x) => x.toLowerCase());

			if (values.length === 1) {
				const first_platform = values[0];
				if (typeof first_platform === "string") {
					site_information_query.platform = first_platform;
				}
			} else if (values.length > 1) {
				site_information_query.platform = values;
			}
		}

		if (field === "is_active") {
			const values = parse_or_values(raw_value).map((x) => x.toLowerCase());
			const first_value = values[0];

			if (first_value === "true") {
				site_information_query.is_active = true;
			} else if (first_value === "false") {
				site_information_query.is_active = false;
			} else {
				throw new GenericError(
					{ vi: "is_active không hợp lệ", en: "is_active is invalid" },
					"BAD_REQUEST",
					400,
					{ field: "filters" },
				);
			}
		}
	}

	return site_information_query;
};

export const siteInformationService = {
	buildGetQuery(query: unknown): SiteInformationGetQueryDTO {
		return build_site_information_get_query(query);
	},

	async getCurrent(query: SiteInformationGetQueryDTO = {}): Promise<SiteInformationResponseDTO> {
		const site_information = await find_default_site_information();
		return to_site_information_response(site_information, query);
	},

	async updateCurrent(body: Record<string, unknown>, actor_id: string | null): Promise<SiteInformationResponseDTO> {
		const sequelize = get_sequelize();

		return sequelize.transaction(async (transaction: Transaction) => {
			const site_information = await find_default_site_information(transaction);
			const update_data = normalize_update_payload(body);

			if (Object.keys(update_data).length === 0) {
				throw new GenericError(
					{ vi: "Không có dữ liệu hợp lệ để cập nhật", en: "No valid data to update" },
					"BAD_REQUEST",
					400,
				);
			}

			await site_information.update(
				{
					...update_data,
					updated_at: new Date(),
					updated_by: actor_id,
				},
				{ transaction },
			);

			await site_information.reload({ transaction });

			return to_site_information_response(site_information);
		});
	},
};