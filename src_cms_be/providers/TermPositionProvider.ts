import { BaseProvider } from "#templates/base/provider";
import { TermPosition } from "#models/TermPosition";

export class TermPositionProvider extends BaseProvider<TermPosition> {
	public static instance: TermPositionProvider;

	public static getInstance(): TermPositionProvider {
		TermPositionProvider.instance ??= new TermPositionProvider();
		return TermPositionProvider.instance;
	}

	public static get model() {
		return TermPosition;
	}

	constructor() {
		super("TermPosition");
	}
}
