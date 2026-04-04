import { BaseProvider } from "#templates/base/provider";
import { Permission } from "#models/Permission";

export class PermissionProvider extends BaseProvider<Permission> {
	public static instance: PermissionProvider;

	public static getInstance(): PermissionProvider {
		PermissionProvider.instance ??= new PermissionProvider();
		return PermissionProvider.instance;
	}

	public static get model() {
		return Permission;
	}

	constructor() {
		super("Permission");
	}
}
