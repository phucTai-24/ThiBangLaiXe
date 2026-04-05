import * as bcrypt from "bcryptjs";
import { sign, verify, SignOptions } from "jsonwebtoken";
import { QueryTypes } from "sequelize";
import sequelize from "#services/database/sequelize/service";
import { User, UserAttributes } from "../models/User";
import { UserAuth } from "../models/UserAuth";
import { Role } from "../models/Role";
import { UserRole as UserRoleModel } from "../models/UserRole";
import { RolePermission } from "../models/RolePermission";
import { Permission } from "../models/Permission";
import { UserSession } from "../models/UserSession";
import { GenericError } from "#interfaces/error/generic";
import {
	isUserLocked,
	incrementUserLoginAttempts,
	resetUserLoginAttempts,
	updateUserLastLogin,
	checkAndUnlockExpiredLockout,
	isSessionExpired,
	isSessionRefreshExpired,
	deactivateUserSession,
	updateSessionActivity,
	canUserChangePassword,
	updateUserPasswordChanged,
	isPasswordRecentlyUsed,
} from "../utils/authUtils";

enum UserStatus {
	ACTIVE = "active",
	INACTIVE = "inactive",
	SUSPENDED = "suspended",
	PENDING_VERIFICATION = "pending_verification",
}
enum UserRole {
	USER = "user",
	ADMIN = "admin",
	SYSTEM_ADMIN = "system_admin",
}

export interface LoginCredentials {
	email: string;
	password: string;
	device_info?: Record<string, unknown>;
	ip_address?: string;
	user_agent?: string;
}

export interface RegisterData {
	email: string;
	password: string;
	username?: string;
	first_name?: string;
	last_name?: string;
	phone?: string;
}

export interface TokenPair {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	refresh_expires_in: number;
	token_type: string;
}

export interface LoginResult extends TokenPair {
	user: User;
	user_auth: UserAuth;
	session: UserSession;
}

export interface CookieOptions {
	httpOnly: boolean;
	secure: boolean;
	sameSite: "strict" | "lax" | "none";
	maxAge: number;
	path: string;
	domain?: string;
}

export interface JWTPayload {
	id: string;
	email: string;
	username?: string;
	roles?: string[];
	permissions?: string[];
	type?: string;
	iat?: number;
	exp?: number;
}

export class AuthService {
	private static readonly JWT_SECRET = process.env.JWT_SECRET!;
	private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
	private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
	private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
	private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12");
	private static readonly TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;

	// Validate required secrets
	private static validateSecrets() {
		if (!this.JWT_SECRET) {
			throw new Error("JWT_SECRET environment variable is required");
		}
		if (!this.JWT_REFRESH_SECRET) {
			throw new Error("JWT_REFRESH_SECRET environment variable is required");
		}
		if (!this.TOKEN_ENCRYPTION_KEY) {
			throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required for token encryption");
		}
	}

	/**
	 * Get secure cookie options for tokens
	 */
	static getAccessTokenCookieOptions(): CookieOptions {
		const isProduction = process.env.NODE_ENV === "production";
		const maxAge = this.parseTimeToSeconds(this.JWT_EXPIRES_IN) * 1000;
		return {
			httpOnly: true, // Prevent XSS attacks
			secure: isProduction, // HTTPS only in production
			sameSite: "lax", // Allow cross-subdomain requests
			maxAge,
			path: "/api",
			...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
		};
	}

	/**
	 * Get secure cookie options for refresh tokens
	 */
	static getRefreshTokenCookieOptions(): CookieOptions {
		const isProduction = process.env.NODE_ENV === "production";
		const maxAge = this.parseTimeToSeconds(this.JWT_REFRESH_EXPIRES_IN) * 1000;
		return {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
			maxAge,
			path: "/api/v1.0/auth/refresh",
			...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
		};
	}

	/**
	 * Hash password using bcrypt
	 */
	static async hashPassword(password: string): Promise<string> {
		return bcrypt.hash(password, this.BCRYPT_ROUNDS);
	}

	/**
	 * Verify password against hash
	 */
	static async verifyPassword(password: string, hash: string): Promise<boolean> {
		return bcrypt.compare(password, hash);
	}

	/**
	 * Encrypt token using PostgreSQL pgcrypto
	 */
	private static async encryptToken(plainToken: string): Promise<Buffer> {
		const [result] = await sequelize.query("SELECT encrypt_token(:token, :key) as encrypted", {
			replacements: {
				token: plainToken,
				key: this.TOKEN_ENCRYPTION_KEY,
			},
			type: QueryTypes.SELECT,
		});
		return (result as any).encrypted;
	}

