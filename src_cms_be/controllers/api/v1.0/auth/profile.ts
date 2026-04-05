import { Application } from "express";
import { Resource } from "express-automatic-routes";
import { Req, Res } from "#interfaces/IApi";
import { authenticate } from "#middlewares/auth";
import { User } from "#models/User";
import { UserRole as UserRoleModel } from "#models/UserRole";
import { Role } from "#models/Role";
import { RolePermission } from "#models/RolePermission";
import { Permission } from "#models/Permission";

export default (_express: Application) => {
	return <Resource>{
		/**
		 * @openapi
		 * /auth/profile:
		 *   get:
		 *     tags: [Authentication]
		 *     summary: Get user profile
		 *     description: Get current authenticated user's profile information
		 *     security:
		 *       - BearerAuth: []
		 *     responses:
		 *       200:
		 *         description: Profile retrieved successfully
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: true
		 *                 data:
		 *                   type: object
		 *                   properties:
		 *                     id:
		 *                       type: string
		 *                       example: "uuid-string"
		 *                     email:
		 *                       type: string
		 *                       example: "user@example.com"
		 *                     username:
		 *                       type: string
		 *                       example: "john_doe"
		 *                     role:
		 *                       type: string
		 *                       enum: [user, admin, system_admin]
		 *                       example: "user"
		 *                     permissions:
		 *                       type: array
		 *                       items:
		 *                         type: string
		 *                       example: ["read:profile"]
		 *       401:
		 *         $ref: '#/components/responses/Unauthorized'
		 */
		get: {
			middleware: [authenticate],
			handler: async (req: Req, res: Res) => {
				try {
					// Get user with roles and permissions
					const user = await User.findByPk(req.user?.id, {
						attributes: ["id", "email", "username", "first_name", "last_name", "status"],
					});

					if (!user) {
						return res.error({ message: "User not found", status: 404 });
					}


					// Fetch roles and permissions from DB
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
										include: [{ model: Permission, as: "permission", attributes: ["name"] }],
									},
								],
							},
						],
					});

					const rolesSet = new Set<string>();
					const permissionsSet = new Set<string>();
					for (const ur of userRoles) {
						if (ur.role) {
							rolesSet.add(ur.role.name);
							if (ur.role.role_permissions) {
								for (const rp of ur.role.role_permissions) {
									if (rp.permission?.name) permissionsSet.add(rp.permission.name);
								}
							}
						}
					}

					const userData = {
						...user.toJSON(),
						roles: Array.from(rolesSet),
						permissions: Array.from(permissionsSet),
					};

					return res.sendOk({ data: userData });
				} catch (error) {
					return res.error(error);
				}
			},
		},
	};
};
