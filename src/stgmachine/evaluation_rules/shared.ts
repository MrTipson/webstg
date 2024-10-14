import { let_expr, type expression, case_expr, identifier, CON, literal, THUNK, BLACKHOLE, call, FUN, builtin_op, case_eval, PAP, letrec_expr, type heap_object, INDIRECTION } from "@/stglang/types";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import { case_cont, thunk_update, type stack } from "@/stgmachine/stack";
import { register_rule, used_vars, type Rule, frac } from "@/stgmachine/evaluation_rules/utils";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "LET",
	definition: frac
		(`\\texttt{let}\\ x = obj\\ \\IN\\ e ; \\Ss ; \\SH; \\SENV`)
		(`e; \\Ss; \\SH[a] = obj; \\SENV[x \\mapsto a] \\quad \\text{where } a = addr(obj)`),
	explanation: "Allocate objects on the heap and bind their addresses to names in the local enviroment",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof let_expr)) return undefined;
		let e = (expr as let_expr);
		return function () {
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
					let closure_env = [...env.current_local.entries()].filter(([k, _v]) => used.includes(k));
					obj = new THUNK(obj.expr, new Map(closure_env));
				} else if (obj instanceof FUN) {
					let used = used_vars(obj);
					let closure_env = [...env.current_local.entries()].filter(([k, _v]) => used.includes(k));
					obj = new FUN(obj.args, obj.expr, new Map(closure_env));
				}
				obj.bind_name = bind.name.name;
				let addr = h.alloc(obj);
				env.add_local(bind.name, addr);
			}
			return e.expr;
		}
	}
});

reg({
	name: "LETREC",
	definition: frac
		(`\\texttt{letrec}\\ x = obj\\ \\IN\\ e ; \\Ss ; \\SH; \\SENV`)
		(`e; \\Ss; \\SH[a] = obj; \\SENV[x \\mapsto a] \\quad \\text{where } a = addr(obj)`),
	explanation: "Allocate objects on the heap and bind their addresses to names in the local enviroment",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof letrec_expr)) return undefined;
		let e = (expr as letrec_expr);
		return function () {
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
				obj.bind_name = binds[i].name.name;
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
					let closure_env = [...env.current_local.entries()].filter(([k, _v]) => used.includes(k));
					obj.env = new Map(closure_env);
				}
			}
			return e.expr;
		}
	}
});

reg({
	name: "CASECON",
	definition: frac
		(`\\CASE\\ v\\ \\OF \\LBRACE\\ldots ; C\\, x_1 \\ldots x_n\\ \\ARROW\\ e;\\ldots\\RBRACE; \\Ss; \\SH[v] = \\CON(C\\ a_1\\ldots a_n); \\SENV`)
		(`e; \\Ss; \\SH; \\SENV[x_1 \\mapsto a_1 \\ldots x_n \\mapsto a_n]`),
	explanation: "Match object to constructor alternative",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof case_eval)) return undefined;
		let e = (expr as case_eval);
		if (!(e.val.isAddr)) return undefined;
		let obj = h.get(e.val);
		if (!(obj instanceof CON)) return undefined;
		let con = (obj as CON);
		for (let alt of e.alts.named_alts) {
			if (alt.constr.name === con.constr.name && alt.vars.length == con.atoms.length) {
				return function () {
					for (let i = 0; i < alt.vars.length; i++) {
						env.add_local(alt.vars[i], con.atoms[i]);
					}
					return alt.expr;
				};
			}
		}
		return undefined;
	}
});

reg({
	name: "CASEANY",
	definition: frac
		(`\\CASE\\ v\\ \\OF \\LBRACE\\ldots ; x\\ \\ARROW\\ e\\RBRACE; \\Ss; \\SH; \\SENV`)
		(`e; \\Ss; \\SH; \\SENV[x \\mapsto v]`),
	explanation: "Match object to default alternative",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof case_eval)) return undefined;
		let e = (expr as case_eval);
		if (!e.alts.default_alt) return undefined;
		let def_alt = e.alts.default_alt;
		if (h.get(e.val) || !e.val.isAddr) {
			return function () {
				env.add_local(def_alt.name, e.val);
				return def_alt.expr;
			};
		}
		return undefined;
	}
});

reg({
	name: "CASE",
	definition: frac
		(`\\CASE\\ e\\ \\OF \\LBRACE \\ldots \\RBRACE; \\Ss; \\SH; \\SENV`)
		(`e; (\\CASE \\bullet \\OF \\LBRACE \\ldots \\RBRACE, \\SENV):\\Ss; \\SH; \\SENV`),
	explanation: "Evaluate case scrutinee and push continuation onto stack",
	match(expr: expression, env: enviroment, s: stack, _h: heap) {
		if (!(expr instanceof case_expr)) return undefined;
		let e = (expr as case_expr);
		return function () {
			let used = used_vars(expr.alts);
			let saved_env = [...env.current_local.entries()].filter(([k, _v]) => used.includes(k));
			s.push(new case_cont(e.alts, new Map(saved_env)));
			return e.expr;
		};
	}
});

