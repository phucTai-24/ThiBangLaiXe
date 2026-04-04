import { BaseProvider } from "#templates/base/provider";
import { Business } from "#models/Business";

export class BusinessProvider extends BaseProvider<Business> {
	public static instance: BusinessProvider;

	public static getInstance(): BusinessProvider {
		BusinessProvider.instance ??= new BusinessProvider();
		return BusinessProvider.instance;
	}

	public static get model() {
		return Business;
	}

	constructor() {
		super("Business");
	}
}
