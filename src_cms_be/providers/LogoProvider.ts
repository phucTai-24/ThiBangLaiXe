import { BaseProvider } from "#templates/base/provider";
import { Logo } from "#models/Logo";

export class LogoProvider extends BaseProvider<Logo> {
	public static instance: LogoProvider;

	public static getInstance(): LogoProvider {
		LogoProvider.instance ??= new LogoProvider();
		return LogoProvider.instance;
	}

	public static get model() {
		return Logo;
	}

	constructor() {
		super("Logo");
	}
}
