import { BaseProvider } from "#templates/base/provider";
import { Contact } from "#models/Contact";

export class ContactProvider extends BaseProvider<Contact> {
	public static instance: ContactProvider;

	public static getInstance(): ContactProvider {
		ContactProvider.instance ??= new ContactProvider();
		return ContactProvider.instance;
	}

	public static get model() {
		return Contact;
	}

	constructor() {
		super("Contact");
	}
}
