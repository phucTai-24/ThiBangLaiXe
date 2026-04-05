import { BaseProvider } from "#templates/base/provider";
import { File } from "#models/File";

export class FileProvider extends BaseProvider<File> {
	public static instance: FileProvider;

	public static getInstance(): FileProvider {
		FileProvider.instance ??= new FileProvider();
		return FileProvider.instance;
	}

	public static get model() {
		return File;
	}

	constructor() {
		super("File");
	}
}
