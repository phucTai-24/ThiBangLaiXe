import { BaseProvider } from "#templates/base/provider";
import { Category } from "#models/Category";

export class CategoryProvider extends BaseProvider<Category> {
	public static instance: CategoryProvider;

	public static getInstance(): CategoryProvider {
		CategoryProvider.instance ??= new CategoryProvider();
		return CategoryProvider.instance;
	}

	public static get model() {
		return Category;
	}

	constructor() {
		super("Category");
	}
}
