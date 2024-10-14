import { let_expr, type expression, literal, case_expr, letrec_expr, call, builtin_op, identifier, type heap_object, THUNK, FUN, CON, PAP, alternatives } from "@/stglang/types";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import type { stack } from "@/stgmachine/stack";
import type { Macros } from "react-latex-next/dist/renderLatex";

// Latex helpers
export const frac = (top: string) => (bottom: string) => `$ {${top}} \\over {${bottom}} $`.replaceAll(";", ";\\ ");
export const macros: Macros = {
	"\\DATA": "\\texttt{data}",
	"\\FUN": "\\texttt{FUN}",
	"\\CON": "\\texttt{CON}",
	"\\PAP": "\\texttt{PAP}",
	"\\THUNK": "\\texttt{THUNK}",
	"\\BLACKHOLE": "\\texttt{BLACKHOLE}",
	"\\INDIRECTION": "\\texttt{INDIRECTION}",
	"\\LET": "\\texttt{let}",
	"\\LETREC": "\\texttt{letrec}",
	"\\CASE": "\\texttt{case}",
	"\\OF": "\\texttt{of}",
	"\\IN": "\\texttt{in}",
	"\\LPAREN": "\\texttt{(}",
	"\\RPAREN": "\\texttt{)}",
	"\\LBRACE": "\\texttt{\\{}",
	"\\RBRACE": "\\texttt{\\}}",
	"\\SEMIC": "\\texttt{;}",
	"\\OR": "\\texttt{|}",
	"\\EQU": "\\texttt{==\\#}",
	"\\NEQ": "\\texttt{!=\\#}",
	"\\LTH": "\\texttt{<\\#}",
	"\\GTH": "\\texttt{>\\#}",
	"\\LEQ": "\\texttt{<=\\#}",
	"\\GEQ": "\\texttt{>=\\#}",
	"\\MUL": "\\texttt{*\\#}",
	"\\DIV": "\\texttt{/\\#}",
	"\\MOD": "\\texttt{\\%\\#}",
	"\\ADD": "\\texttt{+\\#}",
	"\\SUB": "\\texttt{-\\#}",
	"\\IS": "\\texttt{=\\#}",
	"\\ARROW": "\\texttt{->}",
	"\\Sexpr": "\\texttt{expr}",
	"\\Ss": "\\texttt{s}",
	"\\SH": "\\texttt{H}",
	"\\SENV": "\\texttt{env}",
}

export function register_rule(ruleset: Array<Rule>, rule: Rule) {
	ruleset.push(rule);
}

/**
 * Extract all free variables from given subtree
 * @param node Subtree of the parsed AST
 * @returns Array of the free variables without duplicates
 */
export function used_vars(node: expression | heap_object | alternatives): string[] {
	return [...new Set(_used_vars(node))];
}
function _used_vars(node: expression | heap_object | alternatives): string[] {
	if (node instanceof let_expr) {
		let vars: string[] = [];
		let defines: string[] = [];
		for (let bind of node.binds) {
			defines.push(bind.name.name);
			vars = vars.concat(_used_vars(bind.obj))
		}
		vars = vars.concat(_used_vars(node.expr).filter(x => !defines.includes(x)));
		return vars;
	} else if (node instanceof letrec_expr) {
		let vars: string[] = [];
		let defines: string[] = [];
		for (let bind of node.binds) {
			defines.push(bind.name.name);
			vars = vars.concat(_used_vars(bind.obj))
		}
		vars = vars.concat(_used_vars(node.expr));
		return vars.filter(x => !defines.includes(x));
	} else if (node instanceof case_expr) {
		let vars = _used_vars(node.expr);
		return vars.concat(_used_vars(node.alts));
	} else if (node instanceof alternatives) {
		let vars: string[] = [];
		for (let alt of node.named_alts) {
			let defines = alt.vars.map(x => x.name);
			vars = vars.concat(_used_vars(alt.expr).filter(x => !defines.includes(x)));
		}
		let def_alt = node.default_alt;
		if (def_alt) {
			let used = _used_vars(def_alt.expr).filter(x => x != def_alt?.name.name);
			vars = vars.concat(used);
		}
		return vars;
	} else if (node instanceof call || node instanceof PAP) {
		return _used_vars(node.f).concat(...node.atoms.map(_used_vars));
	} else if (node instanceof builtin_op || node instanceof CON) {
		return node.atoms
			.filter(x => x instanceof identifier)
			.map(x => (x as identifier).name);
	} else if (node instanceof literal) {
		return [];
	} else if (node instanceof identifier) {
		return [node.name];
	} else if (node instanceof THUNK) {
		return _used_vars(node.expr);
	} else if (node instanceof FUN) {
		let defines = node.args.map(x => x.name);
		return _used_vars(node.expr).filter(x => !defines.includes(x));
	} else {
		console.log("used_vars: not covered", node);
		return [];
	}
}

export interface Rule {
	name: string,
	definition: string,
	explanation: string,
	match(expr: expression, env: enviroment, s: stack, h: heap): (() => expression) | undefined
}
