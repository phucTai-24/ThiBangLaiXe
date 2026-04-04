import { BaseProvider } from "#templates/base/provider";
import { Post } from "#models/Post";

export class PostProvider extends BaseProvider<Post> {
	public static instance: PostProvider;

	public static getInstance(): PostProvider {
		PostProvider.instance ??= new PostProvider();
		return PostProvider.instance;
	}

	public static get model() {
		return Post;
	}

	constructor() {
		super("Post");
	}
}
