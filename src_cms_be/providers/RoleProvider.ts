import { BaseProvider } from "#templates/base/provider";
import { Role } from "#models/Role";

export class RoleProvider extends BaseProvider<Role> {
	public static instance: RoleProvider;

	public static getInstance(): RoleProvider {
		RoleProvider.instance ??= new RoleProvider();
		return RoleProvider.instance;
	}

	public static get model() {
		return Role;
	}

	constructor() {
		super("Role");
	}
}
