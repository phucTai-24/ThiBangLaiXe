import { Op } from "sequelize";
import { Response, NextFunction } from "express";
import { Req } from "#interfaces/IApi";
import { generateCondition, generateConditionExtra } from "#services/database/build-condition";
import { SequelizeApiPaginatePayload } from "#services/database/sequelize/types";
export default queryModifier;

export function queryModifier(req: Req, _res: Response, next: NextFunction) {
	const payload: SequelizeApiPaginatePayload = {
		pageSize: parseInt(req.query.pageSize?.toString() || "10"),
		page: parseInt(req.query.page?.toString() || "1"),
		sortField: req.query.sortField?.toString() || "",
		sortOrder: req.query.sortOrder?.toString() || "",
		rawFilter: req.query.filters?.toString() || "",
		filters: {},
		dateField: [],
	};
	if (payload.filters == null) payload.filters = {};
	else {
		const arrFilters: string[] = payload.rawFilter ? payload.rawFilter.split(",") : [];
		const conditionCheckedChild: unknown[] = [];
		arrFilters.forEach((element) => {
			if (element.includes("|")) {
				const objCondition = generateConditionExtra(element);
				if (!objCondition) return;
				const conditionNotOr = {
					[Op.or]: objCondition,
				};
				conditionCheckedChild.push(conditionNotOr);
			} else {
				const conditionNotOr = generateCondition(element);
				if (!conditionNotOr) return;

				conditionCheckedChild.push(conditionNotOr);
			}
		});
		payload.filters = { [Op.and]: conditionCheckedChild as any };
	}

	if (!payload.page || payload.page <= 0) payload.page = 1;
	if (!payload.pageSize || payload.pageSize <= 0) payload.pageSize = 10;
	if (!payload.sortField) payload.sortField = "";
	if (!payload.sortOrder) payload.sortOrder = "";

	req.payload = payload;
	next();
}
