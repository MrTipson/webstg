import { type expression, type literal } from "../../stglang/types";
import type { enviroment } from "../enviroment";
import type { heap } from "../heap";
import type { stack } from "../stack";

export function register_rule(ruleset: Array<Rule>, rule: Rule) {
	ruleset.push(rule);
}

export interface Rule {
	name: string,
	apply(expr: expression, env: enviroment, s: stack, h: heap): expression | undefined;
}
