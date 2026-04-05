import { BaseProvider } from "#templates/base/provider";
import { PageConfigCategory } from "#models/PageConfigCategory";

export class PageConfigCategoryProvider extends BaseProvider<PageConfigCategory> {
	public static instance: PageConfigCategoryProvider;

	public static getInstance(): PageConfigCategoryProvider {
		PageConfigCategoryProvider.instance ??= new PageConfigCategoryProvider();
		return PageConfigCategoryProvider.instance;
	}

	public static get model() {
		return PageConfigCategory;
	}

	constructor() {
		super("PageConfigCategory");
	}
}
