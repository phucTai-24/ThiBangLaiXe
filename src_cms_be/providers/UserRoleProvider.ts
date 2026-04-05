import { BaseProvider } from "#templates/base/provider";
import { UserRole } from "#models/UserRole";

export class UserRoleProvider extends BaseProvider<UserRole> {
	public static instance: UserRoleProvider;

	public static getInstance(): UserRoleProvider {
		UserRoleProvider.instance ??= new UserRoleProvider();
		return UserRoleProvider.instance;
	}

	public static get model() {
		return UserRole;
	}

	constructor() {
		super("UserRole");
	}
}
