import { BaseProvider } from "#templates/base/provider";
import { PostCategory } from "#models/PostCategory";

export class PostCategoryProvider extends BaseProvider<PostCategory> {
	public static instance: PostCategoryProvider;

	public static getInstance(): PostCategoryProvider {
		PostCategoryProvider.instance ??= new PostCategoryProvider();
		return PostCategoryProvider.instance;
	}

	public static get model() {
		return PostCategory;
	}

	constructor() {
		super("PostCategory");
	}
}
