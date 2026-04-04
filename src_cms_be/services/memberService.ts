import path from "path";
import { Readable } from "stream";

import ExcelJS from "exceljs";

import { GenericError } from "#interfaces/error/generic";
import { Business, type BusinessAttributes, type BusinessCreationAttributes } from "#models/Business";
import { Member, type MemberAttributes, type MemberCreationAttributes } from "#models/Member";
import { Position } from "#models/Position";

interface MemberImportBody {
	file_buffer: Uint8Array;
	original_name: string;
	actor_id: string | null;
	sheet_name?: string | null;
}

type ImportColumnKey =
	| "stt"
	| "full_name"
	| "birth_date"
	| "position_business"
	| "address"
	| "business_sector";

type HeaderMap = Record<ImportColumnKey, number>;

interface ParsedImportRow {
	row_number: number;
	full_name: string;
	birth_date: string | null;
	position_name: string | null;
	business_name: string | null;
	address: string | null;
	business_sector_text: string | null;
}

interface ImportWarningItem {
	row_number: number;
	full_name: string | null;
	message: string;
	message_en: string;
}

export interface MemberImportResponse {
	sheet_name: string;
	total_rows: number;
	created_member_count: number;
	updated_member_count: number;
	created_business_count: number;
	updated_business_count: number;
	created_position_count: number;
	warning_count: number;
	warnings: ImportWarningItem[];
}

interface BirthDateParseResult {
	value: string | null;
	warning: string | null;
	warning_en: string | null;
}

const SUPPORTED_FILE_EXTENSIONS = new Set([".xlsx", ".csv"]);

const REQUIRED_HEADERS: Record<ImportColumnKey, string> = {
	stt: "stt",
	full_name: "ho va ten",
	birth_date: "nam sinh",
	position_business: "chuc danh ten doanh nghiep",
	address: "dia chi",
	business_sector: "nganh nghe kinh doanh",
};

const VIETNAMESE_TONE_REGEX = /[\u0300-\u036f]/g;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

const is_non_empty_string = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0;

const normalize_whitespace = (value: string): string =>
	value.replace(ZERO_WIDTH_REGEX, "").replace(/\s+/g, " ").trim();

