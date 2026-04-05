import { Op, type FindAndCountOptions, type Transaction, type WhereOptions } from "sequelize";

import { GenericError } from "#interfaces/error/generic";
import { File, type FileAttributes } from "#models/File";
import { Member } from "#models/Member";
import { Position } from "#models/Position";
import { Term, type TermAttributes, type TermCreationAttributes } from "#models/Term";
import { TermPosition, type TermPositionCreationAttributes } from "#models/TermPosition";
import {
	TermPositionMember,
	type TermPositionMemberCreationAttributes,
} from "#models/TermPositionMember";

interface TermPositionInput {
	position_id: string;
	member_ids: string[];
}

interface TermCreateDto {
	name: string;
	start_date: string;
	end_date: string;
	positions: TermPositionInput[];
}

type TermUpdateDto = Partial<{
	name: string;
	start_date: string;
	end_date: string;
	positions: TermPositionInput[];
}>;

export interface TermMemberAvatarResponse {
	id: string;
	path: string;
}

interface TermMemberResponse {
	member_id: string;
	full_name: string | null;
	avatar: TermMemberAvatarResponse | null;
}

interface TermPositionResponse {
	position_id: string;
	name: string;
	members: TermMemberResponse[];
}

export interface TermResponse {
	term_id: string;
	name: string;
	start_date: string;
	end_date: string;
	positions: TermPositionResponse[];
}

type SortOrder = "ASC" | "DESC";

interface ListPayload {
	page?: unknown;
	pageSize?: unknown;
	sortField?: unknown;
	sortOrder?: unknown;
	filters?: unknown;
}

interface MemberAvatarInput {
	id: string;
	avatar_url?: string | null;
}

const UUID_V4_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowed_sort_fields: ReadonlyArray<keyof TermAttributes> = [
	"updated_at",
	"created_at",
	"name",
	"start_date",
	"end_date",
];

const is_record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const is_non_empty_string = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0;

const unique_strings = (items: ReadonlyArray<string | null | undefined>): string[] => {
	const normalized_items = items
		.filter(is_non_empty_string)
		.map((item) => item.trim())
		.filter(Boolean);

	return Array.from(new Set(normalized_items));
};

const to_positive_int = (value: unknown, fallback: number): number => {
	const number_value =
		typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;

	if (!Number.isFinite(number_value) || number_value <= 0) return fallback;

	return Math.floor(number_value);
};

const normalize_sort_order = (value: unknown): SortOrder | null => {
	if (typeof value !== "string") return null;

	const normalized_value = value.trim().toUpperCase();

	return normalized_value === "ASC" || normalized_value === "DESC"
		? normalized_value
		: null;
};

const normalize_sort_field = (value: unknown): keyof TermAttributes => {
	if (typeof value !== "string") return "updated_at";

	const normalized_value = value.trim() as keyof TermAttributes;

	return allowed_sort_fields.includes(normalized_value)
		? normalized_value
		: "updated_at";
};

const with_tx = (transaction?: Transaction | null): { transaction: Transaction | null } => ({
	transaction: transaction || null,
});

