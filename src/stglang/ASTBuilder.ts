import { parser } from "./parser.js"
import { identifier, literal, program, datatype, constructor, binding, call, builtin_op, let_expr, letrec_expr, case_expr, alternatives, algebraic_alt, default_alt, FUN, CON, THUNK, PAP } from "@/stglang/types";

/** Exception that is passed on from the parser */
export class STGSyntaxError extends Error {
	/**
	 * Create an exception
	 * @param m Message
	 * @param from Start index of the offending source text
	 * @param to End index of the offending source text
	 */
	constructor(m: string, public from: number, public to: number) {
		super(m);
		// https://github.com/microsoft/TypeScript-wiki/blob/81fe7b91664de43c02ea209492ec1cea7f3661d0/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
		Object.setPrototypeOf(this, STGSyntaxError.prototype);
	}
}

/**
 * Parse the source and construct an abstract syntax tree
 * 
 * *Note: We also type check the constructors to help the user.
 * Since STG would normally be used as an intermediary representation,
 * type checking would not be necessary, since the program would have been type checked already.*
 * @param code Source program text
 */
export function build_ast(code: string): program {
	const tree = parser.parse(code);

	let stack: any = []; // used to save pending args when entering another node
	let args: any = []; // accumulate arguments for parent node

	let ast: program | undefined;
	let constructors: string[] = [];
	// let datatypes = [];
	tree.iterate({
		// Entering accumulates leaves and 
		enter(n) {
			switch (n.name) {
				case "Datatype":
				case "Constructors":
				case "Constructor":
				case "Subconstructors":
				case "Subconstructor":
				case "Generic_types":
				case "Binding":
				case "CON_obj":
				case "CON_fields":
				case "FUN_obj":
				case "FUN_args":
				case "PAP_obj":
				case "THUNK_obj":
				case "Let_expr":
				case "Letrec_expr":
				case "Let_binds":
				case "Case_expr":
				case "Alts":
				case "Alternative":
				case "Pattern_binds":
				case "Call":
				case "Call_args":
				case "Primop":
					stack.push(args);
					args = [];
					break;
				case "Operator":
					args.push(code.substring(n.from, n.to));
					break;
				case "Identifier":
					args.push(new identifier(code.substring(n.from, n.to), n.from, n.to));
					break;
				case "Literal":
					args.push(new literal(Number(code.substring(n.from, n.to)), false, n.from, n.to));
					break;
				case "⚠": throw new STGSyntaxError("Unexpected token", n.from, n.to);
			}
		},
		// Leaving collects arguments and constructs AST node. Result is typically pushed back on to arguments
		leave(n) {
			let constr;
			switch (n.name) {
				case "Program":
					ast = new program(args, n.from, n.to);
					return;
				// Syntax nodes that translate directly into classes
				case "Datatype": constr = datatype; break;
				case "Constructor":
					constructors.push(args[0].name);
					constr = constructor;
					break;
				case "Subconstructor":
					// custom datatypes are kinda borked
					const ret = new constructor(args[0], args.slice(1), n.from, n.to);
					args = stack.pop();
					args.push(ret);
					return;
				case "Binding": constr = binding; break;
				case "Let_expr": constr = let_expr; break;
				case "Letrec_expr": constr = letrec_expr; break;
				case "Case_expr": constr = case_expr; break;
				case "Call": {
					let expr = new call(args[0], args[1], false, n.from, n.to);
					args = stack.pop();
					args.push(expr);
					return;
				}
				case "Alternative":
					if (constructors.includes(args[0].name)) {
						constr = algebraic_alt;
						break;
					} else if (args[1].length == 0) {
						let alt = new default_alt(args[0], args[2], n.from, n.to);
						args = stack.pop();
						args.push(alt);
						return;
					} else {
						throw new STGSyntaxError(`Unknown constructor in alternative`, n.from, n.to);
					}
				case "Primop":
					let primop = new builtin_op(args[1], [args[0], args[2]], n.from, n.to);
					args = stack.pop();
					args.push(primop);
					return;
				case "FUN_obj":
					// @ts-ignore
					let fun = new FUN(...args, undefined, n.from, n.to);
					args = stack.pop();
					args.push(fun);
					return;
				case "THUNK_obj":
					// @ts-ignore
					let thunk = new THUNK(...args, undefined, n.from, n.to);
					args = stack.pop();
					args.push(thunk);
					return;
				case "CON_obj":
					constr = CON;
					if (!constructors.includes(args[0].name)) throw new STGSyntaxError("Constructor doesn't exist", n.from, n.to);
					if (args.length == 1) args.push([]);
					break;
				case "PAP_obj":
					constr = PAP;
					let ecall: call = args.pop();
					args.push(ecall.f);
					args.push(ecall.atoms);
					break;
				case "Alts": {
					let alts: (algebraic_alt | default_alt)[] = args;
					let named_alts = alts.filter(x => x instanceof algebraic_alt) as algebraic_alt[];
					let default_alts = alts.filter(x => x instanceof default_alt) as default_alt[];
					if (default_alts.length > 1) {
						throw new STGSyntaxError(`More than one default case alternative`, n.from, n.to);
					}
					args = stack.pop();
					args.push(new alternatives(named_alts, default_alts[0], n.from, n.to));
					return;
				}
				// Syntax nodes that just wrap arrays of args/fields
				case "Generic_types":
				case "CON_fields":
				case "FUN_args":
				case "Let_binds":
				case "Call_args":
				case "Constructors":
				case "Subconstructors":
				case "Pattern_binds":
					let fields = args;
					args = stack.pop();
					args.push(fields);
					return;
				default: return;
			}
			// @ts-ignore
			const ret = new constr(...args, n.from, n.to);
			args = stack.pop();
			args.push(ret);
		}
	});
	// If the tree iteration finds errors, it will raise an exception
	// So we can expect that the program is correct
	return ast as program;
}
