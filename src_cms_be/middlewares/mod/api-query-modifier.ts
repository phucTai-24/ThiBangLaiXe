import type { Req, Res } from "#interfaces/IApi";
import type { NextFunction } from "express";

export function apiQueryModifier() {
	return (req: Req, _: Res, next: NextFunction) => {
		if (!req.query) return next();

		// Transform query parameters
		const queryEntries = Object.entries(req.query).filter(predicateQueryEntries);
		if (queryEntries.length === 0) return next();

		queryEntries.forEach(([key, value]) => {
			if (key.endsWith("[]")) return transformArrayQuery(key as `${string}[]`, value);
			if (key.startsWith("is_")) return transformBooleanQuery(key as `is_${string}`, value);
		});

		return next();

		function predicateQueryEntries([key]: [string, unknown]): boolean {
			return key.endsWith("[]") || key.startsWith("is_");
		}

		function transformArrayQuery(key: `${string}[]`, value: unknown) {
			const strippedKey = key.replace(/\[\]$/, "");
			delete req.query[key];
			req.query[strippedKey] = (Array.isArray(value) ? value : [value]).map((v: unknown) =>
				v === "null" ? null : v,
			) as any;
		}

		function transformBooleanQuery(key: `is_${string}`, value: unknown) {
			(req.query as Record<string, unknown>)[key] = value === "true" || value === "1";
		}
	};
}
