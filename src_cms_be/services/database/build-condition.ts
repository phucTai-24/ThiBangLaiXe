import { Op } from "sequelize";
import dayjs from "dayjs";

enum Operators {
	Equal = "==",
	NotEqual = "!=",
	GreaterOrEqual = ">=",
	LessOrEqual = "<=",
	Greater = ">",
	Less = "<",
	Contains = "@=",
	StartsWith = "_=",
	DoesNotContain = "!@=",
	DoesNotStartWith = "!_=",
	DateBetween = "[]",
}

const listOperators = [
	{ operator: "==", meaning: "Equals" },
	{ operator: "!=", meaning: "Not equals" },
	{ operator: ">=", meaning: "Greater than or equal to" },
	{ operator: "<=", meaning: "Less than or equal to" },
	{ operator: ">", meaning: "Greater than" },
	{ operator: "<", meaning: "Less than" },
	{ operator: "@=", meaning: "Contains" },
	{ operator: "_=", meaning: "Starts with" },
	{ operator: "!@=", meaning: "Does not Contains" },
	{ operator: "!_=", meaning: "Does not Starts with" },
	{ operator: "[]", meaning: "Only datetime, date between two date" },
];

const getBetweenCondition = (str: string) => str.replace(/[()]/g, "").trim();

function genCondition(arrLeftRight: string[], character: string): { [op: string]: unknown } {
	let conditionLeft: string = arrLeftRight[0] ?? "";
	if (conditionLeft.includes(".")) conditionLeft = `$${conditionLeft}$`;

	let conditionRight: string | null = arrLeftRight[1] ?? null;
	if (conditionRight == "null") conditionRight = null;

	switch (character) {
		case Operators.Equal:
			return { [conditionLeft]: conditionRight };
		case Operators.NotEqual:
			return { [conditionLeft]: { [Op.not]: conditionRight } };
		case Operators.GreaterOrEqual:
			return {
				[conditionLeft]: {
					[Op.gte]: conditionRight,
				},
			};
		case Operators.LessOrEqual:
			return {
				[conditionLeft]: {
					[Op.lte]: conditionRight,
				},
			};
		case Operators.Greater:
			return {
				[conditionLeft]: {
					[Op.gt]: conditionRight,
				},
			};
		case Operators.Less:
			return {
				[conditionLeft]: {
					[Op.lt]: conditionRight,
				},
			};
		case Operators.Contains:
			return {
				[conditionLeft]: {
					[Op.iLike]: "%" + conditionRight + "%",
				},
			};
		case Operators.StartsWith:
			return {
				[conditionLeft]: {
					[Op.startsWith]: conditionRight,
				},
			};
		case Operators.DoesNotContain:
			return {
				[conditionLeft]: {
					[Op.notLike]: "%" + conditionRight + "%",
				},
			};
		case Operators.DoesNotStartWith:
			return {
				[conditionLeft]: {
					[Op.notILike]: "%" + conditionRight,
				},
			};
		case Operators.DateBetween: {
			if (!conditionRight) return {};
			const valSearch = getBetweenCondition(conditionRight);
			const [start, end] = valSearch.split("-").map((data) => new Date(data));

			return {
				[conditionLeft]: {
					[Op.between]: [start, end],
				},
			};
		}
		default:
			return {};
	}
}

export function generateConditionExtra(params: string): { [op: string]: unknown }[] | null {
	try {
		const character = listOperators.find(({ operator }) => params.includes(operator))?.operator ?? "";
		const [leftOp, rightOp] = params.split(character).map((data) => data.trim());

		if (!leftOp || !rightOp) return null;

		const conditionRight = rightOp.replace(/[()]/g, "").split("|");
		const conditionReturn: Array<{ [op: string]: unknown }> = [];
		const arr: string[] = [];

		if (!leftOp.includes("|")) arr.push(leftOp);
		else arr.push(...getBetweenCondition(leftOp).split("|"));

		arr.forEach((element) => {
			conditionRight.forEach((right) => {
				const arrAppend = [element, right.trim()];
				const obj = genCondition(arrAppend, character);
				conditionReturn.push(obj);
			});
		});

		return conditionReturn;
	} catch (ex) {
		return [];
	}
}

export function generateCondition(params: string): { [op: string]: unknown } {
	try {
		const character = listOperators.find(({ operator }) => params.includes(operator))?.operator;
		if (!character) return {};

		const [leftOp, rightOp] = params.split(character).map((data) => data.trim());

		if (!leftOp || !rightOp) return {};

		return genCondition([leftOp, rightOp], character);
	} catch (ex) {
		return {};
	}
}

export function getCorrectFormatTime(value: string | number | Date | dayjs.Dayjs) {
	const arrayFormat = ["YYYY/MM/DD", "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"];

	for (let index = 0; index < arrayFormat.length; index++) {
		const element = arrayFormat[index];
		if (dayjs(value, element, true).isValid()) {
			return element;
		}
	}

	return null;
}

export default {
	generateCondition,
	generateConditionExtra,
	getCorrectFormatTime,
};
