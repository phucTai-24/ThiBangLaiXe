import { BaseProvider } from "#templates/base/provider";
import { UserSession } from "#models/UserSession";

export class UserSessionProvider extends BaseProvider<UserSession> {
	public static instance: UserSessionProvider;

	public static getInstance(): UserSessionProvider {
		UserSessionProvider.instance ??= new UserSessionProvider();
		return UserSessionProvider.instance;
	}

	public static get model() {
		return UserSession;
	}

	constructor() {
		super("UserSession");
	}
}
