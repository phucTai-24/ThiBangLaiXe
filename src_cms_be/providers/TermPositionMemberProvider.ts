import { BaseProvider } from "#templates/base/provider";
import { TermPositionMember } from "#models/TermPositionMember";

export class TermPositionMemberProvider extends BaseProvider<TermPositionMember> {
	public static instance: TermPositionMemberProvider;

	public static getInstance(): TermPositionMemberProvider {
		TermPositionMemberProvider.instance ??= new TermPositionMemberProvider();
		return TermPositionMemberProvider.instance;
	}

	public static get model() {
		return TermPositionMember;
	}

	constructor() {
		super("TermPositionMember");
	}
}
