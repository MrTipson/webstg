import { let_expr, type expression, case_expr, identifier, CON, literal, THUNK, BLACKHOLE, call, FUN, builtin_op, case_eval, PAP, letrec_expr, type heap_object, INDIRECTION } from "@/stglang/types";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import { case_cont, thunk_update, type stack } from "@/stgmachine/stack";
import { register_rule, used_vars, type Rule } from "@/stgmachine/evaluation_rules/types";

export const rules = new Array<Rule>();
let reg = (x: Rule) => register_rule(rules, x);

reg({
	name: "LET",
	definition: "let $x = obj$ in $e$; $s$; $H \\: \\Rightarrow \\: e[x'/x]$; $s$; $H[x'\\mapsto obj]$",
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
				let addr = h.alloc(obj);
				env.add_local(bind.name, addr);
			}
			return e.expr;
		}
	}
});

reg({
	name: "LETREC",
	definition: "letrec $x = obj$ in $e$; $s$; $H \\: \\Rightarrow \\: e[x'/x]$; $s$; $H[x'\\mapsto obj]$",
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
	definition: "case $v$ of $\\{\\ldots ; C\\, x_1 \\ldots x_n \\rightarrow e;\\ldots\\}$; $s$; $H[v \\mapsto \\mathtt{CON}(C\\ a_1\\ldots a_n)] \\:" +
		"\\Rightarrow \\: e[a_1/x_1 \\ldots a_n/x_n]$; $s$; $H$",
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
	definition: "case $v$ of $\\{\\ldots ; x \\rightarrow e\\}$; $s$; $H \\: \\Rightarrow \\: e[v/x]$; $s$; $H$",
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
	definition: "case $e$ of $\\{ \\ldots \\}$; $s$; $H \\: \\Rightarrow \\: e$; case $\\bullet$ of $\\{ \\ldots \\}:s$; $H$",
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
	definition: "$x$; $s$; $H[x \\mapsto \\mathtt{THUNK} \\, e] \\: \\Rightarrow \\: e$; Upd $x \\, \\bullet :s$; $H[x \\mapsto \\mathtt{BLACKHOLE}]$",
	explanation: "Enter a thunk and push an update frame onto the stack",
	match(expr: expression, env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal)) return undefined;
		let obj = h.get(expr);
		if (!(obj instanceof THUNK)) return undefined;
		let thunk = obj;
		return function () {
			env.replace_locals(thunk.env);
			h.set(expr, new BLACKHOLE(thunk, thunk.from, thunk.to));
			s.push(new thunk_update(expr));
			return thunk.expr;
		};
	}
});

reg({
	name: "INDIRECTION",
	definition: "$x$; $s$; $H[x \\mapsto \\mathtt{INDIRECTION} \\, y] \\: \\Rightarrow \\: y$; $s$; $H$",
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
	definition: "$v$; case $\\bullet$ of $\\{ \\ldots \\}:s$; $H \\: \\Rightarrow \\:$ case $v$ of $\\{ \\ldots \\}$; $s$; $H$",
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
	definition: "$y$; Upd $x \\, \\bullet :s$; $H \\: \\Rightarrow \\: y$; $s$; $H[x \\mapsto \\mathtt{INDIRECTION} \\, y]$",
	explanation: "Pop update frame and update thunk with an indirection",
	match(expr: expression, _env: enviroment, s: stack, h: heap) {
		if (!(expr instanceof literal &&
			s.peek() instanceof thunk_update)) return undefined;
		return function () {
			let cont = s.pop() as thunk_update;
			h.set(cont.addr, new INDIRECTION(expr));
			return expr;
		};
	}
});

reg({
	name: "KNOWNCALL",
	definition: "$f^n \\, a_1 \\ldots a_n$; $s$; $H[f \\mapsto \\mathtt{FUN}(x_1 \\ldots x_n \\rightarrow e)]$$\\:" +
		"\\Rightarrow \\: e[a_1/x_1 \\ldots a_n/x_n]$; $s$; $H$",
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
			env.clear_locals();
			for (let i = 0; i < fun_obj.args.length; i++) {
				env.add_local(fun_obj.args[i], call_args[i]);
			}
			return fun_obj.expr;
		};
	}
});

reg({
	name: "PRIMOP",
	definition: "$\\oplus a_1 \\ldots a_n$; $s$; $H \\: \\Rightarrow \\: a$; $s$; $H$",
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