	/**
	 * Decrypt token using PostgreSQL pgcrypto
	 */
	private static async decryptToken(encryptedToken: Buffer): Promise<string> {
		const [result] = await sequelize.query("SELECT decrypt_token(:encrypted_token, :key) as decrypted", {
			replacements: {
				encrypted_token: encryptedToken,
				key: this.TOKEN_ENCRYPTION_KEY,
			},
			type: QueryTypes.SELECT,
		});
		return (result as any).decrypted;
	}

	/**
	 * Generate JWT access token
	 */
	static generateAccessToken(user: User): string {
		this.validateSecrets();
		const payload: JWTPayload = {
			id: user.id,
			email: user.email,
			roles: (user as any).roles || [], // All role names
		};

		if (user.username) {
			payload.username = user.username;
		}

		return sign(payload, this.JWT_SECRET as any, {
			expiresIn: this.JWT_EXPIRES_IN as any,
			issuer: "backend-template",
			audience: "api-users",
		});
	}

	/**
	 * Generate JWT refresh token
	 */
	static generateRefreshToken(user: User): string {
		this.validateSecrets();
		const payload = {
			id: user.id,
			email: user.email,
			roles: (user as any).roles || [],
			type: "refresh",
		};

		const options: SignOptions = {
			expiresIn: this.JWT_REFRESH_EXPIRES_IN as any,
			issuer: "backend-template",
			audience: "api-users",
		};

		return sign(payload, this.JWT_REFRESH_SECRET as any, options);
	}

	/**
	 * Verify JWT access token
	 */
	static verifyAccessToken(token: string): JWTPayload {
		this.validateSecrets();
		try {
			const decoded = verify(token, this.JWT_SECRET, {
				issuer: "backend-template",
				audience: "api-users",
			}) as unknown as JWTPayload;

			return decoded;
		} catch (error) {
			throw new GenericError({ vi: "Token không hợp lệ", en: "Invalid token" }, "UNAUTHORIZED", 401);
		}
	}

	/**
	 * Verify JWT refresh token
	 */
	static verifyRefreshToken(token: string): JWTPayload {
		this.validateSecrets();
		try {
			const decoded = verify(token, this.JWT_REFRESH_SECRET, {
				issuer: "backend-template",
				audience: "api-users",
			}) as unknown as JWTPayload;

			if (decoded.type !== "refresh") {
				throw new Error("Invalid token type");
			}

			return decoded;
		} catch (error) {
			throw new GenericError({ vi: "Refresh token không hợp lệ", en: "Invalid refresh token" }, "UNAUTHORIZED", 401);
		}
	}

	/**
	 * Register new user
	 */
	static async register(data: RegisterData): Promise<User> {
		return sequelize.transaction(async (transaction) => {
			const { email, password, username, first_name, last_name, phone } = data;

			// Check if user already exists
			const existingUser = await User.findOne({
				where: { email },
				paranoid: false, // Include soft deleted users
				transaction,
			});

			if (existingUser) {
				if (existingUser.deleted_at) {
					// Reactivate soft deleted user
					await existingUser.restore({ transaction });
					// Update UserAuth for reactivated user
					const existingUserAuth = await UserAuth.findOne({
						where: { user_id: existingUser.id },
						transaction,
					});
					if (existingUserAuth) {
						existingUserAuth.password_hash = await this.hashPassword(password);
						await existingUserAuth.save({ transaction });
					}
					existingUser.status = "pending_verification";
					return existingUser.save({ transaction });
				} else {
					throw new GenericError({ vi: "Người dùng đã tồn tại", en: "User already exists" }, "CONFLICT", 409);
				}
			}

			// Hash password
			const password_hash = await this.hashPassword(password);

			// Get default user role
			const defaultRole = await Role.findOne({ where: { name: "user" } });
			if (!defaultRole) {
				throw new Error("Default user role not found");
			}

			// Create user
			const userData: Partial<UserAttributes> = {
				email,
				status: UserStatus.PENDING_VERIFICATION,
			};

			if (username) userData.username = username;
			if (first_name) userData.first_name = first_name;
			if (last_name) userData.last_name = last_name;
			if (phone) userData.phone = phone;

			const user = await User.create(userData as any, { transaction });

			// Create UserAuth
			await UserAuth.create(
				{
					user_id: user.id,
					password_hash,
				},
				{ transaction },
			);

			// Assign default role
			await UserRoleModel.create(
				{
					user_id: user.id,
					role_id: defaultRole.id,
					is_primary: true,
				},
				{ transaction },
			);

			return user;
		});
	}

