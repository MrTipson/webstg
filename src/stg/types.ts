// Basic types
export type identifier = string
export type literal = number
export type atom = identifier | literal
export enum primop { "+#", "-#", "*#", "/#", "%#" }

// Top level
export type program = bindings
export type bindings = binding[]
export class binding {
	constructor(public name: identifier, public lf: lambda_form) { }

	public toString() {
		return `${this.name} = ${this.lf}`;
	}
}
export class lambda_form {
	constructor(
		public free_vars: identifier[],
		public update_flag: boolean,
		public args: identifier[],
		public expr: expression
	) { }

	public toString() {
		let free_vars = this.free_vars.join(",");
		let args = this.args.join(",");
		let update_flag = this.update_flag ? "\\u" : "\\n";
		let expr;
		if (this.expr instanceof let_expr ||
			this.expr instanceof letrec_expr ||
			this.expr instanceof case_expr) {
			expr = ("\n" + String(this.expr)).replaceAll("\n", "\n    ");
		} else {
			expr = String(this.expr);
		}

		return `{${free_vars}} ${update_flag} {${args}} -> ${expr}`;
	}
}

// Expressions
// TODO: atom or literal?
export type expression = let_expr | letrec_expr | case_expr | application | constructor | builtin_op | atom
export class let_expr {
	constructor(public binds: bindings, public expr: expression) { }

	public toString() {
		let pad_str = "    ";
		let binds = this.binds
			.map(x => String(x))
			.join("\n")
			.replaceAll("\n", "\n" + pad_str);
		let expr = String(this.expr).replaceAll("\n", "\n    ");

		return `let ${binds}\nin ${expr}`;
	}
}
export class letrec_expr {
	constructor(public binds: bindings, public expr: expression) { }

	public toString() {
		let pad_str = "       ";
		let binds = this.binds
			.map(x => String(x))
			.join("\n")
			.replaceAll("\n", "\n" + pad_str);
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
export class application {
	constructor(public name: identifier, public atoms: atom[]) { }

	public toString() {
		return `${this.name} {${this.atoms.join(",")}}`;
	}
}
export class constructor {
	constructor(public constr: identifier, public atoms: atom[]) { }

	public toString() {
		return `${this.constr} {${this.atoms.join(",")}}`;
	}
}
export class builtin_op {
	constructor(public prim: primop, public atoms: atom[]) { }

	public toString() {
		return `${this.prim} {${this.atoms.join(",")}}`;
	}
}

// Case constructs
export class alternatives {
	constructor(public named_alts: algebraic_alt[] | primitive_alt[], public default_alt?: default_alt) { }

	public toString() {
		let alts = this.named_alts.map(String).join("\n");
		if (this.default_alt) {
			alts += "\n" + this.default_alt;
		}
		return alts;
	}
}
export class algebraic_alt {
	constructor(public constr: identifier, public vars: identifier[], public expr: expression) { }

	public toString() {
		let pattern = `${this.constr} {${this.vars.join(",")}} -> `;
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str);
	}
}
export class primitive_alt {
	constructor(public val: literal, public expr: expression) { }

	public toString() {
		let pattern = `${this.val}# -> `;
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str);
	}
}
export class default_alt {
	constructor(public name: identifier | null, public expr: expression) { }

	public toString() {
		let pattern;
		if (this.name === null) {
			pattern = "default -> ";
		} else {
			pattern = this.name + " -> ";
		}
		let pad_str = " ".repeat(pattern.length);
		return pattern + String(this.expr).replaceAll("\n", "\n" + pad_str);
	}
}
