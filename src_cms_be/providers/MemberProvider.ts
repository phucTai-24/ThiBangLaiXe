import { BaseProvider } from "#templates/base/provider";
import { Member } from "#models/Member";

export class MemberProvider extends BaseProvider<Member> {
	public static instance: MemberProvider;

	public static getInstance(): MemberProvider {
		MemberProvider.instance ??= new MemberProvider();
		return MemberProvider.instance;
	}

	public static get model() {
		return Member;
	}

	constructor() {
		super("Member");
	}
}
