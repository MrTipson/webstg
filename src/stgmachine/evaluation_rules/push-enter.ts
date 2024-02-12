import { call, literal, type expression, FUN, identifier, PAP, type atom } from "../../stglang/types";
import { register_rule, type Rule } from "./types";
import type { enviroment } from "../enviroment";
import type { heap } from "../heap";
import { pending_arg, type stack } from "../stack";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "PUSH",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call)) return undefined;
		let call_expr = expr as call;
		for (let i = call_expr.atoms.length - 1; i >= 0; i--) {
			s.push(new pending_arg(call_expr.atoms[i]));
		}
		return call_expr.f;
	}
});

reg({
	name: "FENTER",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof literal)) return undefined;
		let fun = h.get(expr);
		if (!(fun instanceof FUN)) return undefined;
		let n = fun.args.length;
		let stack_objs = s.peekn(n);
		if (stack_objs.length != n || stack_objs.some(x => !(x instanceof pending_arg))) return undefined;
		for (let i = 0; i < n; i++) {
			env.add_local(fun.args[i], (s.pop() as pending_arg).atom, s);
		}
		return fun.expr;
	}
});

reg({
	name: "PAP1",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof literal)) return undefined;
		let fun = h.get(expr);
		if (!(fun instanceof FUN)) return undefined;
		// We can rely that the previous rule would've picked up if we had enough args
		// So we only need to know if there is at least one
		if (!(s.peek() instanceof pending_arg)) return undefined;
		let pap_args = [];
		while (s.peek() instanceof pending_arg) {
			pap_args.push((s.pop() as pending_arg).atom);
		}
		return h.alloc(new PAP(expr, pap_args));
	}
});

reg({
	name: "PENTER",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof literal)) return undefined;
		let fun = h.get(expr);
		if (!(fun instanceof PAP &&
			s.peek() instanceof pending_arg)) return undefined;
		let pap_args = fun.atoms;
		while (pap_args.length > 0) {
			s.push(new pending_arg(pap_args.pop() as atom));
		}
		return fun.f;
	}
});
