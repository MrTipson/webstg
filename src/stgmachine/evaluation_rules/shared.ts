import { let_expr, type expression, case_expr, identifier, CON, literal, THUNK, BLACKHOLE, call, FUN, builtin_op, type primop, case_eval, PAP, letrec_expr, type heap_object } from "@/stglang/types";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import { case_cont, thunk_update, type stack } from "@/stgmachine/stack";
import { register_rule, used_vars, type Rule } from "@/stgmachine/evaluation_rules/types";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "LET",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (expr instanceof let_expr) {
			let e = (expr as let_expr);
			let binds = e.binds;
			for (let bind of binds) {
				let obj = bind.obj;
				if (obj instanceof PAP) {
					let values = obj.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x));
					obj = new PAP(obj.f, values);
				} else if (obj instanceof CON) {
					let values = obj.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x));
					obj = new CON(obj.constr, values);
				} else if (obj instanceof THUNK) {
					let used = used_vars(obj);
					let closure_env = [...env.current_local.entries()].filter(([k, v]) => used.includes(k));
					obj = new THUNK(obj.expr, new Map(closure_env));
				} else if (obj instanceof FUN) {
					let used = used_vars(obj);
					let closure_env = [...env.current_local.entries()].filter(([k, v]) => used.includes(k));
					obj = new FUN(obj.args, obj.expr, new Map(closure_env));
				}
				let addr = h.alloc(obj);
				env.add_local(bind.name, addr);
			}
			return e.expr;
		}
		return undefined;
	}
});

reg({
	name: "LETREC",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof letrec_expr)) return undefined;
		let e = (expr as letrec_expr);
		let binds = e.binds;
		let objs: heap_object[] = [];
		for (let i = 0; i < binds.length; i++) {
			let obj = binds[i].obj;
			if (obj instanceof PAP) {
				obj = new PAP(obj.f, obj.atoms);
			} else if (obj instanceof CON) {
				obj = new CON(obj.constr, obj.atoms);
			} else if (obj instanceof THUNK) {
				obj = new THUNK(obj.expr);
			} else if (obj instanceof FUN) {
				obj = new FUN(obj.args, obj.expr);
			}
			let addr = h.alloc(obj);
			env.add_local(binds[i].name, addr);
			objs[i] = obj;
		}
		for (let i = 0; i < binds.length; i++) {
			let obj = objs[i];
			if (obj instanceof PAP || obj instanceof CON) {
				obj.atoms = obj.atoms.map<literal>(x => x instanceof literal ? x : env.find_value(x));
			} else if (obj instanceof THUNK || obj instanceof FUN) {
				let used = used_vars(obj);
				let closure_env = [...env.current_local.entries()].filter(([k, v]) => used.includes(k));
				obj.env = new Map(closure_env);
			}
		}
		return e.expr;
	}
});

// This rule is not part of the 'fastcurry' operational semantics
reg({
	name: "LOCAL",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof identifier)) return undefined;
		return env.find_value(expr as identifier);
	}
});

reg({
	name: "CASECON",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof case_eval)) return undefined;
		let e = (expr as case_eval);
		if (!(e.val.isAddr)) return undefined;
		let obj = h.get(e.val);
		if (!(obj instanceof CON)) return undefined;
		let con = (obj as CON);
		for (let alt of e.alts.named_alts) {
			if (alt.constr.name === con.constr.name && alt.vars.length == con.atoms.length) {
				for (let i = 0; i < alt.vars.length; i++) {
					env.add_local(alt.vars[i], con.atoms[i]);
				}
				return alt.expr;
			}
		}
		return undefined;
	}
});

reg({
	name: "CASEANY",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof case_eval)) return undefined;
		let e = (expr as case_eval);
		if (!e.alts.default_alt) return undefined;
		if (h.get(e.val) || !e.val.isAddr) {
			env.add_local(e.alts.default_alt.name, e.val);
			return e.alts.default_alt.expr;
		}
		return undefined;
	}
});

reg({
	name: "CASE",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof case_expr)) return undefined;
		let e = (expr as case_expr);
		let used = used_vars(expr.alts);
		let saved_env = [...env.current_local.entries()].filter(([k, v]) => used.includes(k));
		s.push(new case_cont(e.alts, new Map(saved_env)));
		return e.expr;
	}
});

reg({
	name: "THUNK",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof literal)) return undefined;
		let obj = h.get(expr);
		if (!(obj instanceof THUNK)) return undefined;
		env.replace_locals(obj.env);
		h.set(expr, new BLACKHOLE());
		s.push(new thunk_update(expr));
		return obj.expr;
	}
});

reg({
	name: "RET",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof literal &&
			(h.get(expr) || !expr.isAddr) &&
			s.peek() instanceof case_cont)) return undefined;
		let cont = s.pop() as case_cont;
		env.replace_locals(cont.locals);
		return new case_eval(expr, cont.alts, cont.alts.from, cont.alts.to);
	}
});

reg({
	name: "UPDATE",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof literal &&
			s.peek() instanceof thunk_update)) return undefined;
		let obj = h.get(expr);
		if (!obj) return undefined;
		let cont = s.pop() as thunk_update;
		h.set(cont.addr, obj);
		return cont.addr;
	}
});

reg({
	name: "KNOWNCALL",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof call && expr.known)) return undefined;
		let addr = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let obj = h.get(addr);
		if (!(obj instanceof FUN &&
			obj.args.length == expr.atoms.length)) return undefined;
		for (let i = 0; i < obj.args.length; i++) {
			env.add_local(obj.args[i], expr.atoms[i]);
		}
		return obj.expr;
	}
});

reg({
	name: "PRIMOP",
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined {
		if (!(expr instanceof builtin_op)) return undefined;
		// Assume its a binop
		let [e1, e2] = expr.atoms.map(x => x instanceof literal ? x : env.find_value(x));
		if (e1.isAddr || e2.isAddr) throw "Primop expression is an address";
		switch (expr.prim) {
			case "+#": return new literal(e1.val + e2.val);
			case "-#": return new literal(e1.val - e2.val);
			case "*#": return new literal(e1.val * e2.val);
			case "/#": return new literal(e1.val / e2.val);
			case "%#": return new literal(e1.val % e2.val);
			default:
				let res: boolean;
				switch (expr.prim) {
					case "<=#": res = e1.val <= e2.val; break;
					case "<#": res = e1.val < e2.val; break;
					case "==#": res = e1.val == e2.val; break;
					case "!=#": res = e1.val != e2.val; break;
					case ">#": res = e1.val > e2.val; break;
					case ">=#": res = e1.val >= e2.val; break;
					default: throw new Error(`Invalid primop ${expr.prim}`);
				}
				return h.alloc(new CON(new identifier(res ? "True" : "False"), []));
		}
	}
});
