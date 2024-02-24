import { parser } from "./parser.js"
import { sum_prg } from "./test.ts";
import { identifier, literal, program, datatype, constructor, binding, call, builtin_op, let_expr, letrec_expr, case_expr, alternatives, algebraic_alt, default_alt, FUN, PAP, CON, THUNK, BLACKHOLE } from "@/stglang/types";

let code = String(sum_prg);
export let out = parser.parse(code);

if (false)
	out.iterate({
		enter(n) {
			console.log(n.name, n.from, n.to);
			if (!n.name) return;
		},
		leave(n) { }
	});
// this is not a typescript file so we can be a bit loose
export function build_ast(code) {
	const tree = parser.parse(code);

	let stack = [];
	let args = [];

	let ast;
	let constructors = [];
	let datatypes = [];
	tree.iterate({
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
				case "Identifier":
					args.push(new identifier(code.substring(n.from, n.to), n.from, n.to));
					break;
				case "Literal":
					args.push(new literal(Number(code.substring(n.from, n.to)), false, n.from, n.to));
					break;
				case "⚠": throw new Error("Invalid program");
			}
		},
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
					} else {
						let alt = new default_alt(args[0], args[2], n.from, n.to);
						args = stack.pop();
						args.push(alt);
						return;
					}
				case "Primop":
					let primop = new builtin_op(args[1], [args[0], args[2]], n.from, n.to);
					args = stack.pop();
					args.push(primop);
					return;
				case "FUN_obj":
					let fun = new FUN(...args, undefined, n.from, n.to);
					args = stack.pop();
					args.push(fun);
					return;
				case "THUNK_obj":
					let thunk = new THUNK(...args, undefined, n.from, n.to);
					args = stack.pop();
					args.push(thunk);
					return;
				case "CON_obj":
					constr = CON;
					if (args.length == 1) args.push([]);
					break;
				// Syntax nodes that just wrap arrays of args/fields
				case "Generic_types":
				case "CON_fields":
				case "FUN_args":
				case "Let_binds":
				case "Call_args":
				case "Alts":
				case "Constructors":
				case "Subconstructors":
				case "Pattern_binds":
					let fields = args;
					args = stack.pop();
					args.push(fields);
					return;
				default: return;
			}
			const ret = new constr(...args, n.from, n.to);
			args = stack.pop();
			args.push(ret);
		}
	});
	return ast;
}
