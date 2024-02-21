import { rules as rs_evalapply } from "@/stgmachine/evaluation_rules/eval-apply";
import { rules as rs_pushenter } from "@/stgmachine/evaluation_rules/push-enter";
import { rules as rs_shared } from "@/stgmachine/evaluation_rules/shared";
import { binding, identifier, type heap_object, type expression, program, FUN, datatype, call, let_expr, THUNK, letrec_expr, case_expr } from "@/stglang/types";
import { heap } from "@/stgmachine/heap";
import { stack } from "@/stgmachine/stack";
import { enviroment } from "@/stgmachine/enviroment";
import { rungc } from "@/stgmachine/garbage_collection";

export class stg_machine {
	public step_number: number;
	public readonly prog: program;
	public readonly eval_apply: boolean;
	public readonly garbage_collection: boolean;

	public readonly h = new heap();
	public readonly s = new stack();
	public readonly env = new enviroment();

	private ruleset;
	public expr: expression;
	public exprs: expression[] = [];
	public lastrule: string | undefined;

	constructor(prog: program, eval_apply: boolean = false, garbage_collection: boolean = false) {
		this.step_number = 0;
		this.prog = prog;
		annotate_known_function_calls(prog);

		this.eval_apply = eval_apply;
		this.ruleset = rs_shared.concat(eval_apply ? rs_evalapply : rs_pushenter);

		this.garbage_collection = garbage_collection;
		this.expr = new identifier("main");

		for (let decl of prog.decls) {
			if (decl instanceof binding) {
				this.env.add_global(decl.name, this.h.alloc(decl.obj));
			}
		}
		if (this.garbage_collection) rungc(this.expr, this.env, this.s, this.h);
		this.step_number++; this.h.step++; this.s.step++; this.env.step++;
		this.exprs[this.step_number] = this.expr;
	}

	step(): boolean {
		try {
			let new_expr = undefined;
			for (let rule of this.ruleset) {
				//console.log(`Trying rule ${rule.name}`);
				new_expr = rule.apply(this.expr, this.env, this.s, this.h);
				if (new_expr) {
					this.lastrule = rule.name;
					this.expr = new_expr;
					if (this.garbage_collection) rungc(this.expr, this.env, this.s, this.h);
					this.step_number++; this.h.step++; this.s.step++; this.env.step++;
					this.exprs[this.step_number] = this.expr;
					return true;
				}
			}
		} catch (e) {
			console.log("ERROR:", e);
		}
		return false;
	}

	step_back(): boolean {
		try {
			if (this.step_number <= 1) {
				return false;
			}
			this.step_number--; this.h.back(); this.s.back(); this.env.back();
			this.expr = this.exprs[this.step_number];
			return true;
		} catch (e) {
			console.log("ERROR:", e);
		}
		return false;
	}
}

export function simulate(prog: program, n: number, eval_apply: boolean = false, garbage_collection: boolean = false) {
	let machine = new stg_machine(prog, eval_apply, garbage_collection);
	let steps: { env: string, heap: string, stack: string, expr: string, rule: string | undefined }[] = [];

	while (machine.step_number < n && machine.step()) {
		steps.push({
			env: String(machine.env),
			heap: String(machine.h),
			stack: String(machine.s),
			expr: String(machine.expr),
			rule: machine.lastrule
		});
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
