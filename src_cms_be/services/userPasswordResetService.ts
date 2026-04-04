import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { GenericError } from "#interfaces/error/generic";
import { User } from "#models/User";
import { UserAuth, type UserAuthAttributes } from "#models/UserAuth";
import MailService from "#services/mailService";

const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_VERIFY_ATTEMPTS = 5;

const RESET_TOKEN_EXPIRES_MINUTES = 15;

interface SendOtpInput {
	email: string;
}

interface VerifyOtpInput {
	email: string;
	otp: string;
}

interface ResetPasswordInput {
	reset_token: string;
	new_password: string;
}

export interface SendOtpResult {
	email: string;
	expires_at: Date | null;
	resend_after_seconds: number;
}

export interface VerifyOtpResult {
	reset_token: string;
	expires_in: number;
}

interface ResetTokenPayload {
	sub: string; // user_id
	otp_hash: string;
	iat?: number;
	exp?: number;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const getOtpSecret = (): string => {
	const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || "";
	if (!secret) {
		throw new GenericError(
			{ vi: "Thiếu cấu hình OTP_SECRET/JWT_SECRET", en: "Missing OTP_SECRET/JWT_SECRET" },
			"CONFIG_ERROR",
			500,
		);
	}
	return secret;
};

const getResetTokenSecret = (): string => {
	const secret = process.env.RESET_PASSWORD_TOKEN_SECRET || process.env.JWT_SECRET || "";
	if (!secret) {
		throw new GenericError(
			{ vi: "Thiếu cấu hình RESET_PASSWORD_TOKEN_SECRET/JWT_SECRET", en: "Missing RESET_PASSWORD_TOKEN_SECRET/JWT_SECRET" },
			"CONFIG_ERROR",
			500,
		);
	}
	return secret;
};

const generateOtp = (): string => crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

const hashOtp = (email: string, otp: string): string => {
	const secret = getOtpSecret();
	// bind otp with email to reduce replay chance across accounts
	return crypto.createHmac("sha256", secret).update(`${normalizeEmail(email)}|${otp}`).digest("hex");
};

const timingSafeEqualHex = (aHex: string, bHex: string): boolean => {
	const a = Buffer.from(aHex, "hex");
	const b = Buffer.from(bHex, "hex");
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
};

const signResetToken = (payload: ResetTokenPayload): string => {
	const secret = getResetTokenSecret();
	return jwt.sign(payload, secret, { expiresIn: `${RESET_TOKEN_EXPIRES_MINUTES}m` });
};

const verifyResetToken = (token: string): ResetTokenPayload => {
	const secret = getResetTokenSecret();
	const decoded = jwt.verify(token, secret);

	if (!decoded || typeof decoded !== "object") {
		throw new GenericError({ vi: "Reset token không hợp lệ", en: "Invalid reset token" }, "INVALID_TOKEN", 400);
	}

	const obj = decoded as Record<string, unknown>;
	const sub = typeof obj.sub === "string" ? obj.sub : null;
	const otpHash = typeof obj.otp_hash === "string" ? obj.otp_hash : null;

	if (!sub || !otpHash) {
		throw new GenericError({ vi: "Reset token không hợp lệ", en: "Invalid reset token" }, "INVALID_TOKEN", 400);
	}

	return { sub, otp_hash: otpHash };
};

const getEmailFrom = (): string => process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@vietprodev.vn";

const requireMailConfig = (): void => {
	const hasUser = typeof process.env.EMAIL_USER === "string" && process.env.EMAIL_USER.trim().length > 0;
	const hasPass = typeof process.env.EMAIL_PASS === "string" && process.env.EMAIL_PASS.trim().length > 0;
	if (!hasUser || !hasPass) {
		throw new GenericError(
			{ vi: "Thiếu cấu hình EMAIL_USER/EMAIL_PASS", en: "Missing EMAIL_USER/EMAIL_PASS" },
			"CONFIG_ERROR",
			500,
		);
	}
};

type PasswordHistoryValue = UserAuthAttributes["password_history"];
type PasswordHistoryStored = Exclude<PasswordHistoryValue, undefined>;

const parsePasswordHistory = (raw: PasswordHistoryValue): string[] => {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
};

const buildNextPasswordHistory = (currentRaw: PasswordHistoryValue, newHash: string, limit = 5): PasswordHistoryStored => {
	const current = parsePasswordHistory(currentRaw);
	const next = [newHash, ...current].slice(0, limit);

	return next as unknown as PasswordHistoryStored;
};


export const sendResetPasswordOtp = async (input: SendOtpInput): Promise<SendOtpResult> => {
	requireMailConfig();

	const email = normalizeEmail(input.email);

	const user = await User.findOne({
		where: { email },
		attributes: ["id", "email", "status"],
	});

	// Anti-enumeration: always return 200 OK-like result
	if (!user) {
		return { email, expires_at: null, resend_after_seconds: 0 };
	}

	const userAuth = await UserAuth.findOne({ where: { user_id: user.id } });
	if (!userAuth) {
		// still avoid enumeration
		return { email, expires_at: null, resend_after_seconds: 0 };
	}

	const now = new Date();

	const lastSentAt = userAuth.reset_password_otp_sent_at ?? null;
	if (lastSentAt) {
		const diffSec = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);
		if (diffSec < OTP_RESEND_COOLDOWN_SECONDS) {
			throw new GenericError(
				{
					vi: `Vui lòng thử lại sau ${OTP_RESEND_COOLDOWN_SECONDS - diffSec} giây`,
					en: `Please retry after ${OTP_RESEND_COOLDOWN_SECONDS - diffSec} seconds`,
				},
				"TOO_MANY_REQUESTS",
				429,
			);
		}
	}

