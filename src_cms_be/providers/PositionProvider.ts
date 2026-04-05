import { BaseProvider } from "#templates/base/provider";
import { Position } from "#models/Position";

export class PositionProvider extends BaseProvider<Position> {
	public static instance: PositionProvider;

	public static getInstance(): PositionProvider {
		PositionProvider.instance ??= new PositionProvider();
		return PositionProvider.instance;
	}

	public static get model() {
		return Position;
	}

	constructor() {
		super("Position");
	}
}
