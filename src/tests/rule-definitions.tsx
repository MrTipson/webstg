
import { rules as shared } from "@/stgmachine/evaluation_rules/shared";
import { rules as eval_apply } from "@/stgmachine/evaluation_rules/eval-apply";
import { rules as push_enter } from "@/stgmachine/evaluation_rules/push-enter";
import Latex from "react-latex-next";
import { type Rule, macros } from "@/stgmachine/evaluation_rules/utils";
import "katex/dist/katex.min.css";

const rules: Rule[] = ([] as Rule[]).concat(shared, push_enter, eval_apply);

export default function () {
	return (
		<>
			{rules.map(x => <div>{x.name}: <Latex macros={macros}>{x.definition}</Latex></div>)}
		</>
	);
}