	const otp = generateOtp();
	const otpHash = hashOtp(email, otp);
	const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000);

	await userAuth.update({
		reset_password_otp_hash: otpHash,
		reset_password_otp_expires_at: expiresAt,
		reset_password_otp_attempts: 0,
		reset_password_otp_sent_at: now,
	});

	const mailService = new MailService();
	const appName = process.env.APP_NAME || "Doanh nhân trẻ Đồng Nai";
	const subject = `[${appName}] OTP đặt lại mật khẩu`;

	const html = `
		<div style="font-family: Arial, sans-serif; line-height: 1.6">
			<h3>OTP đặt lại mật khẩu</h3>
			<p>Mã OTP của bạn là:</p>
			<div style="font-size: 28px; font-weight: 700; letter-spacing: 4px">${otp}</div>
			<p>Mã có hiệu lực trong <b>${OTP_EXPIRES_MINUTES} phút</b>.</p>
			<p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
		</div>
	`;

	await mailService.sendmail({
		from: getEmailFrom(),
		to: email,
		subject,
		html,
	});

	return {
		email,
		expires_at: expiresAt,
		resend_after_seconds: OTP_RESEND_COOLDOWN_SECONDS,
	};
};

export const verifyResetPasswordOtp = async (input: VerifyOtpInput): Promise<VerifyOtpResult> => {
	const email = normalizeEmail(input.email);
	const otp = input.otp.trim();

	const user = await User.findOne({ where: { email }, attributes: ["id", "email"] });
	const userId = user?.id || null;

	if (!userId) {
		throw new GenericError(
			{ vi: "OTP không đúng hoặc đã hết hạn", en: "OTP is invalid or expired" },
			"INVALID_OTP",
			400,
		);
	}

	const userAuth = await UserAuth.findOne({ where: { user_id: userId } });
	if (!userAuth) {
		throw new GenericError(
			{ vi: "OTP không đúng hoặc đã hết hạn", en: "OTP is invalid or expired" },
			"INVALID_OTP",
			400,
		);
	}

	const storedHash = userAuth.reset_password_otp_hash;
	const expiresAt = userAuth.reset_password_otp_expires_at;
	const attempts = userAuth.reset_password_otp_attempts;

	if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
		throw new GenericError(
			{ vi: "OTP không đúng hoặc đã hết hạn", en: "OTP is invalid or expired" },
			"INVALID_OTP",
			400,
		);
	}

	if (attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
		throw new GenericError(
			{ vi: "Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng gửi lại OTP.", en: "Too many attempts. Please resend OTP." },
			"OTP_LOCKED",
			429,
		);
	}

	const candidateHash = hashOtp(email, otp);
	const ok = timingSafeEqualHex(storedHash, candidateHash);

	if (!ok) {
		await userAuth.update({ reset_password_otp_attempts: attempts + 1 });
		throw new GenericError(
			{ vi: "OTP không đúng hoặc đã hết hạn", en: "OTP is invalid or expired" },
			"INVALID_OTP",
			400,
		);
	}

	// Step 2 success -> return reset token (Step 3 uses it)
	const resetToken = signResetToken({ sub: userId, otp_hash: storedHash });
	const expiresIn = RESET_TOKEN_EXPIRES_MINUTES * 60;

	return { reset_token: resetToken, expires_in: expiresIn };
};

export const resetPasswordWithToken = async (input: ResetPasswordInput): Promise<void> => {
	const token = input.reset_token.trim();
	const newPassword = input.new_password;

	const payload = verifyResetToken(token);

	const userAuth = await UserAuth.findOne({ where: { user_id: payload.sub } });
	if (!userAuth) {
		throw new GenericError({ vi: "User auth không tồn tại", en: "User auth not found" }, "NOT_FOUND", 404);
	}

	const storedHash = userAuth.reset_password_otp_hash;
	const expiresAt = userAuth.reset_password_otp_expires_at;

	if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
		throw new GenericError(
			{ vi: "OTP đã hết hạn. Vui lòng gửi lại OTP.", en: "OTP expired. Please resend OTP." },
			"OTP_EXPIRED",
			400,
		);
	}

	if (!timingSafeEqualHex(storedHash, payload.otp_hash)) {
		throw new GenericError({ vi: "Reset token không hợp lệ", en: "Invalid reset token" }, "INVALID_TOKEN", 400);
	}

	const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
	const newHash = await bcrypt.hash(newPassword, saltRounds);

	const sequelize = UserAuth.sequelize;
	if (!sequelize) {
		throw new GenericError({ vi: "Sequelize chưa khởi tạo", en: "Sequelize not initialized" }, "CONFIG_ERROR", 500);
	}

	await sequelize.transaction(async (t) => {
		const patch: Partial<UserAuthAttributes> = {
			password_hash: newHash,
			password_changed_at: new Date(),
			password_history: buildNextPasswordHistory(userAuth.password_history ?? null, newHash),

			reset_password_otp_hash: null,
			reset_password_otp_expires_at: null,
			reset_password_otp_attempts: 0,
			reset_password_otp_sent_at: null,
		};

		await userAuth.update(patch, { transaction: t });
	});
};
