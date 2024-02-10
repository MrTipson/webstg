// Basic types
export type identifier = string
export type literal = number
export type atom = identifier | literal
export enum primop { ADD = "+#", SUB = "-#", MUL = "*#", DIV = "/#", MOD = "%#", GTE = ">=#", GT = ">#", EQ = "==#", LT = "<#", LTE = "<=#", NE = "!=#" }

// Top level
export class program {
	constructor(public decls: (datatype | binding)[]) { }

	public toString() {
		return this.decls.join("\n");
	}
}
export class datatype {
	constructor(public name: identifier, public types: identifier[], public constructors: constructor[]) { }

	public toString() {
		return `data ${this.name} ${this.types.join(" ")} = ${this.constructors.map(String).join(" | ")}`;
	}
}
export class constructor {
	constructor(public name: identifier, public args: (identifier | constructor)[]) { }

	public toString() {
		if (this.args.length == 0) {
			return this.name;
		}
		let args = this.args.map(x => x instanceof constructor ? "(" + String(x) + ")" : String(x))
		return `${this.name} ${args.join(" ")}`;
	}
}
export class binding {
	constructor(public name: identifier, public obj: heap_object) { }

	public toString() {
		return `${this.name} = ${this.obj}`;
	}
}

// Expressions
// TODO: atom or literal?
export type expression = let_expr | letrec_expr | case_expr | call | builtin_op | atom
export class call {
	constructor(public name: identifier, public atoms: atom[]) { }

	public toString() {
		return `${this.name} ${this.atoms.join(" ")}`;
	}
}
export class builtin_op {
	constructor(public prim: primop, public atoms: atom[]) { }

	public toString() {
		return `${this.prim} ${this.atoms.join(" ")}`;
	}
}
export class let_expr {
	constructor(public binds: binding[], public expr: expression) { }

	public toString() {
		let pad_str = "    ";
		let binds = this.binds.join("\n").replaceAll("\n", "\n" + pad_str);
		let expr = String(this.expr).replaceAll("\n", "\n    ");

		return `let ${binds}\nin ${expr}`;
	}
}
export class letrec_expr {
	constructor(public binds: binding[], public expr: expression) { }

	public toString() {
		let pad_str = "       ";
		let binds = this.binds.join("\n").replaceAll("\n", "\n" + pad_str);
		let expr = String(this.expr).replaceAll("\n", "\n" + pad_str);

		return `letrec ${binds}\nin ${expr}`;
	}
}
export class case_expr {
	constructor(public expr: expression, public alts: alternatives) { }

	public toString() {
		return `case ${this.expr} of\n${this.alts}`;
	}
}

// Case constructs
export class alternatives {
	constructor(public named_alts: algebraic_alt[], public default_alt?: default_alt) { }

	public toString() {
		let alts = "";
		if (this.named_alts.length > 0) {
			alts += this.named_alts.join("\n");
			alts += "\n";
		}
		if (this.default_alt) {
			alts += this.default_alt;
		}
		return alts;
	}
}
export class algebraic_alt {
	constructor(public constr: identifier, public vars: identifier[], public expr: expression) { }

	public toString() {
		let pattern = `${this.constr} ${this.vars.join(" ")} -> `;
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str);
	}
}
export class default_alt {
	constructor(public name: identifier, public expr: expression) { }

	public toString() {
		let pattern = this.name + " -> ";
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str);
	}
}

export type heap_object = FUN | PAP | CON | THUNK | BLACKHOLE
export class FUN {
	constructor(public args: identifier[], public expr: expression) {
		if (args.length == 0) {
			throw "Function arguments cannot be empty";
		}
	}

	public toString() {
		let args = this.args.join(",");
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
}
export class PAP {
	constructor(public f: FUN, public atoms: atom[]) {
		if (atoms.length >= f.args.length) {
			throw "Partial application must have less arguments than expected";
		}
	}

	public toString() {
		return `PAP(${this.f}\n${this.atoms.join(" ")})`;
	}
}
export class CON {
	constructor(public constr: identifier, public atoms: atom[]) { }

	public toString() {
		if (this.atoms.length === 0) {
			return `CON ${this.constr}`;
		}
		return `CON(${this.constr} ${this.atoms.join(" ")})`;
	}
}
export class THUNK {
	constructor(public expr: expression) { }

	public toString() {
		return `THUNK(${this.expr})`;
	}
}
export class BLACKHOLE {
	constructor() { }
	public toString() {
		return "BLACKHOLE";
	}
}