	/**
	 * Authenticate user login
	 */
	static async login(credentials: LoginCredentials): Promise<LoginResult> {
		const { email, password, device_info, ip_address, user_agent } = credentials;

		// Find user with auth data
		const userInstance = await User.findOne({
			where: { email },
			include: [{ model: UserAuth, as: "user_auth" }],
		});
		if (!userInstance) {
			throw new GenericError(
				{ vi: "Email hoặc mật khẩu không đúng", en: "Invalid email or password" },
				"UNAUTHORIZED",
				401,
			);
		}

		// Get plain data values
		const user = userInstance.dataValues as User;
		let userAuth = userInstance.user_auth;

		// If UserAuth doesn't exist, this is an error (every user should have UserAuth)
		if (!userAuth) {
			throw new GenericError(
				{ vi: "Tài khoản chưa được thiết lập đầy đủ", en: "Account not fully set up" },
				"UNAUTHORIZED",
				401,
			);
		}

		// Fetch user roles with permissions
		const userRoles = await UserRoleModel.findAll({
			where: { user_id: user.id },
			include: [
				{
					model: Role,
					as: "role",
					include: [
						{
							model: RolePermission,
							as: "role_permissions",
							include: [
								{
									model: Permission,
									as: "permission",
									attributes: ["name"],
								},
							],
						},
					],
				},
			],
		});

		// Collect permissions and roles from all roles (unique)
		const permissionsSet = new Set<string>();
		const rolesSet = new Set<string>();
		if (userRoles) {
			for (const userRole of userRoles) {
				if (userRole.role) {
					rolesSet.add(userRole.role.name);
					if (userRole.role.role_permissions) {
						for (const rp of userRole.role.role_permissions) {
							if (rp.permission && rp.permission.name) {
								permissionsSet.add(rp.permission.name);
							}
						}
					}
				}
			}
		}
		(user as any).permissions = Array.from(permissionsSet);
		(user as any).roles = Array.from(rolesSet);

		// Check if account lockout has expired and unlock if needed
		if (userAuth) await checkAndUnlockExpiredLockout(userAuth);

		// Check if account is locked
		if (userAuth && isUserLocked(userAuth)) {
			throw new GenericError({ vi: "Tài khoản bị khóa tạm thời", en: "Account is temporarily locked" }, "LOCKED", 423);
		}

		// Check if account is active
		if (user.status !== UserStatus.ACTIVE) {
			throw new GenericError({ vi: "Tài khoản chưa được kích hoạt", en: "Account is not active" }, "FORBIDDEN", 403);
		}

		// Check if password_hash exists
		if (!userAuth?.password_hash) {
			throw new GenericError(
				{ vi: "Tài khoản chưa được thiết lập mật khẩu", en: "Account password not set" },
				"UNAUTHORIZED",
				401,
			);
		}

		// Verify password
		const isValidPassword = await this.verifyPassword(password, userAuth.password_hash);
		if (!isValidPassword) {
			if (userAuth) await incrementUserLoginAttempts(userAuth);
			throw new GenericError(
				{ vi: "Email hoặc mật khẩu không đúng", en: "Invalid email or password" },
				"UNAUTHORIZED",
				401,
			);
		}

		// Reset login attempts on successful login
		if (userAuth) await resetUserLoginAttempts(userAuth);
		if (userAuth) await updateUserLastLogin(userAuth);

		// Generate tokens
		const access_token = this.generateAccessToken(user);
		const refresh_token = this.generateRefreshToken(user);

		// Encrypt tokens before storing
		const encrypted_access_token = await this.encryptToken(access_token);
		const encrypted_refresh_token = await this.encryptToken(refresh_token);

		// Calculate expiration times
		const expires_in = this.parseTimeToSeconds(this.JWT_EXPIRES_IN);
		const refresh_expires_in = this.parseTimeToSeconds(this.JWT_REFRESH_EXPIRES_IN);

		// Create session with encrypted tokens
		const sessionData: any = {
			user_id: user.id,
			session_token: encrypted_access_token,
			refresh_token: encrypted_refresh_token,
			device_info: device_info || {},
			expires_at: new Date(Date.now() + expires_in * 1000),
			refresh_expires_at: new Date(Date.now() + refresh_expires_in * 1000),
			is_active: true,
			permissions: (user as any).permissions || [],
			roles: (user as any).roles || [],
		};

		if (ip_address) sessionData.ip_address = ip_address;
		if (user_agent) sessionData.user_agent = user_agent;

		await UserSession.create(sessionData as any);

		// Get the created session
		const createdSession = await UserSession.findOne({
			where: { session_token: encrypted_access_token },
		});

		return {
			access_token,
			refresh_token,
			expires_in,
			refresh_expires_in,
			token_type: "Bearer",
			user,
			user_auth: userAuth.dataValues as UserAuth,
			session: createdSession?.dataValues as UserSession,
		};
	}

