import { let_expr, type expression, literal, case_expr, letrec_expr, call, builtin_op, identifier, case_eval, type heap_object, THUNK, FUN, CON, PAP, alternatives } from "../../stglang/types";
import type { enviroment } from "../enviroment";
import type { heap } from "../heap";
import type { stack } from "../stack";

export function register_rule(ruleset: Array<Rule>, rule: Rule) {
	ruleset.push(rule);
}

export function used_vars(expr: expression | heap_object | alternatives): string[] {
	return [...new Set(_used_vars(expr))];
}
function _used_vars(expr: expression | heap_object): string[] {
	if (expr instanceof let_expr) {
		let vars: string[] = [];
		let defines: string[] = [];
		for (let bind of expr.binds) {
			defines.push(bind.name.name);
			vars = vars.concat(_used_vars(bind.obj))
		}
		vars = vars.concat(_used_vars(expr.expr).filter(x => !defines.includes(x)));
		return vars;
	} else if (expr instanceof letrec_expr) {
		let vars: string[] = [];
		let defines: string[] = [];
		for (let bind of expr.binds) {
			defines.push(bind.name.name);
			vars = vars.concat(_used_vars(bind.obj))
		}
		vars = vars.concat(_used_vars(expr.expr));
		return vars.filter(x => !defines.includes(x));
	} else if (expr instanceof case_expr) {
		let vars = _used_vars(expr.expr);
		return vars.concat(_used_vars(expr.alts));
	} else if (expr instanceof alternatives) {
		let vars: string[] = [];
		for (let alt of expr.named_alts) {
			let defines = alt.vars.map(x => x.name);
			vars = vars.concat(_used_vars(alt.expr).filter(x => !defines.includes(x)));
		}
		let def_alt = expr.default_alt;
		if (def_alt) {
			let used = _used_vars(def_alt.expr).filter(x => x != def_alt?.name.name);
			vars = vars.concat(used);
		}
		return vars;
	} else if (expr instanceof call || expr instanceof PAP) {
		return _used_vars(expr.f).concat(...expr.atoms.map(_used_vars));
	} else if (expr instanceof builtin_op || expr instanceof CON) {
		return expr.atoms
			.filter(x => x instanceof identifier)
			.map(x => (x as identifier).name);
	} else if (expr instanceof literal) {
		return [];
	} else if (expr instanceof identifier) {
		return [expr.name];
	} else if (expr instanceof THUNK) {
		return _used_vars(expr.expr);
	} else if (expr instanceof FUN) {
		let defines = expr.args.map(x => x.name);
		return _used_vars(expr.expr).filter(x => !defines.includes(x));
	} else {
		console.log("used_vars: not covered", expr);
		return [];
	}
}

export interface Rule {
	name: string,
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined;
}
