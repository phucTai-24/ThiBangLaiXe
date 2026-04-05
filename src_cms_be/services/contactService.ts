import type { ModelStatic, Order, FindAndCountOptions } from "sequelize";

import initExport from "#services/database/sequelize/initExport";
import type { SequelizeApiPaginatePayload } from "#services/database/sequelize/types";
import { GenericError } from "#interfaces/error/generic";

// After comparing with other files, the ContactStatus type and CONTACT_STATUS array should be defined here
import type { Contact, ContactAttributes, ContactCreationAttributes } from "#models/Contact";

export type ContactStatus = "new" | "seen" | "replied";

export interface ContactListResult {
	rows: Contact[];
	count: number;
	page: number;
	pageSize: number;
}

function getContactModel(): ModelStatic<Contact> {
	const model = (initExport as unknown as { Contact?: ModelStatic<Contact> }).Contact;
	if (!model) {
		throw new GenericError(
			{ vi: "Model Contact chưa được sinh. Hãy chạy pnpm gen-db", en: "Contact model not generated. Run pnpm gen-db" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
	return model;
}

function buildOrder(payload?: SequelizeApiPaginatePayload<ContactAttributes>): Order | undefined {
	if (!payload?.sortField) return undefined;

	const raw = (payload.sortOrder || "").toString().toUpperCase();
	const direction = raw === "DESC" ? "DESC" : "ASC";
	return [[payload.sortField, direction]];
}

export async function createContact(input: {
	fullname: string;
	email: string;
	phone: string;
	title: string;
	content: string;
}): Promise<Contact> {
	const ContactModel = getContactModel();

	const payload: ContactCreationAttributes = {
		...input,
		status: "new" as ContactStatus,
	};

	return ContactModel.create(payload);
}

export async function getContacts(
	payload?: SequelizeApiPaginatePayload<ContactAttributes>,
): Promise<ContactListResult> {
	const ContactModel = getContactModel();

	const page = payload?.page ?? 1;
	const pageSize = payload?.pageSize ?? 10;

	const options: FindAndCountOptions<ContactAttributes> = {
		limit: pageSize,
		offset: (page - 1) * pageSize,
	};

	// Do exactOptionalPropertyTypes, No set where/order = undefined
	if (payload?.filters) {
		options.where = payload.filters;
	}

	const order = buildOrder(payload);
	if (order) {
		options.order = order;
	}

	const { rows, count } = await ContactModel.findAndCountAll(options);

	return {
		rows,
		count, // count is a number (no need for count.length)
		page,
		pageSize,
	};
}

export async function getContactById(id: string): Promise<Contact> {
	const ContactModel = getContactModel();

	const found = await ContactModel.findByPk(id);
	if (!found) {
		throw new GenericError({ vi: "Contact không tồn tại", en: "Contact not found" }, "NOT_FOUND", 404);
	}

	return found;
}

export async function updateContactById(
	id: string,
	patch: Partial<Pick<ContactAttributes, "fullname" | "email" | "phone" | "title" | "content" | "status">>,
): Promise<Contact> {
	const ContactModel = getContactModel();

	const found = await ContactModel.findByPk(id);
	if (!found) {
		throw new GenericError({ vi: "Contact không tồn tại", en: "Contact not found" }, "NOT_FOUND", 404);
	}

	await found.update(patch);
	return found;
}

export async function deleteContactById(id: string): Promise<void> {
	const ContactModel = getContactModel();

	const found = await ContactModel.findByPk(id);
	if (!found) {
		throw new GenericError({ vi: "Contact không tồn tại", en: "Contact not found" }, "NOT_FOUND", 404);
	}

	await found.destroy();
}
