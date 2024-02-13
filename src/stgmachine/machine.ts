import { rules as rs_evalapply } from "./evaluation_rules/eval-apply";
import { rules as rs_pushenter } from "./evaluation_rules/push-enter";
import { rules as rs_shared } from "./evaluation_rules/shared";
import { binding, identifier, type heap_object, type expression, program } from "../stglang/types";
import { heap } from "./heap";
import { stack } from "./stack";
import { enviroment } from "./enviroment";


export function simulate(prog: program, n: number) {
	let step = 0;
	let h = new heap();
	let s = new stack();
	let env = new enviroment();

	for (let decl of prog.decls) {
		if (decl instanceof binding) {
			env.add_global(decl.name, h.alloc(decl.obj));
		}
	}

	const push_enter = true;
	const ruleset = rs_shared.concat(push_enter ? rs_pushenter : rs_evalapply);

	let steps: { env: string, heap: string, stack: string, expr: string, rule: string | undefined }[] = [];
	let expr: expression = new identifier('main');
	let lastrule: string | undefined;
	try {
		while (expr && step < n) {
			steps.push({ env: String(env), heap: String(h), stack: String(s), expr: String(expr), rule: lastrule });
			step++; h.step++; s.step++; env.step++;
			console.log(step);
			let new_expr = undefined;
			for (let rule of ruleset) {
				//console.log(`Trying rule ${rule.name}`);
				new_expr = rule.apply(expr, env, s, h);
				if (new_expr) {
					lastrule = rule.name;
					expr = new_expr;
					break;
				};
			}
			if (!new_expr) break;
		}
	} catch (e) {
		console.log("ERROR:", e);
	}
	return steps;
}