const assert_sequelize_ready = () => {
	const sequelize = Term.sequelize;

	if (!sequelize) {
		throw new GenericError(
			{ vi: "Sequelize chưa sẵn sàng", en: "Sequelize is not ready" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return sequelize;
};

const assert_date_range = (start_date: string, end_date: string): void => {
	if (start_date && end_date && start_date > end_date) {
		throw new GenericError(
			{ vi: "start_date phải nhỏ hơn hoặc bằng end_date", en: "start_date must be <= end_date" },
			"BAD_REQUEST",
			400,
		);
	}
};

const assert_positions_exist = async (
	position_ids: string[],
	transaction?: Transaction | null,
): Promise<void> => {
	const unique_position_ids = unique_strings(position_ids);

	if (!unique_position_ids.length) return;

	const rows = await Position.findAll({
		where: { id: { [Op.in]: unique_position_ids } },
		attributes: ["id"],
		...with_tx(transaction),
	});

	const found_position_ids = new Set(rows.map((row) => row.id));
	const missing_position_ids = unique_position_ids.filter(
		(position_id) => !found_position_ids.has(position_id),
	);

	if (missing_position_ids.length) {
		throw new GenericError(
			{ vi: "Position không tồn tại", en: "Position not found" },
			"BAD_REQUEST",
			400,
			{ position_ids: missing_position_ids },
		);
	}
};

const assert_members_exist = async (
	member_ids: string[],
	transaction?: Transaction | null,
): Promise<void> => {
	const unique_member_ids = unique_strings(member_ids);

	if (!unique_member_ids.length) return;

	const rows = await Member.findAll({
		where: { id: { [Op.in]: unique_member_ids } },
		attributes: ["id"],
		...with_tx(transaction),
	});

	const found_member_ids = new Set(rows.map((row) => row.id));
	const missing_member_ids = unique_member_ids.filter(
		(member_id) => !found_member_ids.has(member_id),
	);

	if (missing_member_ids.length) {
		throw new GenericError(
			{ vi: "Member không tồn tại", en: "Member not found" },
			"BAD_REQUEST",
			400,
			{ member_ids: missing_member_ids },
		);
	}
};

const build_file_where = (
	file_ids: string[],
	file_paths: string[],
): WhereOptions<FileAttributes> => {
	const has_file_ids = file_ids.length > 0;
	const has_file_paths = file_paths.length > 0;

	if (has_file_ids && has_file_paths) {
		return {
			[Op.or]: [
				{ id: { [Op.in]: file_ids } },
				{ path: { [Op.in]: file_paths } },
			],
		} as WhereOptions<FileAttributes>;
	}

	if (has_file_ids) {
		return { id: { [Op.in]: file_ids } };
	}

	return { path: { [Op.in]: file_paths } };
};

const build_avatar_by_member_id = async (
	members: MemberAvatarInput[],
	transaction?: Transaction | null,
): Promise<Map<string, TermMemberAvatarResponse>> => {
	const avatar_refs: Array<{ member_id: string; ref: string }> = [];

	for (const member of members) {
		if (!is_non_empty_string(member.avatar_url)) continue;

		const normalized_ref = member.avatar_url.trim();

		if (!normalized_ref) continue;

		avatar_refs.push({
			member_id: member.id,
			ref: normalized_ref,
		});
	}

	if (!avatar_refs.length) return new Map();

	const file_ids: string[] = [];
	const file_paths: string[] = [];

	for (const avatar_ref of avatar_refs) {
		if (UUID_V4_REGEX.test(avatar_ref.ref)) {
			file_ids.push(avatar_ref.ref);
			continue;
		}

		file_paths.push(avatar_ref.ref);
	}

	const unique_file_ids = unique_strings(file_ids);
	const unique_file_paths = unique_strings(file_paths);

	if (!unique_file_ids.length && !unique_file_paths.length) {
		return new Map();
	}

	const files = await File.findAll({
		where: build_file_where(unique_file_ids, unique_file_paths),
		attributes: ["id", "path"],
		...with_tx(transaction),
	});

	const file_by_id = new Map<string, { id: string; path: string }>();
	const file_by_path = new Map<string, { id: string; path: string }>();

	for (const file of files) {
		file_by_id.set(file.id, { id: file.id, path: file.path });
		file_by_path.set(file.path, { id: file.id, path: file.path });
	}

	const avatar_by_member_id = new Map<string, TermMemberAvatarResponse>();

	for (const avatar_ref of avatar_refs) {
		const matched_file = UUID_V4_REGEX.test(avatar_ref.ref)
			? file_by_id.get(avatar_ref.ref)
			: file_by_path.get(avatar_ref.ref);

		if (!matched_file) continue;

		avatar_by_member_id.set(avatar_ref.member_id, {
			id: matched_file.id,
			path: matched_file.path,
		});
	}

	return avatar_by_member_id;
};

const build_terms_response = async (
	terms: Term[],
	transaction?: Transaction | null,
): Promise<TermResponse[]> => {
	if (!terms.length) return [];

	const term_ids = terms.map((term) => term.id);

	const term_positions = await TermPosition.findAll({
		where: { term_id: { [Op.in]: term_ids } },
		attributes: ["id", "term_id", "position_id", "created_at"],
		order: [["created_at", "ASC"]],
		...with_tx(transaction),
	});

	const term_position_ids = term_positions.map((term_position) => term_position.id);
	const position_ids = unique_strings(
		term_positions.map((term_position) => term_position.position_id),
	);

	const positions = position_ids.length
		? await Position.findAll({
				where: { id: { [Op.in]: position_ids } },
				attributes: ["id", "name"],
				...with_tx(transaction),
			})
		: [];

	const position_name_by_id = new Map<string, string>();

	for (const position of positions) {
		position_name_by_id.set(position.id, position.name);
	}

	const term_position_members = term_position_ids.length
		? await TermPositionMember.findAll({
				where: { term_position_id: { [Op.in]: term_position_ids } },
				attributes: ["term_position_id", "member_id", "created_at"],
				order: [["created_at", "ASC"]],
				...with_tx(transaction),
			})
		: [];

	const member_ids = unique_strings(
		term_position_members.map((term_position_member) => term_position_member.member_id),
	);

	const member_records = member_ids.length
		? await Member.findAll({
				where: { id: { [Op.in]: member_ids } },
				attributes: ["id", "full_name", "avatar_url"],
				...with_tx(transaction),
			})
		: [];

	const avatar_by_member_id = await build_avatar_by_member_id(
		member_records.map((member) => ({
			id: member.id,
			avatar_url: member.avatar_url ?? null,
		})),
		transaction,
	);

	const member_by_id = new Map<
		string,
		{ full_name: string | null; avatar: TermMemberAvatarResponse | null }
	>();

	for (const member of member_records) {
		member_by_id.set(member.id, {
			full_name: member.full_name ?? null,
			avatar: avatar_by_member_id.get(member.id) ?? null,
		});
	}

	const members_by_term_position_id = new Map<string, TermMemberResponse[]>();

	for (const term_position_member of term_position_members) {
		if (!is_non_empty_string(term_position_member.member_id)) continue;

		const member_info = member_by_id.get(term_position_member.member_id) ?? {
			full_name: null,
			avatar: null,
		};

		const current_members =
			members_by_term_position_id.get(term_position_member.term_position_id) ?? [];

		current_members.push({
			member_id: term_position_member.member_id,
			full_name: member_info.full_name,
			avatar: member_info.avatar,
		});

		members_by_term_position_id.set(
			term_position_member.term_position_id,
			current_members,
		);
	}

	const term_positions_by_term_id = new Map<string, TermPosition[]>();

	for (const term_position of term_positions) {
		const current_term_positions =
			term_positions_by_term_id.get(term_position.term_id) ?? [];

		current_term_positions.push(term_position);

		term_positions_by_term_id.set(term_position.term_id, current_term_positions);
	}

	return terms.map((term) => {
		const current_term_positions = term_positions_by_term_id.get(term.id) ?? [];

		const positions_response: TermPositionResponse[] = current_term_positions.map(
			(term_position) => ({
				position_id: term_position.position_id,
				name: position_name_by_id.get(term_position.position_id) ?? "",
				members:
					members_by_term_position_id.get(term_position.id) ?? [],
			}),
		);

		return {
			term_id: term.id,
			name: term.name,
			start_date: term.start_date,
			end_date: term.end_date,
			positions: positions_response,
		};
	});
};

const build_term_response = async (
	term: Term,
	transaction?: Transaction | null,
): Promise<TermResponse> => {
	const [term_response] = await build_terms_response([term], transaction);

	if (!term_response) {
		throw new GenericError(
			{ vi: "Không thể build response", en: "Cannot build response" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	return term_response;
};

export const termService = {
	async getAll(payload: unknown) {
		const normalized_payload = (payload ?? {}) as ListPayload;

		const page = to_positive_int(normalized_payload.page, 1);
		const page_size = to_positive_int(normalized_payload.pageSize, 10);
		const sort_field = normalize_sort_field(normalized_payload.sortField);
		const sort_order = normalize_sort_order(normalized_payload.sortOrder) ?? "DESC";

		const where = is_record(normalized_payload.filters)
			? (normalized_payload.filters as WhereOptions<TermAttributes>)
			: undefined;

		const options: FindAndCountOptions<TermAttributes> = {
			limit: page_size,
			offset: (page - 1) * page_size,
			order: [[String(sort_field), sort_order]],
			...(where ? { where } : {}),
		};

		const result = await Term.findAndCountAll(options);
		const rows = await build_terms_response(result.rows);

		return {
			rows,
			count: result.count,
			page,
			pageSize: page_size,
		};
	},

	async getById(id: string): Promise<TermResponse> {
		const term = await Term.findByPk(id);

		if (!term) {
			throw new GenericError(
				{ vi: "Term không tồn tại", en: "Term not found" },
				"NOT_FOUND",
				404,
			);
		}

		return build_term_response(term);
	},

	async create(body: TermCreateDto, actor_id: string | null): Promise<TermResponse> {
		const sequelize = assert_sequelize_ready();
		const now = new Date();

		const name = body.name.trim();
		const position_ids = unique_strings(
			body.positions.map((position_item) => position_item.position_id),
		);

		if (position_ids.length !== body.positions.length) {
			throw new GenericError(
				{ vi: "positions bị trùng position_id", en: "Duplicate position_id in positions" },
				"BAD_REQUEST",
				400,
			);
		}

		const member_ids = unique_strings(
			body.positions.flatMap((position_item) => position_item.member_ids),
		);

		assert_date_range(body.start_date, body.end_date);

		return sequelize.transaction(async (transaction) => {
			await assert_positions_exist(position_ids, transaction);
			await assert_members_exist(member_ids, transaction);

			const created_term = await Term.create(
				{
					name,
					start_date: body.start_date,
					end_date: body.end_date,
					created_at: now,
					created_by: actor_id,
					updated_at: now,
					updated_by: actor_id,
				} satisfies TermCreationAttributes,
				{ transaction: transaction || null },
			);

			const term_position_payloads: TermPositionCreationAttributes[] = body.positions.map(
				(position_item) => ({
					term_id: created_term.id,
					position_id: position_item.position_id,
					created_at: now,
					created_by: actor_id,
					updated_at: now,
					updated_by: actor_id,
				}),
			);

			const created_term_positions = await TermPosition.bulkCreate(term_position_payloads, {
				transaction: transaction || null,
				returning: true,
			});

			const term_position_id_by_position_id = new Map<string, string>();

			for (const created_term_position of created_term_positions) {
				term_position_id_by_position_id.set(
					created_term_position.position_id,
					created_term_position.id,
				);
			}

			const term_position_member_payloads: TermPositionMemberCreationAttributes[] = [];

			for (const position_item of body.positions) {
				const term_position_id = term_position_id_by_position_id.get(
					position_item.position_id,
				);

				if (!term_position_id) {
					throw new GenericError(
						{
							vi: "Không thể tạo term_positions",
							en: "Cannot create term_positions",
						},
						"INTERNAL_SERVER_ERROR",
						500,
					);
				}

				const normalized_member_ids = unique_strings(position_item.member_ids);

				if (!normalized_member_ids.length) {
					throw new GenericError(
						{ vi: "member_ids không hợp lệ", en: "Invalid member_ids" },
						"BAD_REQUEST",
						400,
						{ position_id: position_item.position_id },
					);
				}

				for (const member_id of normalized_member_ids) {
					term_position_member_payloads.push({
						term_position_id,
						member_id,
						created_at: now,
						created_by: actor_id,
						updated_at: now,
						updated_by: actor_id,
					});
				}
			}

			if (term_position_member_payloads.length) {
				await TermPositionMember.bulkCreate(term_position_member_payloads, {
					transaction: transaction || null,
				});
			}

			const fresh_term = await Term.findByPk(created_term.id, {
				transaction: transaction || null,
			});

			if (!fresh_term) {
				throw new GenericError(
					{
						vi: "Không thể tải lại term sau khi tạo",
						en: "Cannot reload term after create",
					},
					"INTERNAL_SERVER_ERROR",
					500,
				);
			}

			return build_term_response(fresh_term, transaction);
		});
	},

	async update(
		id: string,
		body: TermUpdateDto,
		actor_id: string | null,
	): Promise<TermResponse> {
		const sequelize = assert_sequelize_ready();
		const now = new Date();

		return sequelize.transaction(async (transaction) => {
			const term = await Term.findByPk(id, { transaction: transaction || null });

			if (!term) {
				throw new GenericError(
					{ vi: "Term không tồn tại", en: "Term not found" },
					"NOT_FOUND",
					404,
				);
			}

			const next_start_date = body.start_date ?? term.start_date;
			const next_end_date = body.end_date ?? term.end_date;

			assert_date_range(next_start_date, next_end_date);

			const patch: Partial<TermAttributes> = {
				updated_at: now,
				updated_by: actor_id,
			};

			if (is_non_empty_string(body.name)) {
				patch.name = body.name.trim();
			}

			if (is_non_empty_string(body.start_date)) {
				patch.start_date = body.start_date.trim();
			}

			if (is_non_empty_string(body.end_date)) {
				patch.end_date = body.end_date.trim();
			}

			await term.update(patch, { transaction: transaction || null });

			if (body.positions !== undefined) {
				const position_ids = unique_strings(
					body.positions.map((position_item) => position_item.position_id),
				);

				if (position_ids.length !== body.positions.length) {
					throw new GenericError(
						{
							vi: "positions bị trùng position_id",
							en: "Duplicate position_id in positions",
						},
						"BAD_REQUEST",
						400,
					);
				}

				const member_ids = unique_strings(
					body.positions.flatMap((position_item) => position_item.member_ids),
				);

				await assert_positions_exist(position_ids, transaction);
				await assert_members_exist(member_ids, transaction);

				const existing_term_positions = await TermPosition.findAll({
					where: { term_id: id },
					attributes: ["id"],
					...with_tx(transaction),
				});

				const existing_term_position_ids = existing_term_positions.map(
					(term_position) => term_position.id,
				);

				if (existing_term_position_ids.length) {
					await TermPositionMember.destroy({
						where: {
							term_position_id: {
								[Op.in]: existing_term_position_ids,
							},
						},
						...with_tx(transaction),
					});
				}

				await TermPosition.destroy({
					where: { term_id: id },
					...with_tx(transaction),
				});

				const term_position_payloads: TermPositionCreationAttributes[] =
					body.positions.map((position_item) => ({
						term_id: id,
						position_id: position_item.position_id,
						created_at: now,
						created_by: actor_id,
						updated_at: now,
						updated_by: actor_id,
					}));

				const created_term_positions = await TermPosition.bulkCreate(
					term_position_payloads,
					{
						transaction: transaction || null,
						returning: true,
					},
				);

				const term_position_id_by_position_id = new Map<string, string>();

				for (const created_term_position of created_term_positions) {
					term_position_id_by_position_id.set(
						created_term_position.position_id,
						created_term_position.id,
					);
				}

				const term_position_member_payloads: TermPositionMemberCreationAttributes[] = [];

				for (const position_item of body.positions) {
					const term_position_id = term_position_id_by_position_id.get(
						position_item.position_id,
					);

					if (!term_position_id) {
						throw new GenericError(
							{
								vi: "Không thể tạo term_positions",
								en: "Cannot create term_positions",
							},
							"INTERNAL_SERVER_ERROR",
							500,
						);
					}

					const normalized_member_ids = unique_strings(position_item.member_ids);

					if (!normalized_member_ids.length) {
						throw new GenericError(
							{ vi: "member_ids không hợp lệ", en: "Invalid member_ids" },
							"BAD_REQUEST",
							400,
							{ position_id: position_item.position_id },
						);
					}

					for (const member_id of normalized_member_ids) {
						term_position_member_payloads.push({
							term_position_id,
							member_id,
							created_at: now,
							created_by: actor_id,
							updated_at: now,
							updated_by: actor_id,
						});
					}
				}

				if (term_position_member_payloads.length) {
					await TermPositionMember.bulkCreate(term_position_member_payloads, {
						transaction: transaction || null,
					});
				}
			}

			const fresh_term = await Term.findByPk(id, {
				transaction: transaction || null,
			});

			if (!fresh_term) {
				throw new GenericError(
					{
						vi: "Không thể tải lại term sau khi cập nhật",
						en: "Cannot reload term after update",
					},
					"INTERNAL_SERVER_ERROR",
					500,
				);
			}

			return build_term_response(fresh_term, transaction);
		});
	},

	async remove(id: string): Promise<boolean> {
		const sequelize = assert_sequelize_ready();

		return sequelize.transaction(async (transaction) => {
			const term = await Term.findByPk(id, { transaction: transaction || null });

			if (!term) {
				throw new GenericError(
					{ vi: "Term không tồn tại", en: "Term not found" },
					"NOT_FOUND",
					404,
				);
			}

			const term_positions = await TermPosition.findAll({
				where: { term_id: id },
				attributes: ["id"],
				...with_tx(transaction),
			});

			const term_position_ids = term_positions.map((term_position) => term_position.id);

			if (term_position_ids.length) {
				await TermPositionMember.destroy({
					where: {
						term_position_id: {
							[Op.in]: term_position_ids,
						},
					},
					...with_tx(transaction),
				});
			}

			await TermPosition.destroy({
				where: { term_id: id },
				...with_tx(transaction),
			});

			await Term.destroy({
				where: { id },
				...with_tx(transaction),
			});

			return true;
		});
	},
};