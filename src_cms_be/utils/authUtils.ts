import { User } from "../models/User";
import { UserAuth } from "../models/UserAuth";
import { UserSession } from "../models/UserSession";
import dayjs from "dayjs";

/**
 * Authentication utility functions
 * These functions provide the logic that would normally be instance methods
 * but are kept separate to avoid conflicts with auto-generated models
 */

/**
 * Maximum number of login attempts before account lockout
 */
const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Check if user account is locked due to too many failed login attempts
 */
export const isUserLocked = (userAuth: UserAuth): boolean => {
	if (userAuth.locked_until) {
		const now = dayjs();
		const lockedUntil = dayjs(userAuth.locked_until);
		return now.isBefore(lockedUntil);
	}

	return false;
};

/**
 * Increment login attempts for a user
 */
export const incrementUserLoginAttempts = async (userAuthInstance: UserAuth): Promise<void> => {
	const currentAttempts = (userAuthInstance.login_attempts || 0) + 1;

	// Lock account if too many attempts
	const updates: any = { login_attempts: currentAttempts };
	if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
		updates.locked_until = dayjs().add(15, "minutes").toDate();
	}

	await userAuthInstance.update(updates);
};

/**
 * Reset login attempts for a user (on successful login)
 */
export const resetUserLoginAttempts = async (userAuthInstance: UserAuth): Promise<void> => {
	await userAuthInstance.update({
		login_attempts: 0,
		locked_until: new Date(0),
	});
};

/**
 * Unlock user account (reset lockout)
 */
export const unlockUserAccount = async (userAuthInstance: UserAuth): Promise<void> => {
	await userAuthInstance.update({
		locked_until: new Date(0),
		login_attempts: 0,
	});
};

/**
 * Check if user account lockout has expired and unlock if needed
 */
export const checkAndUnlockExpiredLockout = async (userAuthInstance: UserAuth): Promise<boolean> => {
	if (userAuthInstance.locked_until) {
		const now = dayjs();
		const lockedUntil = dayjs(userAuthInstance.locked_until);

		if (now.isAfter(lockedUntil)) {
			await unlockUserAccount(userAuthInstance);
			return true; // Account was unlocked
		}
	}
	return false; // Account was not locked or still locked
};

/**
 * Update user's last login timestamp
 */
export const updateUserLastLogin = async (userAuthInstance: UserAuth): Promise<void> => {
	await userAuthInstance.update({
		last_login_at: new Date(),
	});
};

/**
 * Check if user session is expired
 */
export const isSessionExpired = (session: UserSession): boolean => {
	const now = dayjs();
	const expiresAt = dayjs(session.expires_at);
	return now.isAfter(expiresAt);
};

/**
 * Check if user session refresh token is expired
 */
export const isSessionRefreshExpired = (session: UserSession): boolean => {
	const now = dayjs();
	const refreshExpiresAt = dayjs(session.refresh_expires_at);
	return now.isAfter(refreshExpiresAt);
};

/**
 * Deactivate a user session
 */
export const deactivateUserSession = async (sessionInstance: UserSession): Promise<void> => {
	await sessionInstance.update({ is_active: false });
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (sessionInstance: UserSession): Promise<void> => {
	await sessionInstance.update({ last_activity_at: new Date() });
};

/**
 * Check if user can change password (not recently changed)
 */
export const canUserChangePassword = (userAuth: UserAuth, minDaysBetweenChanges: number = 1): boolean => {
	if (!userAuth.password_changed_at) return true;

	const lastChange = dayjs(userAuth.password_changed_at);
	const now = dayjs();
	const daysSinceChange = now.diff(lastChange, "day");

	return daysSinceChange >= minDaysBetweenChanges;
};

/**
 * Update user's password changed timestamp
 */
export const updateUserPasswordChanged = async (userAuthInstance: UserAuth): Promise<void> => {
	await userAuthInstance.update({
		password_changed_at: new Date(),
	});
};

/**
 * Check if password was used recently (prevent reuse)
 */
export const isPasswordRecentlyUsed = (
	userAuth: UserAuth,
	passwordHistory: string[],
	newPasswordHash: string,
): boolean => {
	// Check if new password hash matches any in recent history
	return passwordHistory.includes(newPasswordHash);
};

/**
 * Get user full name
 */
export const getUserFullName = (user: User): string => {
	const firstName = user.first_name || "";
	const lastName = user.last_name || "";
	return `${firstName} ${lastName}`.trim();
};

/**
 * Check if user has specific role
 */
export const hasUserRole = (user: User, role: string): boolean => {
	return (user as any).role?.name === role;
};

/**
 * Check if user has admin privileges
 */
export const isUserAdmin = (user: User): boolean => {
	return (user as any).role?.name === "admin" || (user as any).role?.name === "system_admin";
};

/**
 * Check if user is system admin
 */
export const isUserSystemAdmin = (user: User): boolean => {
	return (user as any).role?.name === "system_admin";
};

/**
 * Get user status display text
 */
export const getUserStatusText = (status: string): { vi: string; en: string } => {
	const statusMap: Record<string, { vi: string; en: string }> = {
		active: { vi: "Hoạt động", en: "Active" },
		inactive: { vi: "Không hoạt động", en: "Inactive" },
		suspended: { vi: "Đã tạm ngừng", en: "Suspended" },
		pending_verification: { vi: "Chờ xác minh", en: "Pending Verification" },
	};

	return statusMap[status] || { vi: "Không xác định", en: "Unknown" };
};

/**
 * Get role display text
 */
export const getRoleText = (role: string): { vi: string; en: string } => {
	const roleMap: Record<string, { vi: string; en: string }> = {
		user: { vi: "Người dùng", en: "User" },
		admin: { vi: "Quản trị viên", en: "Administrator" },
		system_admin: { vi: "Quản trị hệ thống", en: "System Administrator" },
	};

	return roleMap[role] || { vi: "Không xác định", en: "Unknown" };
};
