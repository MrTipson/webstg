// Basic types
export class identifier {
	constructor(public name: string, public from: number = -1, public to: number = -1) { }
	public toString() {
		return this.name;
	}
}
export class literal {
	constructor(public val: number, public isAddr = false, public from: number = -1, public to: number = -1) { }
	public toString() {
		return this.isAddr ? "0x" + this.val.toString(16) : String(this.val);
	}
}
export type atom = literal | identifier
export type primop = "+#" | "-#" | "*#" | "/#" | "%#" | ">=#" | ">#" | "==#" | "<#" | "<=#" | "!=#";

// Top level
export class program {
	constructor(public decls: (datatype | binding)[], public from: number = -1, public to: number = -1) { }

	public toString() {
		return this.decls.join("\n");
	}
}
export class datatype {
	constructor(
		public name: identifier, public types: identifier[], public constructors: constructor[],
		public from: number = -1, public to: number = -1
	) { }

	public toString() {
		return `data ${this.name} ${this.types.join(" ")} = ${this.constructors.join(" | ")}`;
	}
}
export class constructor {
	constructor(public name: identifier, public args: (identifier | constructor)[], public from: number = -1, public to: number = -1) { }

	public toString() {
		if (this.args.length == 0) {
			return String(this.name);
		}
		let args = this.args.map(x => x instanceof constructor ? "(" + String(x) + ")" : String(x))
		return `${this.name} ${args.join(" ")}`;
	}
}
export class binding {
	constructor(public name: identifier, public obj: heap_object, public from: number = -1, public to: number = -1) { }

	public toString() {
		return `${this.name} = ${this.obj}`;
	}
}

// Expressions
export type expression = let_expr | letrec_expr | case_expr | call | builtin_op | atom | case_eval
export class call {
	constructor(public f: atom, public atoms: atom[], public known: boolean = false, public from: number = -1, public to: number = -1) { }

	public toString() {
		//return `${this.f}_${this.known ? this.atoms.length : "?"} ${this.atoms.join(" ")}`;
		return `${this.f} ${this.atoms.join(" ")}`;
	}
}
export class builtin_op {
	constructor(public prim: primop, public atoms: atom[], public from: number = -1, public to: number = -1) { }

	public toString() {
		return ` ${this.atoms.join(" " + this.prim + " ")}`;
	}
}
export class let_expr {
	constructor(public binds: binding[], public expr: expression, public from: number = -1, public to: number = -1) { }

	public toString() {
		let pad_str = "    ";
		let binds = this.binds.join("\n").replaceAll("\n", "\n" + pad_str);
		let expr = String(this.expr).replaceAll("\n", "\n    ");

		return `let ${binds}\nin ${expr}`;
	}
}
export class letrec_expr {
	constructor(public binds: binding[], public expr: expression, public from: number = -1, public to: number = -1) { }

	public toString() {
		let pad_str = "       ";
		let binds = this.binds.join("\n").replaceAll("\n", "\n" + pad_str);
		let expr = String(this.expr).replaceAll("\n", "\n" + pad_str);

		return `letrec ${binds}\nin ${expr}`;
	}
}
export class case_expr {
	constructor(public expr: expression, public alts: alternatives, public from: number = -1, public to: number = -1) { }

	public toString() {
		return `case ${this.expr} of {${("\n" + this.alts).replaceAll("\n", "\n  ")}\n}`;
	}
}

export class case_eval {
	constructor(public val: literal, public alts: alternatives, public from: number = -1, public to: number = -1) { }

	public toString() {
		return `case ${this.val} of${("\n" + this.alts).replaceAll("\n", "\n  ")}`;
	}
}

// Case constructs
export class alternatives {
	constructor(public named_alts: algebraic_alt[], public default_alt?: default_alt, public from: number = -1, public to: number = -1) { }

	public toString() {
		let alts = "";
		if (this.named_alts.length > 0) {
			alts += this.named_alts.join("\n");
			if (this.default_alt) alts += "\n";
		}
		if (this.default_alt) {
			alts += this.default_alt;
		}
		return alts;
	}
}
export class algebraic_alt {
	constructor(public constr: identifier, public vars: identifier[], public expr: expression, public from: number = -1, public to: number = -1) { }

	public toString() {
		let pattern = `${this.constr} ${this.vars.join(" ")} -> `;
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str) + ";";
	}
}
export class default_alt {
	constructor(public name: identifier, public expr: expression, public from: number = -1, public to: number = -1) { }

	public toString() {
		let pattern = this.name + " -> ";
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str) + ";";
	}
}

export type heap_object = FUN | PAP | CON | THUNK | BLACKHOLE | INDIRECTION
export class FUN {
	constructor(public args: identifier[], public expr: expression, public env: Map<string, literal> = new Map(), public from: number = -1, public to: number = -1, public bind_name: string = '') { }

	public toString() {
		let args = this.args.join(" ");
		let expr;
		if (this.expr instanceof let_expr ||
			this.expr instanceof letrec_expr ||
			this.expr instanceof case_expr) {
			expr = ("\n" + String(this.expr)).replaceAll("\n", "\n    ") + "\n";
		} else {
			expr = String(this.expr);
		}

		return `FUN(${args} -> ${expr})`;
	}
	public heapInfo(): [string, literal[], string] {
		return ["FUN", this.env ? [...this.env.values()] : [], this.bind_name];
	}
}
export class PAP {
	constructor(public f: literal, public atoms: atom[], public from: number = -1, public to: number = -1, public bind_name: string = '') { }

	public toString() {
		return `PAP(${this.f} ${this.atoms.join(" ")})`;
	}
	public heapInfo(): [string, literal[], string] {
		return ["PAP", this.atoms as literal[], this.bind_name];
	}
}
export class CON {
	constructor(public constr: identifier, public atoms: atom[], public from: number = -1, public to: number = -1, public bind_name: string = '') { }

	public toString() {
		if (this.atoms.length === 0) {
			return `CON ${this.constr}`;
		}
		return `CON(${this.constr} ${this.atoms.join(" ")})`;
	}
	public heapInfo(): [string, literal[], string] {
		return [this.constr.name, this.atoms as literal[], this.bind_name];
	}
}
export class THUNK {
	constructor(public expr: expression, public env: Map<string, literal> = new Map(), public from: number = -1, public to: number = -1, public bind_name: string = '') { }

	public toString() {
		//return `THUNK(${this.expr}): ${[...this.env.entries()].map(([k, v]) => `${k}..${v}`).join(" ")}`;
		return `THUNK(${this.expr})`;
	}
	public heapInfo(): [string, literal[], string] {
		return ["THUNK", [...this.env.values()], this.bind_name];
	}
}
export class BLACKHOLE {
	constructor(public thunk: THUNK, public from: number = -1, public to: number = -1, public bind_name: string = '') { }
	public toString() {
		return "BLACKHOLE";
	}
	public heapInfo(): [string, literal[], string] {
		let [_, refs] = this.thunk.heapInfo();
		return ["BLACKHOLE", refs, this.bind_name];
	}
}

export class INDIRECTION {
	constructor(public addr: literal, public from: number = -1, public to: number = -1, public bind_name: string = '') { }
	public toString() {
		return `INDIRECTION ${this.addr}`;
	}
	public heapInfo(): [string, literal[], string] {
		return ["INDIRECTION", [this.addr], this.bind_name];
	}
}
