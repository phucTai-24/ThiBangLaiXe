import { BaseProvider } from "#templates/base/provider";
import { User } from "#models/User";

export class UserProvider extends BaseProvider<User> {
	public static instance: UserProvider;

	public static getInstance(): UserProvider {
		UserProvider.instance ??= new UserProvider();
		return UserProvider.instance;
	}

	public static get model() {
		return User;
	}

	constructor() {
		super("User");
	}
}
