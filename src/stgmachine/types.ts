import type { expression, identifier, literal } from "../stglang/types";

export type enviroment = object;
export class address {
	readonly addr: number;
	constructor(a: number) {
		if (Number.isInteger(a)) {
			this.addr = a;
		} else {
			throw "Address must be an integer";
		}
	}
	public toString() {
		return this.addr.toString(16);
	}
}

export class Eval {
	constructor(public expr: expression, public env: enviroment) { }
}
export class Enter {
	constructor(public addr: address) { }
}
export class ReturnCon {
	constructor(public constr: identifier, public vals: (literal | address)[]) { }
}