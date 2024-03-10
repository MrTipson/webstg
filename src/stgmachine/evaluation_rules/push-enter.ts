import { call, literal, type expression, FUN, identifier, PAP, type atom } from "@/stglang/types";
import { register_rule, type Rule } from "@/stgmachine/evaluation_rules/types";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import { pending_arg, type stack } from "@/stgmachine/stack";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "PUSH",
	definition: "$f^k \\, a_1 \\ldots a_m$; $s$; $H \\: \\Rightarrow \\: f$; Arg $a_1 \\ldots \\, $Arg $a_m:s$; $H$",
	explanation: "Push function arguments onto the stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof call)) return undefined;
		let call_expr = expr as call;
		return function () {
			for (let i = call_expr.atoms.length - 1; i >= 0; i--) {
				let value = call_expr.atoms[i];
				s.push(new pending_arg(value instanceof literal ? value : env.find_value(value)));
			}
			return call_expr.f;
		}
	}
});

reg({
	name: "FENTER",
	definition: "$f$; Arg $a_1 \\ldots$ Arg $a_n:s$; $H[f \\mapsto \\mathtt{FUN}(x_1 \\ldots x_n \\rightarrow e)] \\:" +
		"\\Rightarrow \\: e[a_1/x_1 \\ldots a_n/x_n]$; $s$; $H$",
	explanation: "Collect function arguments off the stack and enter function body",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal)) return undefined;
		let obj = h.get(expr);
		if (!(obj instanceof FUN)) return undefined;
		let fun = obj;
		let n = fun.args.length;
		let stack_objs = s.peekn(n);
		if (stack_objs.length != n || stack_objs.some(x => !(x instanceof pending_arg))) return undefined;
		return function () {
			for (let i = 0; i < n; i++) {
				env.add_local(fun.args[i], (s.pop() as pending_arg).value);
			}
			return fun.expr;
		}
	}
});

reg({
	name: "PAP1",
	definition: "$f$; Arg $a_1 \\ldots $ Arg $a_m:s$; $H[f \\mapsto \\mathtt{FUN}(x_1 \\ldots x_n \\rightarrow e)] \\:" +
		"\\Rightarrow \\: p$; $s$; $H[p \\mapsto \\mathtt{PAP}(f \\, a_1 \\ldots a_m)] \\quad \\mathit{1 \\le m \\lt n}$",
	explanation: "Construct partial application",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal)) return undefined;
		let fun = h.get(expr);
		if (!(fun instanceof FUN)) return undefined;
		// We can rely that the previous rule would've picked up if we had enough args
		// So we only need to know if there is at least one
		if (!(s.peek() instanceof pending_arg)) return undefined;
		return function () {
			let pap_args = [];
			while (s.peek() instanceof pending_arg) {
				pap_args.push((s.pop() as pending_arg).value);
			}
			return h.alloc(new PAP(expr, pap_args));
		}
	}
});

reg({
	name: "PENTER",
	definition: "$f$; Arg $a_{n+1}:s$; $H[f \\mapsto \\mathtt{PAP}(g \\, a_1 \\ldots a_n)] \\: \\Rightarrow" +
		"\\: g$; Arg $a_1 \\ldots$ Arg $a_n:$ Arg $a_{n+1}:s$; $H$",
	explanation: "Enter partial application and push combined arguments onto the stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal)) return undefined;
		let obj = h.get(expr);
		if (!(obj instanceof PAP &&
			s.peek() instanceof pending_arg)) return undefined;
		let fun = obj;
		return function () {
			let pap_args = fun.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x));
			for (let i = pap_args.length - 1; i >= 0; i--) {
				s.push(new pending_arg(pap_args[i]));
			}
			return fun.f;
		}
	}
});
