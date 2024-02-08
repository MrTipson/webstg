// Basic types
export type identifier = string
export type literal = number
export type atom = identifier | literal
export enum primop { Add, Sub, Mul, Div, Mod }

// Top level
export type program = bindings
export type bindings = binding[]
export class binding {
	constructor(public name: identifier, public lf: lambda_form) { }
}
export class lambda_form {
	constructor(
		public free_vars: identifier[],
		public update_flag: boolean,
		public args: identifier[],
		public expr: expression
	) { }
}

// Expressions
export type expression = let_expr | letrec_expr | case_expr | application | constructor | builtin_op | literal
export class let_expr {
	constructor(public binds: bindings, public expr: expression) { }
}
export class letrec_expr {
	constructor(public binds: bindings, public expr: expression) { }
}
export class case_expr {
	constructor(public expr: expression, public alts: alternatives) { }
}
export class application {
	constructor(public name: identifier, public atoms: atom[]) { }
}
export class constructor {
	constructor(public constr: identifier, public atoms: atom[]) { }
}
export class builtin_op {
	constructor(public prim: primop, public atoms: atom[]) { }
}

// Case constructs
export class alternatives {
	constructor(public named_alts: algebraic_alt[] | primitive_alt[], public default_alt: default_alt) { }
}
export class algebraic_alt {
	constructor(public constr: identifier, public vars: identifier[], public expr: expression) { }
}
export class primitive_alt {
	constructor(public val: literal, public expr: expression) { }
}
export class default_alt {
	constructor(public name: identifier | null, public expr: expression) { }
}
