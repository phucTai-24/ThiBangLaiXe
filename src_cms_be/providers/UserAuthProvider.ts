import { BaseProvider } from "#templates/base/provider";
import { UserAuth } from "#models/UserAuth";

export class UserAuthProvider extends BaseProvider<UserAuth> {
	public static instance: UserAuthProvider;

	public static getInstance(): UserAuthProvider {
		UserAuthProvider.instance ??= new UserAuthProvider();
		return UserAuthProvider.instance;
	}

	public static get model() {
		return UserAuth;
	}

	constructor() {
		super("UserAuth");
	}
}