const remove_vietnamese_tones = (value: string): string =>
	value
		.normalize("NFKD")
		.replace(VIETNAMESE_TONE_REGEX, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D");

const normalize_lookup_text = (value: string): string =>
	remove_vietnamese_tones(normalize_whitespace(value)).toLowerCase();

const normalize_header = (value: string): string =>
	normalize_lookup_text(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const format_date_only = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

const is_valid_date = (year: number, month: number, day: number): boolean => {
	const date = new Date(year, month - 1, day);

	return (
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day
	);
};

const excel_serial_to_date = (serial: number): Date => {
	const utc_days = Math.floor(serial - 25569);
	const utc_value = utc_days * 86400;

	return new Date(utc_value * 1000);
};

const parse_birth_date = (raw_value: string | number | Date | null): BirthDateParseResult => {
	if (raw_value === null) {
		return { value: null, warning: null, warning_en: null };
	}

	if (raw_value instanceof Date) {
		return {
			value: format_date_only(raw_value),
			warning: null,
			warning_en: null,
		};
	}

	if (typeof raw_value === "number") {
		if (raw_value >= 10000) {
			return {
				value: format_date_only(excel_serial_to_date(raw_value)),
				warning: null,
				warning_en: null,
			};
		}

		if (raw_value >= 1900 && raw_value <= 2100) {
			return {
				value: `${Math.floor(raw_value)}-01-01`,
				warning: "Năm sinh chỉ có năm, hệ thống chuẩn hóa thành YYYY-01-01.",
				warning_en: "Birth year only contains year, system normalizes to YYYY-01-01.",
			};
		}

		return {
			value: null,
			warning: "Không parse được năm sinh.",
			warning_en: "Cannot parse birth date.",
		};
	}

	const normalized = normalize_whitespace(String(raw_value));
	if (!normalized) {
		return { value: null, warning: null, warning_en: null };
	}

	if (/^\d{4}$/.test(normalized)) {
		return {
			value: `${normalized}-01-01`,
			warning: "Năm sinh chỉ có năm, hệ thống chuẩn hóa thành YYYY-01-01.",
			warning_en: "Birth year only contains year, system normalizes to YYYY-01-01.",
		};
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		return {
			value: normalized,
			warning: null,
			warning_en: null,
		};
	}

	const slash_match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (slash_match) {
		const day = Number(slash_match[1]);
		const month = Number(slash_match[2]);
		const year = Number(slash_match[3]);

		if (!is_valid_date(year, month, day)) {
			return {
				value: null,
				warning: "Ngày sinh không hợp lệ.",
				warning_en: "Invalid birth date.",

			};
		}

		return {
			value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
			warning: null,
			warning_en: null,
		};
	}

	return {
		value: null,
		warning: "Không parse được năm sinh.",
		warning_en: "Cannot parse birth year.",

	};
};

const extract_cell_text = (value: ExcelJS.CellValue): string => {
	if (value === null || typeof value === "undefined") return "";

	if (typeof value === "string") return normalize_whitespace(value);
	if (typeof value === "number") return String(value).trim();
	if (value instanceof Date) return format_date_only(value);

	if (typeof value === "object") {
		if ("text" in value && typeof value.text === "string") {
			return normalize_whitespace(value.text);
		}

		if ("result" in value) {
			const formula_result = value.result;

			if (typeof formula_result === "string") return normalize_whitespace(formula_result);
			if (typeof formula_result === "number") return String(formula_result).trim();
			if (formula_result instanceof Date) return format_date_only(formula_result);
		}

		if ("richText" in value && Array.isArray(value.richText)) {
			return normalize_whitespace(value.richText.map((item) => item.text).join(""));
		}
	}

	return normalize_whitespace(String(value));
};

const extract_birth_source = (value: ExcelJS.CellValue): string | number | Date | null => {
	if (value === null || typeof value === "undefined") return null;
	if (typeof value === "string" || typeof value === "number" || value instanceof Date) return value;

	if (typeof value === "object" && "result" in value) {
		const formula_result = value.result;

		if (
			typeof formula_result === "string" ||
			typeof formula_result === "number" ||
			formula_result instanceof Date
		) {
			return formula_result;
		}
	}

	const text = extract_cell_text(value);
	return text || null;
};

const split_position_and_business = (
	raw_value: string,
): { position_name: string | null; business_name: string | null } => {
	const normalized = normalize_whitespace(raw_value);

	if (!normalized) {
		return {
			position_name: null,
			business_name: null,
		};
	}

	const first_slash_index = normalized.indexOf("/");

	if (first_slash_index < 0) {
		return {
			position_name: null,
			business_name: normalized,
		};
	}

	const position_name = normalize_whitespace(normalized.slice(0, first_slash_index));
	const business_name = normalize_whitespace(normalized.slice(first_slash_index + 1));

	return {
		position_name: position_name || null,
		business_name: business_name || null,
	};
};

const slugify = (input: string): string => {
	const cleaned = remove_vietnamese_tones(input).toLowerCase().trim();

	return cleaned
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
};

const assert_sequelize_ready = () => {
	const sequelize = Member.sequelize;

	if (!sequelize) {
		throw new GenericError(
			{ vi: "Sequelize chưa sẵn sàng", en: "Sequelize is not ready" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return sequelize;
};

const assert_supported_extension = (original_name: string): string => {
	const extension = path.extname(original_name).toLowerCase();

	if (!SUPPORTED_FILE_EXTENSIONS.has(extension)) {
		throw new GenericError(
			{ vi: "Chỉ hỗ trợ file .xlsx hoặc .csv", en: "Only .xlsx or .csv files are supported" },
			"BAD_REQUEST",
			400,
		);
	}

	return extension;
};

const find_header_row = (worksheet: ExcelJS.Worksheet): { row_number: number; header_map: HeaderMap } | null => {
	const scan_limit = Math.min(worksheet.rowCount, 10);

	for (let row_number = 1; row_number <= scan_limit; row_number += 1) {
		const row = worksheet.getRow(row_number);
		const maybe_map: Partial<HeaderMap> = {};

		row.eachCell({ includeEmpty: false }, (cell, column_number) => {
			const normalized = normalize_header(extract_cell_text(cell.value));

			(Object.keys(REQUIRED_HEADERS) as ImportColumnKey[]).forEach((key) => {
				if (normalized === REQUIRED_HEADERS[key]) {
					maybe_map[key] = column_number;
				}
			});
		});

		const matched = (Object.keys(REQUIRED_HEADERS) as ImportColumnKey[]).every(
			(key) => typeof maybe_map[key] === "number",
		);

		if (matched) {
			return {
				row_number,
				header_map: maybe_map as HeaderMap,
			};
		}
	}

	return null;
};

const load_matching_worksheet = async (
	file_buffer: Uint8Array,
	original_name: string,
	sheet_name?: string | null,
): Promise<{ worksheet: ExcelJS.Worksheet; sheet_name: string }> => {
	const extension = assert_supported_extension(original_name);
	const workbook = new ExcelJS.Workbook();

	if (extension === ".csv") {
		await workbook.csv.read(Readable.from([Buffer.from(file_buffer).toString("utf-8")]));

		const worksheet = workbook.worksheets[0];

		if (!worksheet) {
			throw new GenericError(
				{ vi: "File CSV không có dữ liệu", en: "CSV file has no data" },
				"BAD_REQUEST",
				400,
			);
		}

		const header_info = find_header_row(worksheet);

		if (!header_info) {
			throw new GenericError(
				{ vi: "CSV không đúng template import hội viên", en: "CSV does not match member import template" },
				"BAD_REQUEST",
				400,
			);
		}

		return {
			worksheet,
			sheet_name: worksheet.name,
		};
	}

	await workbook.xlsx.read(Readable.from([file_buffer]));

	if (is_non_empty_string(sheet_name)) {
		const exact_worksheet = workbook.getWorksheet(sheet_name.trim());

		if (!exact_worksheet) {
			throw new GenericError(
				{ vi: "sheet_name không tồn tại trong file", en: "sheet_name does not exist in workbook" },
				"BAD_REQUEST",
				400,
				{ sheet_name },
			);
		}

		const header_info = find_header_row(exact_worksheet);

		if (!header_info) {
			throw new GenericError(
				{
					vi: "Sheet được chọn không đúng template import hội viên",
					en: "Selected sheet does not match member import template",
				},
				"BAD_REQUEST",
				400,
				{ sheet_name },
			);
		}

		return {
			worksheet: exact_worksheet,
			sheet_name: exact_worksheet.name,
		};
	}

	for (const worksheet of workbook.worksheets) {
		const header_info = find_header_row(worksheet);

		if (!header_info) continue;

		return {
			worksheet,
			sheet_name: worksheet.name,
		};
	}

	throw new GenericError(
		{
			vi: "Không tìm thấy sheet đúng template import hội viên",
			en: "Cannot find a worksheet matching member import template",
		},
		"BAD_REQUEST",
		400,
	);
};

const parse_rows_from_file = async (
	file_buffer: Uint8Array,
	original_name: string,
	sheet_name?: string | null,
): Promise<{
	sheet_name: string;
	rows: ParsedImportRow[];
	warnings: ImportWarningItem[];
}> => {
	const { worksheet, sheet_name: matched_sheet_name } = await load_matching_worksheet(
		file_buffer,
		original_name,
		sheet_name,
	);

	const header_info = find_header_row(worksheet);

	if (!header_info) {
		throw new GenericError(
			{ vi: "Không tìm thấy header hợp lệ", en: "Cannot find a valid header row" },
			"BAD_REQUEST",
			400,
		);
	}

	const warnings: ImportWarningItem[] = [];
	const rows: ParsedImportRow[] = [];
	const { row_number: header_row_number, header_map } = header_info;

	for (let row_number = header_row_number + 1; row_number <= worksheet.rowCount; row_number += 1) {
		const row = worksheet.getRow(row_number);

		const full_name = extract_cell_text(row.getCell(header_map.full_name).value);
		const raw_birth_date = extract_birth_source(row.getCell(header_map.birth_date).value);
		const position_business = extract_cell_text(row.getCell(header_map.position_business).value);
		const address = extract_cell_text(row.getCell(header_map.address).value);
		const business_sector_text = extract_cell_text(row.getCell(header_map.business_sector).value);

		const is_empty_row =
			!full_name &&
			!position_business &&
			!address &&
			!business_sector_text &&
			(raw_birth_date === null || raw_birth_date === "");

		if (is_empty_row) {
			continue;
		}

		if (!full_name) {
			warnings.push({
				row_number,
				full_name: null,
				message: "Bỏ qua dòng vì thiếu Họ và Tên.",
				message_en: "Skipping row due to missing Full Name.",
			});
			continue;
		}

		const birth_date_result = parse_birth_date(raw_birth_date);

		if (birth_date_result.warning) {
			warnings.push({
				row_number,
				full_name,
				message: birth_date_result.warning,
				message_en: birth_date_result.warning_en ?? "",
			});
		}

		const { position_name, business_name } = split_position_and_business(position_business);

		rows.push({
			row_number,
			full_name,
			birth_date: birth_date_result.value,
			position_name,
			business_name,
			address: address || null,
			business_sector_text: business_sector_text || null,
		});
	}

	if (!rows.length) {
		throw new GenericError(
			{ vi: "File không có dòng dữ liệu hợp lệ", en: "The file does not contain valid data rows" },
			"BAD_REQUEST",
			400,
		);
	}

	return {
		sheet_name: matched_sheet_name,
		rows,
		warnings,
	};
};

const build_member_lookup_key = (full_name: string, business_id: string | null): string =>
	`${normalize_lookup_text(full_name)}::${business_id ?? ""}`;

const build_unique_slug = (base_text: string, used_slugs: Set<string>): string => {
	const base_slug = slugify(base_text);

	if (!base_slug) {
		throw new GenericError(
			{ vi: "Không thể tạo slug từ tên doanh nghiệp", en: "Cannot generate slug from business name" },
			"BAD_REQUEST",
			400,
			{ name: base_text },
		);
	}

	if (!used_slugs.has(base_slug)) {
		used_slugs.add(base_slug);
		return base_slug;
	}

	for (let index = 2; index <= 9999; index += 1) {
		const candidate = `${base_slug}-${index}`;

		if (!used_slugs.has(candidate)) {
			used_slugs.add(candidate);
			return candidate;
		}
	}

	throw new GenericError(
		{ vi: "Không thể tạo slug duy nhất", en: "Cannot generate a unique slug" },
		"CONFLICT",
		409,
		{ base_slug },
	);
};

export const memberService = {
	async import_from_file(body: MemberImportBody): Promise<MemberImportResponse> {
		const sequelize = assert_sequelize_ready();

		const parsed = await parse_rows_from_file(body.file_buffer, body.original_name, body.sheet_name);
		const warnings: ImportWarningItem[] = [...parsed.warnings];

		let created_member_count = 0;
		let updated_member_count = 0;
		let created_business_count = 0;
		let updated_business_count = 0;
		let created_position_count = 0;

		await sequelize.transaction(async (transaction) => {
			const now = new Date();

			const existing_businesses = await Business.findAll({
				attributes: ["id", "name", "slug", "address"],
				transaction: transaction || null,
			});

			const business_by_name = new Map<string, Business>();
			const used_slugs = new Set<string>();

			for (const business of existing_businesses) {
				business_by_name.set(normalize_lookup_text(business.name), business);
				used_slugs.add(business.slug);
			}

			const existing_positions = await Position.findAll({
				attributes: ["id", "name"],
				transaction: transaction || null,
			});

			const position_by_name = new Map<string, Position>();

			for (const position of existing_positions) {
				position_by_name.set(normalize_lookup_text(position.name), position);
			}

			const existing_members = await Member.findAll({
				attributes: ["id", "full_name", "birth_date", "business_id", "position_id"],
				transaction: transaction || null,
			});

			const member_by_key = new Map<string, Member>();

			for (const member of existing_members) {
				member_by_key.set(build_member_lookup_key(member.full_name, member.business_id ?? null), member);
			}

			const imported_member_keys = new Set<string>();

			for (const row of parsed.rows) {
				let resolved_business_id: string | null = null;

				if (row.business_name) {
					const business_lookup_key = normalize_lookup_text(row.business_name);
					let business = business_by_name.get(business_lookup_key);

					if (!business) {
						const create_payload: BusinessCreationAttributes = {
							name: row.business_name,
							slug: build_unique_slug(row.business_name, used_slugs),
							address: row.address,
							industry_ids: null,
							created_at: now,
							created_by: body.actor_id,
							updated_at: now,
							updated_by: body.actor_id,
						};

						business = await Business.create(create_payload, {
							transaction: transaction || null,
						});

						business_by_name.set(business_lookup_key, business);
						created_business_count += 1;
					} else {
						const need_update_address = !business.address && !!row.address;

						if (need_update_address && row.address) {
							const business_patch: Partial<BusinessAttributes> = {
								address: row.address,
								updated_at: now,
								updated_by: body.actor_id,
							};

							await business.update(business_patch, {
								transaction: transaction || null,
							});

							updated_business_count += 1;
						}
					}

					resolved_business_id = business.id;
				}

				let resolved_position_id: string | null = null;

				if (row.position_name) {
					const position_lookup_key = normalize_lookup_text(row.position_name);
					let position = position_by_name.get(position_lookup_key);

					if (!position) {
						position = await Position.create(
							{
								name: row.position_name,
								created_at: now,
								created_by: body.actor_id,
								updated_at: now,
								updated_by: body.actor_id,
							},
							{
								transaction: transaction || null,
							},
						);

						position_by_name.set(position_lookup_key, position);
						created_position_count += 1;
					}

					resolved_position_id = position.id;
				}

				const member_lookup_key = build_member_lookup_key(row.full_name, resolved_business_id);

				if (imported_member_keys.has(member_lookup_key)) {
					warnings.push({
						row_number: row.row_number,
						full_name: row.full_name,
						message: "member bị trùng trong cùng file import, hệ thống bỏ qua dòng này.",
						message_en: "Duplicate member in the same import file, skipping this row.",
					});
					continue;
				}

				imported_member_keys.add(member_lookup_key);

				const existing_member = member_by_key.get(member_lookup_key);

				if (!existing_member) {
					const create_payload: MemberCreationAttributes = {
						full_name: row.full_name,
						birth_date: row.birth_date,
						business_id: resolved_business_id,
						position_id: resolved_position_id,
						created_at: now,
						created_by: body.actor_id,
						updated_at: now,
						updated_by: body.actor_id,
					};

					const created_member = await Member.create(create_payload, {
						transaction: transaction || null,
					});

					member_by_key.set(member_lookup_key, created_member);
					created_member_count += 1;
					continue;
				}

				const patch: Partial<MemberAttributes> = {
					updated_at: now,
					updated_by: body.actor_id,
				};

				let has_changes = false;

				if (row.birth_date && row.birth_date !== existing_member.birth_date) {
					patch.birth_date = row.birth_date;
					has_changes = true;
				}

				if (resolved_business_id !== existing_member.business_id) {
					patch.business_id = resolved_business_id;
					has_changes = true;
				}

				if (resolved_position_id !== existing_member.position_id) {
					patch.position_id = resolved_position_id;
					has_changes = true;
				}

				if (has_changes) {
					await existing_member.update(patch, {
						transaction: transaction || null,
					});

					updated_member_count += 1;
				}
			}
		});

		return {
			sheet_name: parsed.sheet_name,
			total_rows: parsed.rows.length,
			created_member_count,
			updated_member_count,
			created_business_count,
			updated_business_count,
			created_position_count,
			warning_count: warnings.length,
			warnings,
		};
	},
};