	/**
	 * Refresh access token
	 */
	static async refreshToken(refreshToken: string, device_info?: Record<string, unknown>): Promise<TokenPair> {
		// Find active session by decrypting stored refresh tokens
		const sessions = await sequelize.query(
			`
			SELECT us.*
			FROM user_sessions us
			WHERE us.is_active = true
			AND us.refresh_expires_at > NOW()
			`,
			{
				type: QueryTypes.SELECT,
			},
		);

		// Find matching session by decrypting refresh tokens
		let matchingSession: any = null;
		for (const session of sessions as any[]) {
			try {
				const decryptedRefreshToken = await this.decryptToken(session.refresh_token);

				if (decryptedRefreshToken === refreshToken) {
					matchingSession = session;
					break;
				}
			} catch (error) {
				// Skip invalid encrypted tokens
				continue;
			}
		}

		if (!matchingSession) {
			throw new GenericError({ vi: "Refresh token không hợp lệ", en: "Invalid refresh token" }, "UNAUTHORIZED", 401);
		}

		// Verify refresh token JWT
		const decoded = this.verifyRefreshToken(refreshToken);

		// Create user object from token data
		const user = {
			id: decoded.id,
			email: decoded.email,
			roles: decoded.roles || matchingSession.roles || [],
			permissions: matchingSession.permissions || [],
		} as any;

		// Generate new tokens
		const access_token = this.generateAccessToken(user);
		const new_refresh_token = this.generateRefreshToken(user);

		// Encrypt new tokens
		const encrypted_access_token = await this.encryptToken(access_token);
		const encrypted_refresh_token = await this.encryptToken(new_refresh_token);

		// Calculate expiration times
		const expires_in = this.parseTimeToSeconds(this.JWT_EXPIRES_IN);
		const refresh_expires_in = this.parseTimeToSeconds(this.JWT_REFRESH_EXPIRES_IN);

		// Update session with encrypted tokens
		await sequelize.query(
			`
			UPDATE user_sessions
			SET session_token = :access_token,
				refresh_token = :refresh_token,
				expires_at = :expires_at,
				refresh_expires_at = :refresh_expires_at,
				device_info = :device_info,
				last_activity_at = NOW()
			WHERE id = :session_id
			`,
			{
				replacements: {
					access_token: encrypted_access_token,
					refresh_token: encrypted_refresh_token,
					expires_at: new Date(Date.now() + expires_in * 1000),
					refresh_expires_at: new Date(Date.now() + refresh_expires_in * 1000),
					device_info: device_info && Object.keys(device_info).length > 0 ? device_info : null,
					session_id: matchingSession.id,
				},
				type: QueryTypes.UPDATE,
			},
		);

		return {
			access_token,
			refresh_token: new_refresh_token,
			expires_in,
			refresh_expires_in,
			token_type: "Bearer",
		};
	}

	/**
	 * Logout user (deactivate session)
	 */
	static async logout(accessToken: string): Promise<void> {
		// Find session by decrypting access tokens
		const sessions = await sequelize.query(
			`
			SELECT id, session_token
			FROM user_sessions
			WHERE is_active = true
			`,
			{
				type: QueryTypes.SELECT,
			},
		);

		// Find matching session
		let sessionId: string | null = null;
		for (const session of sessions as any[]) {
			try {
				const decryptedToken = await this.decryptToken(session.session_token);

				if (decryptedToken === accessToken) {
					sessionId = session.id;
					break;
				}
			} catch (error) {
				continue;
			}
		}

		if (sessionId) {
			await sequelize.query("UPDATE user_sessions SET is_active = false WHERE id = :session_id", {
				replacements: { session_id: sessionId },
				type: QueryTypes.UPDATE,
			});
		}
	}

	/**
	 * Logout from all devices
	 */
	static async logoutAll(userId: string): Promise<void> {
		await UserSession.update(
			{ is_active: false },
			{
				where: {
					user_id: userId,
					is_active: true,
				},
			},
		);
	}

	/**
	 * Get user by ID with sessions
	 */
	static async getUserWithSessions(userId: string): Promise<User | null> {
		return User.findByPk(userId, {
			include: [
				{
					model: UserSession,
					as: "sessions",
					where: { is_active: true },
					required: false,
				},
			],
		});
	}

