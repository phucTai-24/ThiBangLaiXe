import { BaseProvider } from "#templates/base/provider";
import { Term } from "#models/Term";

export class TermProvider extends BaseProvider<Term> {
	public static instance: TermProvider;

	public static getInstance(): TermProvider {
		TermProvider.instance ??= new TermProvider();
		return TermProvider.instance;
	}

	public static get model() {
		return Term;
	}

	constructor() {
		super("Term");
	}
}
