import { BaseProvider } from "#templates/base/provider";
import { SiteInformation } from "#models/SiteInformation";

export class SiteInformationProvider extends BaseProvider<SiteInformation> {
	public static instance: SiteInformationProvider;

	public static getInstance(): SiteInformationProvider {
		SiteInformationProvider.instance ??= new SiteInformationProvider();
		return SiteInformationProvider.instance;
	}

	public static get model() {
		return SiteInformation;
	}

	constructor() {
		super("SiteInformation");
	}
}
