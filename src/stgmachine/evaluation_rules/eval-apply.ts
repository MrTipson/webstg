import { FUN, PAP, THUNK, call, literal, type expression, identifier } from "../../stglang/types";
import { register_rule, type Rule } from "./types";
import type { enviroment } from "../enviroment";
import type { heap } from "../heap";
import { apply_args, type stack } from "../stack";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "EXACT",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let fun = h.get(f);
		if (!(fun instanceof FUN &&
			fun.args.length == expr.atoms.length)) return undefined;
		for (let i = 0; i < expr.atoms.length; i++) {
			env.add_local(fun.args[i], expr.atoms[i]);
		}
		return fun.expr;
	}
});

reg({
	name: "CALLK",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let fun = h.get(f);
		if (!(fun instanceof FUN &&
			fun.args.length < expr.atoms.length)) return undefined;
		for (let i = 0; i < expr.atoms.length; i++) {
			env.add_local(fun.args[i], expr.atoms[i]);
		}
		let args = expr.atoms
			.slice(fun.args.length, expr.atoms.length)
			.map<literal>(x => x instanceof literal ? x : env.find_value(x));
		s.push(new apply_args(args))
		return fun.expr;
	}
});

reg({
	name: "PAP2",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let fun = h.get(f);
		if (!(fun instanceof FUN &&
			fun.args.length > expr.atoms.length)) return undefined;
		return h.alloc(new PAP(f, expr.atoms));
	}
});

reg({
	name: "TCALL",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		if (!(h.get(f) instanceof THUNK)) return undefined;
		s.push(new apply_args(expr.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x))));
		return f;
	}
});

reg({
	name: "PCALL",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call)) return undefined;
		let f = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let pap = h.get(f);
		if (!(pap instanceof PAP)) return undefined;
		return new call(pap.f, pap.atoms.concat(expr.atoms));
	}
});

reg({
	name: "RETFUN",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(s.peek() instanceof apply_args)) return undefined;
		if (!(expr instanceof literal || expr instanceof identifier)) return undefined;
		let f = expr instanceof literal ? expr : env.find_value(expr);
		let pap = h.get(f);
		if (!(pap instanceof PAP || pap instanceof FUN)) return undefined;
		return new call(f, (s.pop() as apply_args).values);
	}
});
