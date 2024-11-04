import { FUN, PAP, THUNK, call, literal, type expression, identifier } from "@/stglang/types";
import { register_rule, type Rule, frac } from "@/stgmachine/evaluation_rules/utils";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import { apply_args, type stack } from "@/stgmachine/stack";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "EXACT",
	definition: frac
		(`f^\\bullet\\ a_1 \\ldots a_n; \\Ss; \\SH[f] = \\FUN(x_1 \\ldots x_n \\rightarrow e, \\SENV_f); \\SENV`)
		(`e; \\Ss; \\SH; \\SENV_f[x_1 \\mapsto a_1 \\ldots x_n \\mapsto a_n]`),
	explanation: "Call of an unknown function with a matching number of arguments",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let obj = h.get(f);
		if (!(obj instanceof FUN &&
			obj.args.length == expr.atoms.length)) return undefined;
		let fun = obj;
		return function () {
			let args = expr.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x));
			env.replace_locals(fun.env);
			for (let i = 0; i < expr.atoms.length; i++) {
				env.add_local(fun.args[i], args[i]);
			}
			return fun.expr;
		};
	}
});

reg({
	name: "CALLK",
	definition: frac
		(`f^k\\ a_1 \\ldots a_m; \\Ss; \\SH[f] = \\FUN(x_1 \\ldots x_n \\rightarrow e, \\SENV_f); \\SENV`)
		(`e; (\\bullet\\ a_{n+1} \\ldots a_m):\\Ss; \\SH; \\SENV_f[x_1 \\mapsto a_1 \\ldots x_n \\mapsto a_n] \\quad m > n`),
	explanation: "Function call with too many arguments, the excess of which is pushed onto the stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let obj = h.get(f);
		if (!(obj instanceof FUN &&
			obj.args.length < expr.atoms.length)) return undefined;
		let fun = obj;
		return function () {
			let args = expr.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x));
			env.replace_locals(fun.env);
			for (let i = 0; i < fun.args.length; i++) {
				env.add_local(fun.args[i], args[i]);
			}
			s.push(new apply_args(args.slice(fun.args.length, expr.atoms.length)));
			return fun.expr;
		};
	}
});

reg({
	name: "PAP2",
	definition: frac
		(`f^k\\ a_1 \\ldots a_m; \\Ss; \\SH[f] = \\FUN(x_1 \\ldots x_n \\rightarrow e, \\SENV_f); \\SENV`)
		(`p; \\Ss; \\SH[p] = \\PAP(f\\ a_1 \\ldots a_m); \\SENV \\quad m < n`),
	explanation: "Function call with too few arguments, a partial application is constructed",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let fun = h.get(f);
		if (!(fun instanceof FUN &&
			fun.args.length > expr.atoms.length)) return undefined;
		return () => h.alloc(new PAP(f, expr.atoms, expr.from, expr.to));
	}
});

reg({
	name: "TCALL",
	definition: frac
		(`f^\\bullet\\ a_1 \\ldots a_m; \\Ss; \\SH[f] = \\THUNK(e, \\SENV'); \\SENV`)
		(`f; (\\bullet\\ a_1 \\ldots a_m):\\Ss; \\SH; \\SENV`),
	explanation: "Calling a thunk (it may return a PAP or FUN, so the arguments must be pushed onto the stack)",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		if (!(h.get(f) instanceof THUNK)) return undefined;
		return function () {
			s.push(new apply_args(expr.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x))));
			return f;
		};
	}
});

reg({
	name: "PCALL",
	definition: frac
		(`f^k\\ a_{n+1} \\ldots a_m; \\Ss; \\SH[f] = \\PAP(g\\ a_1 \\ldots a_n); \\SENV`)
		(`g^\\bullet\\ a_1 \\ldots a_n\\ a_{n+1} \\ldots a_m; \\Ss; \\SH; \\SENV`),
	explanation: "Providing additional arguments to a partial application",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let obj = h.get(f);
		if (!(obj instanceof PAP)) return undefined;
		let pap = obj;
		return () => new call(pap.f, pap.atoms.concat(expr.atoms), false, expr.from, expr.to);
	}
});

reg({
	name: "RETFUN",
	definition: frac
		(`f; (\\bullet\\ a_1 \\ldots a_n):\\Ss; \\SH[f] \\in \\{\\FUN, \\PAP\\}; \\SENV`)
		(`f^\\bullet\\ a_1 \\ldots a_n; \\Ss; \\SH; \\SENV`),
	explanation: "Construct a function call with returned function (or partial application) and arguments from stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(s.peek() instanceof apply_args)) return undefined;
		if (!(expr instanceof literal || expr instanceof identifier)) return undefined;
		let f = expr instanceof literal ? expr : env.find_value(expr);
		let pap = h.get(f);
		if (!(pap instanceof PAP || pap instanceof FUN)) return undefined;
		return () => new call(f, (s.pop() as apply_args).values, false, expr.from, expr.to);
	}
});
