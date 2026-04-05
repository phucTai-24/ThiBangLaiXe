import { BaseProvider } from "#templates/base/provider";
import { RolePermission } from "#models/RolePermission";

export class RolePermissionProvider extends BaseProvider<RolePermission> {
	public static instance: RolePermissionProvider;

	public static getInstance(): RolePermissionProvider {
		RolePermissionProvider.instance ??= new RolePermissionProvider();
		return RolePermissionProvider.instance;
	}

	public static get model() {
		return RolePermission;
	}

	constructor() {
		super("RolePermission");
	}
}
