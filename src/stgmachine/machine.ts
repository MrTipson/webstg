import { rules as rs_evalapply } from "@/stgmachine/evaluation_rules/eval-apply";
import { rules as rs_pushenter } from "@/stgmachine/evaluation_rules/push-enter";
import { rules as rs_shared } from "@/stgmachine/evaluation_rules/shared";
import { binding, identifier, literal, type expression, program, FUN, datatype, call, let_expr, THUNK, letrec_expr, case_expr, CON, PAP } from "@/stglang/types";
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

	public ruleset;
	public expr: expression;
	public exprs: expression[] = [];
	public lastrule: string | undefined;

	public readonly entered_thunks: Map<number, number>;

	constructor(prog: program, eval_apply: boolean = false, garbage_collection: boolean = false, entered_thunks: [number, number][] = []) {
		this.step_number = 0;
		this.prog = prog;
		annotate_known_function_calls(prog);

		this.eval_apply = eval_apply;
		this.ruleset = rs_shared.concat(eval_apply ? rs_evalapply : rs_pushenter);

		this.garbage_collection = garbage_collection;
		this.entered_thunks = new Map(entered_thunks);
		let expr = undefined;

		for (let decl of prog.decls) {
			if (decl instanceof binding) {
				if (decl.name.name === "main") {
					expr = decl.name;
				}
				let obj = decl.obj;
				// global thunks and functions dont have any free variables saved in the closure
				if (obj instanceof CON) {
					let atoms = obj.atoms.map(x => x instanceof literal ? x : this.env.find_value(x));
					obj = new CON(obj.constr, atoms, obj.from, obj.to);
				} else if (obj instanceof PAP) {
					let atoms = obj.atoms.map(x => x instanceof literal ? x : this.env.find_value(x));
					obj = new PAP(obj.f, atoms, obj.from, obj.to);
				}
				this.env.add_global(decl.name, this.h.alloc(obj));
			}
		}
		if (!expr) {
			throw new Error("No value bound to main");
		}
		this.expr = expr;
		if (this.garbage_collection) rungc(this.expr, this.env, this.s, this.h);
		this.step_number++; this.h.step++; this.s.step++; this.env.step++;
		this.exprs[this.step_number] = this.expr;
	}

	step(): boolean {
		for (let rule of this.ruleset) {
			// Implicitly resolve name so there is no need for additional rule in operational semantics
			let expr = this.expr;
			if (expr instanceof identifier) {
				expr = this.env.find_value(expr);
			}
			const result = rule.match(expr, this.env, this.s, this.h);
			if (result) {
				this.lastrule = rule.name;
				this.expr = result();
				if (this.garbage_collection) rungc(this.expr, this.env, this.s, this.h);
				this.step_number++; this.h.step++; this.s.step++; this.env.step++;
				this.exprs[this.step_number] = this.expr;
				return true;
			}
		}
		const address = this.entered_thunks.get(this.step_number + 1)
		if (address) {
			this.step_number++; this.h.step++; this.s.step++; this.env.step++;
			this.expr = new literal(address, true);
			this.exprs[this.step_number] = this.expr;
			return true;
		}
		return false;
	}

	step_back(): boolean {
		if (this.step_number <= 1) {
			return false;
		}
		this.step_number--; this.h.back(); this.s.back(); this.env.back();
		this.expr = this.exprs[this.step_number];
		return true;
	}

	enter_thunk(thunk: number) {
		if (!(this.h.current[thunk] instanceof THUNK)) {
			throw Error("Heap object to enter is not a thunk.");
		}
		for (let rule of this.ruleset) {
			// Implicitly resolve name so there is no need for additional rule in operational semantics
			let expr = this.expr;
			if (expr instanceof identifier) {
				expr = this.env.find_value(expr);
			}
			const result = rule.match(expr, this.env, this.s, this.h);
			if (result) {
				throw Error("Cannot enter a thunk during execution of another.");
			}
		}
		this.entered_thunks.set(this.step_number + 1, thunk);
		this.step();
	}
}

export function simulate(prog: program, n: number, eval_apply: boolean = false, garbage_collection: boolean = false) {
	let machine = new stg_machine(prog, eval_apply, garbage_collection);
	let steps: { env: string, heap: string, stack: string, expr: string, rule: string | undefined }[] = [];

	try {
		while (machine.step_number < n && machine.step()) {
			steps.push({
				env: String(machine.env),
				heap: String(machine.h),
				stack: String(machine.s),
				expr: String(machine.expr),
				rule: machine.lastrule
			});
		}
	} catch (e) {
		console.log(e);
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
