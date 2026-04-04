import { Req, Res } from "#interfaces/IApi";
import { NextFunction } from "express";
import { AuthService, JWTPayload } from "../services/authService";
import { GenericError } from "#interfaces/error/generic";
import { console } from "inspector";
type UserRole = "user" | "admin" | "system_admin";

// Extend Request interface
declare module "express" {
	interface Request {
		user?: JWTPayload;
	}
}

/**
 * Authentication middleware - verifies JWT token and session
 */
export function authenticate(req: Req, res: Res, next: NextFunction): void {
	try {
		// Try to get token from cookie first (preferred), then fallback to Authorization header
		let token: string | undefined;
		const isDevelopment = process.env.NODE_ENV === "development";

		console.log("Is development mode:", isDevelopment);

		// In development, prioritize Authorization header for easier testing
		if (isDevelopment) {
			console.log("Development mode: checking Authorization header first");
			// Priority 1: Authorization Bearer header (for development testing)
			const authHeader = req.header("Authorization");
			if (authHeader) {
				const [bearer, bearerToken] = authHeader.split(" ");
				if (bearer === "Bearer" && bearerToken) {
					token = bearerToken;
					console.log("Found token in Authorization header");
				}
			}
			// Priority 2: HttpOnly Cookie (fallback)
			if (!token && req.cookies?.access_token) {
				token = req.cookies.access_token;
				console.log("Found token in cookie (fallback)");
			}
		} else {
			console.log("Production mode: checking cookie first");
			// In production, prioritize HttpOnly Cookie (most secure)
			if (req.cookies?.access_token) {
				token = req.cookies.access_token;
				console.log("Found token in cookie");
			}
			// Priority 2: Authorization Bearer header (backward compatibility)
			else {
				const authHeader = req.header("Authorization");
				if (authHeader) {
					const [bearer, bearerToken] = authHeader.split(" ");
					if (bearer === "Bearer" && bearerToken) {
						token = bearerToken;
						console.log("Found token in Authorization header (fallback)");
					}
				}
			}
		}

		if (!token) {
			const error = new GenericError(
				{ vi: "Không có token xác thực", en: "No authentication token provided" },
				"UNAUTHORIZED",
				401,
			);
			return res.error(error);
		}

		// Verify JWT token
		const decoded = AuthService.verifyAccessToken(token);
		console.log("JWT token verified successfully for user:", decoded.id);

		// Validate session
		AuthService.validateSession(token)
			.then((user) => {
				if (!user) {
					console.log("Session validation returned null");
					const error = new GenericError(
						{ vi: "Phiên đăng nhập không hợp lệ", en: "Invalid session" },
						"UNAUTHORIZED",
						401,
					);
					return res.error(error);
				}

				console.log("Session validation successful, attaching user to request");
				// Attach user to request
				req.user = decoded;
				next();
			})
			.catch((err) => {
				console.log("Session validation threw error:", err.message);
				const error = new GenericError(
					{ vi: "Lỗi xác thực phiên đăng nhập", en: "Session validation error" },
					"UNAUTHORIZED",
					401,
				);
				return res.error(error);
			});
	} catch (err) {
		const error = new GenericError({ vi: "Token không hợp lệ", en: "Invalid token" }, "UNAUTHORIZED", 401);
		return res.error(error);
	}
}

/**
 * Authorization middleware - checks user roles/permissions
 */
export function authorize(allowedRoles: UserRole[] = []) {
	return (req: Req, res: Res, next: NextFunction): void => {
		if (!req.user) {
			const error = new GenericError({ vi: "Chưa xác thực", en: "Not authenticated" }, "UNAUTHORIZED", 401);
			return res.error(error);
		}

		// Check if user has required role(s)
		if (allowedRoles.length > 0) {
			const userRoles = req.user?.roles || [];
			const hasRole = userRoles.some((r) => allowedRoles.includes(r as UserRole));
			if (!hasRole) {
				const error = new GenericError(
					{ vi: "Không có quyền truy cập", en: "Insufficient permissions" },
					"FORBIDDEN",
					403,
				);
				return res.error(error);
			}
		}

		next();
	};
}

/**
 * Admin only middleware
 */
export function requireAdmin(req: Req, res: Res, next: NextFunction): void {
	return authorize(["admin", "system_admin"])(req, res, next);
}

/**
 * Super admin only middleware
 */
export function requireSuperAdmin(req: Req, res: Res, next: NextFunction): void {
	return authorize(["system_admin"])(req, res, next);
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req: Req, res: Res, next: NextFunction): void {
	const authHeader = req.header("Authorization");

	if (!authHeader) {
		return next();
	}

	try {
		const [bearer, token] = authHeader.split(" ");

		if (bearer === "Bearer" && token) {
			const decoded = AuthService.verifyAccessToken(token);
			req.user = decoded;
		}
	} catch (error) {
		// Ignore auth errors for optional auth
	}

	next();
}

/**
 * Rate limiting helper for auth endpoints
 */
export function createRateLimit(windowMs: number = 15 * 60 * 1000, max: number = 5) {
	const attempts = new Map<string, { count: number; resetTime: number }>();

	return (req: Req, res: Res, next: NextFunction): void => {
		const key = req.ip || req.connection.remoteAddress || "unknown";
		const now = Date.now();
		const windowData = attempts.get(key);

		if (!windowData || now > windowData.resetTime) {
			attempts.set(key, { count: 1, resetTime: now + windowMs });
			return next();
		}

		if (windowData.count >= max) {
			const error = new GenericError(
				{ vi: "Quá nhiều yêu cầu, vui lòng thử lại sau", en: "Too many requests, please try again later" },
				"TOO_MANY_REQUESTS",
				429,
			);
			return res.error(error);
		}

		windowData.count++;
		attempts.set(key, windowData);
		next();
	};
}

// Export utilities
export { AuthService };
export type { JWTPayload };

// Default export for backward compatibility
export default authenticate;