reg({
	name: "THUNK",
	definition: frac
		(`x; \\Ss; \\SH[x] = \\THUNK (e, \\SENV'); \\SENV`)
		(`e; \\texttt{Upd x}\\ \\bullet :\\Ss; \\SH[x] = \\BLACKHOLE; \\SENV'`),
	explanation: "Enter a thunk and push an update frame onto the stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal)) return undefined;
		let obj = h.get(expr);
		if (!(obj instanceof THUNK)) return undefined;
		let thunk = obj;
		return function () {
			env.replace_locals(thunk.env);
			h.set(expr, new BLACKHOLE(thunk, thunk.from, thunk.to, thunk.bind_name));
			s.push(new thunk_update(expr));
			return thunk.expr;
		};
	}
});

reg({
	name: "INDIRECTION",
	definition: frac
		(`x; \\Ss; \\SH[x] = \\INDIRECTION\\ y; \\SENV`)
		(`y; \\Ss; \\SH; \\SENV`),
	explanation: "Follow an indirection",
	match(expr: expression, _env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof literal && expr.isAddr)) return undefined;
		let obj = h.get(expr);
		if (!(obj instanceof INDIRECTION)) return undefined;
		let indir = obj;
		return () => new literal(indir.addr.val, indir.addr.isAddr, expr.from, expr.to);
	}
});

reg({
	name: "RET",
	definition: frac
		(`v; (\\CASE \\bullet \\OF \\{ \\ldots \\}, \\SENV'):\\Ss; \\SH; \\SENV`)
		(`\\CASE\\ v\\ \\OF \\{ \\ldots \\}; \\Ss; \\SH; \\SENV'`),
	explanation: "Pop case continuation off the stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal &&
			(h.get(expr) || !expr.isAddr) &&
			s.peek() instanceof case_cont)) return undefined;
		return function () {
			let cont = s.pop() as case_cont;
			env.replace_locals(cont.locals);
			return new case_eval(expr, cont.alts, cont.alts.from, cont.alts.to);
		};
	}
});

reg({
	name: "UPDATE",
	definition: frac
		(`y; \\texttt{Upd x}\\ \\bullet :\\Ss; \\SH; \\SENV`)
		(`y; \\Ss; \\SH[x] = \\INDIRECTION\\ y; \\SENV`),
	explanation: "Pop update frame and update thunk with an indirection",
	match(expr: expression, _env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal &&
			s.peek() instanceof thunk_update)) return undefined;
		return function () {
			let cont = s.pop() as thunk_update;
			h.set(cont.addr, new INDIRECTION(expr, -1, -1, h.get(cont.addr)?.bind_name));
			return expr;
		};
	}
});

reg({
	name: "KNOWNCALL",
	definition: frac
		(`f^n\\ a_1 \\ldots a_n; \\Ss; \\SH[f] = \\FUN(x_1 \\ldots x_n \\rightarrow e, \\SENV_f); \\SENV`)
		(`e; \\Ss; \\SH; \\SENV_f[x_1 \\mapsto a_1 \\ldots x_n \\mapsto a_n]`),
	explanation: "Call to a known function",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof call && expr.known)) return undefined;
		let addr = expr.f instanceof literal ? expr.f : env.find_value(expr.f);
		let obj = h.get(addr);
		if (!(obj instanceof FUN &&
			obj.args.length == expr.atoms.length)) return undefined;
		let fun_obj = obj;
		return function () {
			let call_args = expr.atoms.map(x => x instanceof literal ? x : env.find_value(x));
			env.replace_locals(fun_obj.env);
			for (let i = 0; i < fun_obj.args.length; i++) {
				env.add_local(fun_obj.args[i], call_args[i]);
			}
			return fun_obj.expr;
		};
	}
});

reg({
	name: "PRIMOP",
	definition: frac
		(`\\begin{array}{c} \\scriptstyle a_1\\ op\\ a_2; \\Ss; \\SH; \\SENV \\\\ \\tiny op\\ \\IN\\ \\{ \\ADD,\\SUB,\\MUL,\\DIV,\\MOD,\\GEQ,\\GTH,\\EQU,\\LTH,\\LEQ,\\NEQ \\} \\end{array}`)
		(`\\begin{array}{c} \\scriptstyle a; \\Ss; \\SH; \\SENV \\\\ \\text{\\tiny where $a$ is the result of the primitive operation over $a_1$ and $a_2$}\\end{array}`),
	explanation: "Apply primitive operation to arguments",
	match(expr: expression, env: enviroment, _s: stack, h: heap) {
		if (!(expr instanceof builtin_op)) return undefined;
		// Assume its a binop
		let [e1, e2] = expr.atoms.map(x => x instanceof literal ? x : env.find_value(x));
		if (e1.isAddr || e2.isAddr) throw "Primop expression is an address";
		return function () {
			let ret;
			switch (expr.prim) {
				case "+#": ret = new literal(e1.val + e2.val); break;
				case "-#": ret = new literal(e1.val - e2.val); break;
				case "*#": ret = new literal(e1.val * e2.val); break;
				case "/#": ret = new literal(e1.val / e2.val); break;
				case "%#": ret = new literal(e1.val % e2.val); break;
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
					ret = h.alloc(new CON(new identifier(res ? "True" : "False"), []));
			}
			ret.from = expr.from;
			ret.to = expr.to;
			return ret;
		};
	}
});
