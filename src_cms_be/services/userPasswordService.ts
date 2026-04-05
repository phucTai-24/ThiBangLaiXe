import { GenericError } from "#interfaces/error/generic";
import { UserAuth } from "#models/UserAuth";

type CompareCallback = (err: unknown, same: boolean) => void;
type HashCallback = (err: unknown, hashed: string) => void;

type BcryptLike = {
	compare: (plain: string, hash: string, cb?: CompareCallback) => unknown;
	hash: (plain: string, rounds: number, cb?: HashCallback) => unknown;
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const hasOwn = (obj: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
const isFunction = (v: unknown): v is (...args: unknown[]) => unknown => typeof v === "function";
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const isThenable = (v: unknown): v is Promise<unknown> =>
	!!v && (typeof v === "object" || typeof v === "function") && "then" in (v as Record<string, unknown>);

const toBcryptLike = (mod: unknown): BcryptLike | null => {
	if (!isRecord(mod)) return null;

	const candidate = hasOwn(mod, "default") ? mod.default : mod;
	if (!candidate || !isRecord(candidate)) return null;

	const compare = candidate["compare"];
	const hash = candidate["hash"];

	if (!isFunction(compare) || !isFunction(hash)) return null;

	return {
		compare: compare as BcryptLike["compare"],
		hash: hash as BcryptLike["hash"],
	};
};

const loadBcrypt = async (): Promise<BcryptLike> => {
	try {
		const mod = (await import("bcrypt")) as unknown;
		const lib = toBcryptLike(mod);
		if (lib) return lib;
	} catch {
		// ignore
	}

	try {
		const mod = (await import("bcryptjs")) as unknown;
		const lib = toBcryptLike(mod);
		if (lib) return lib;
	} catch {
		// ignore
	}

	throw new GenericError(
		{ vi: "Thiếu thư viện bcrypt (bcrypt hoặc bcryptjs)", en: "Missing bcrypt library (bcrypt or bcryptjs)" },
		"INTERNAL_SERVER_ERROR",
		500,
	);
};

const compareWithLib = async (lib: BcryptLike, plain: string, hash: string): Promise<boolean> => {
	return await new Promise<boolean>((resolve, reject) => {
		const out = lib.compare(plain, hash, (err, same) => {
			if (err) return reject(err);
			return resolve(Boolean(same));
		});

		if (isThenable(out)) {
			out.then((v) => resolve(Boolean(v))).catch(reject);
		}
	});
};

const hashWithLib = async (lib: BcryptLike, plain: string, rounds: number): Promise<string> => {
	return await new Promise<string>((resolve, reject) => {
		const out = lib.hash(plain, rounds, (err, hashed) => {
			if (err) return reject(err);
			return resolve(String(hashed));
		});

		if (isThenable(out)) {
			out.then((v) => resolve(String(v))).catch(reject);
		}
	});
};

const getRounds = (): number => {
	const raw = process.env.BCRYPT_ROUNDS;
	const n = raw ? Number(raw) : 12;
	return Number.isFinite(n) && n >= 4 && n <= 20 ? n : 12;
};

const comparePassword = async (plain: string, hashed: string): Promise<boolean> => {
	const lib = await loadBcrypt();
	return await compareWithLib(lib, plain, hashed);
};

const hashPassword = async (plain: string): Promise<string> => {
	const lib = await loadBcrypt();
	return await hashWithLib(lib, plain, getRounds());
};

const readStringField = (obj: Record<string, unknown>, key: string): string => {
	if (!hasOwn(obj, key)) {
		throw new GenericError({ vi: `Thiếu trường ${key}`, en: `Missing ${key}` }, "BAD_REQUEST", 400);
	}

	const raw = obj[key];
	if (!isNonEmptyString(raw)) {
		throw new GenericError({ vi: `Trường ${key} không hợp lệ`, en: `Invalid ${key}` }, "BAD_REQUEST", 400);
	}

	return raw.trim();
};

export const changePasswordForCurrentUser = async (args: { userId: string; body: unknown }): Promise<void> => {
	const body = isRecord(args.body) ? args.body : {};

	const oldPassword = readStringField(body, "oldPassword");
	const newPassword = readStringField(body, "newPassword");

	// BE validate theo task
	if (newPassword.length < 6) {
		throw new GenericError(
			{ vi: "Mật khẩu mới phải có ít nhất 6 ký tự", en: "New password must be at least 6 characters" },
			"BAD_REQUEST",
			400,
		);
	}

	if (newPassword === oldPassword) {
		throw new GenericError(
			{ vi: "Mật khẩu mới không được trùng mật khẩu cũ", en: "New password must not equal old password" },
			"BAD_REQUEST",
			400,
		);
	}

	const auth = await UserAuth.findOne({ where: { user_id: args.userId } });
	if (!auth) {
		throw new GenericError({ vi: "Không tìm thấy thông tin xác thực", en: "User auth not found" }, "NOT_FOUND", 404);
	}

	const currentHash = auth.password_hash;
	if (!isNonEmptyString(currentHash)) {
		throw new GenericError(
			{ vi: "Dữ liệu mật khẩu hiện tại không hợp lệ", en: "Invalid current password hash" },
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}

	const ok = await comparePassword(oldPassword, currentHash);
	if (!ok) {
		throw new GenericError({ vi: "Mật khẩu cũ không đúng", en: "Old password is incorrect" }, "BAD_REQUEST", 400);
	}

	const nextHash = await hashPassword(newPassword);

	await auth.update({
		password_hash: nextHash,
	});
};
