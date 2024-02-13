import { rules as rs_evalapply } from "./evaluation_rules/eval-apply";
import { rules as rs_pushenter } from "./evaluation_rules/push-enter";
import { rules as rs_shared } from "./evaluation_rules/shared";
import { binding, identifier, type heap_object, type expression, program, FUN, datatype, call, let_expr, THUNK, letrec_expr, case_expr } from "../stglang/types";
import { heap } from "./heap";
import { stack } from "./stack";
import { enviroment } from "./enviroment";


export function simulate(prog: program, n: number, eval_apply: boolean = false) {
	let step = 0;
	let h = new heap();
	let s = new stack();
	let env = new enviroment();

	annotate_known_function_calls(prog);

	for (let decl of prog.decls) {
		if (decl instanceof binding) {
			env.add_global(decl.name, h.alloc(decl.obj));
		}
	}

	const ruleset = rs_shared.concat(eval_apply ? rs_evalapply : rs_pushenter);

	let steps: { env: string, heap: string, stack: string, expr: string, rule: string | undefined }[] = [];
	let expr: expression = new identifier('main');
	let lastrule: string | undefined;
	try {
		while (expr && step < n) {
			steps.push({ env: String(env), heap: String(h), stack: String(s), expr: String(expr), rule: lastrule });
			step++; h.step++; s.step++; env.step++;
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


function annotate_known_function_calls(prog: program) {

	function helper(expr: expression, env: Map<string, FUN>) {
		if (expr instanceof call && expr.f instanceof identifier) {
			let fun = env.get(expr.f.name);
			if (fun && fun.args.length == expr.atoms.length) {
				expr.known = true;
			}
		} else if (expr instanceof let_expr) {
			let new_env = new Map(env);
			for (let bind of expr.binds) {
				if (bind.obj instanceof FUN) {
					helper(bind.obj.expr, new_env);
					new_env.set(bind.name.name, bind.obj); // shouldnt see itself
				} else if (bind.obj instanceof THUNK) { helper(bind.obj.expr, new_env) }
			}
			helper(expr.expr, new_env);
		} else if (expr instanceof letrec_expr) {
			let new_env = new Map(env);
			for (let bind of expr.binds) {
				if (bind.obj instanceof FUN) {
					new_env.set(bind.name.name, bind.obj);
				}
			}
			for (let bind of expr.binds) {
				if (bind.obj instanceof FUN || bind.obj instanceof THUNK) {
					helper(bind.obj.expr, new_env);
				}
			}
			helper(expr.expr, new_env);
		} else if (expr instanceof case_expr) {
			helper(expr.expr, env);
			for (let alt of expr.alts.named_alts) {
				helper(alt.expr, env);
			}
			if (expr.alts.default_alt) {
				helper(expr.alts.default_alt.expr, env);
			}
		}
	}

	let funs = new Map<string, FUN>();
	// First pass grabs all globals
	for (let decl of prog.decls) {
		if (decl instanceof datatype) continue;
		if (decl.obj instanceof FUN) funs.set(decl.name.name, decl.obj);
	}
	// Second pass checks use
	for (let decl of prog.decls) {
		if (decl instanceof datatype) continue;
		if (decl.obj instanceof FUN || decl.obj instanceof THUNK) {
			helper(decl.obj.expr, funs);
		}
	}
}