	/**
	 * Validate session token
	 */
	static async validateSession(sessionToken: string): Promise<User | null> {
		let sessions: any[];
		try {
			// Find sessions and decrypt tokens to match
			sessions = await sequelize.query(
				`
				SELECT us.*, u.email, u.username, u.first_name, u.last_name, u.status
				FROM user_sessions us
				JOIN users u ON us.user_id = u.id
				WHERE us.is_active = true
				AND us.expires_at > NOW()
				`,
				{
					type: QueryTypes.SELECT,
				},
			);
		} catch (queryError) {
			throw queryError;
		}

		// Find matching session by decrypting access tokens
		let matchingSession: any = null;
		let decryptedToken: string | null = null;

		for (const session of sessions as any[]) {
			try {
				const decryptedAccessToken = await this.decryptToken(session.session_token);

				if (decryptedAccessToken === sessionToken) {
					matchingSession = session;
					decryptedToken = decryptedAccessToken;
					break;
				}
			} catch (error) {
				// Skip invalid encrypted tokens
				continue;
			}
		}

		if (!matchingSession || !decryptedToken) {
			return null;
		}

		// Verify JWT token
		try {
			this.verifyAccessToken(decryptedToken);
		} catch (error) {
			return null;
		}

		// Create user object
		const user = {
			id: matchingSession.user_id,
			email: matchingSession.email,
			username: matchingSession.username,
			first_name: matchingSession.first_name,
			last_name: matchingSession.last_name,
			status: matchingSession.status,
		} as any;

		// Update last activity
		try {
			await sequelize.query("UPDATE user_sessions SET last_activity_at = NOW() WHERE id = :session_id", {
				replacements: { session_id: matchingSession.id },
				type: QueryTypes.UPDATE,
			});
		} catch (updateError) {
			// Don't fail validation just because we can't update activity
		}

		return user;
	}

	/**
	 * Change user password
	 */
	static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
		const user = await User.findByPk(userId, {
			include: [{ model: UserAuth, as: "user_auth" }],
		});
		if (!user) {
			throw new GenericError({ vi: "Người dùng không tồn tại", en: "User not found" }, "NOT_FOUND", 404);
		}

		const userAuth = user.user_auth;
		if (!userAuth) {
			throw new GenericError(
				{ vi: "Dữ liệu xác thực không tồn tại", en: "Authentication data not found" },
				"NOT_FOUND",
				404,
			);
		}

		// Check if password can be changed (not too recently)
		if (!canUserChangePassword(userAuth)) {
			throw new GenericError(
				{ vi: "Mật khẩu chỉ có thể thay đổi sau 24 giờ", en: "Password can only be changed after 24 hours" },
				"FORBIDDEN",
				403,
			);
		}

		// Verify old password
		const isValidOldPassword = await this.verifyPassword(oldPassword, userAuth.password_hash);
		if (!isValidOldPassword) {
			throw new GenericError({ vi: "Mật khẩu cũ không đúng", en: "Invalid old password" }, "UNAUTHORIZED", 401);
		}

		// Hash new password
		const newPasswordHash = await this.hashPassword(newPassword);

		// Check if password was recently used
		const passwordHistory = (userAuth.password_history as string[]) || [];
		if (isPasswordRecentlyUsed(userAuth, passwordHistory, newPasswordHash)) {
			throw new GenericError(
				{ vi: "Mật khẩu đã được sử dụng gần đây", en: "Password was recently used" },
				"FORBIDDEN",
				403,
			);
		}

		// Update password history
		passwordHistory.unshift(userAuth.password_hash); // Add old hash
		if (passwordHistory.length > 5) passwordHistory.pop(); // Keep last 5
		userAuth.password_history = passwordHistory;

		// Update password
		userAuth.password_hash = newPasswordHash;
		await updateUserPasswordChanged(userAuth);

		// Logout from all other sessions
		await this.logoutAll(userId);
	}

	/**
	 * Parse time string to seconds (e.g., '15m' -> 900)
	 */
	private static parseTimeToSeconds(timeStr: string | undefined): number {
		if (!timeStr) return 900; // 15 minutes default
		const regex = /^(\d+)([smhd])$/;
		const match = timeStr.match(regex);

		if (!match) {
			throw new Error(`Invalid time format: ${timeStr || "undefined"}`);
		}

		const value = parseInt(match[1] || "0");
		const unit = match[2] || "m";

		switch (unit) {
			case "s":
				return value;
			case "m":
				return value * 60;
			case "h":
				return value * 60 * 60;
			case "d":
				return value * 60 * 60 * 24;
			default:
				throw new Error(`Invalid time unit: ${unit}`);
		}
	}
}
