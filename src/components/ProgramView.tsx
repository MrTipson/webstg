import { map_pap_prg, sum_prg, fib_prg } from "@/stglang/test";
import { stg_machine } from "@/stgmachine/machine";
import React, { useState, type ChangeEvent, useContext, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { parser as stg_parser } from "@/stglang/parser";
import { highlightTree, classHighlighter } from "@lezer/highlight";
import { STGSyntaxError, build_ast } from "@/stglang/ASTBuilder";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import examples from "@/stglang/examples";
import { case_eval, identifier, literal } from "@/stglang/types";

export default function ProgramView({ className, machine, setMachine, step, setStep, loaded, setLoaded }:
	{
		className?: string,
		machine: stg_machine,
		setMachine: Function,
		step: number,
		setStep: Function,
		loaded: boolean,
		setLoaded: Function
	}) {
	const [parser, setParser] = useState(stg_parser);
	const [programText, setProgramText] = useState(String(sum_prg));
	const [error, setError] = useState<{ from: number, to: number } | undefined>(undefined);
	const currentExpressionRef = useRef<HTMLSpanElement | undefined>(undefined)
	const { toast } = useToast();

	useEffect(() => currentExpressionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));

	let highlighted;
	if (error) {
		highlighted = highlight(programText, true, error.from, error.to, { className: "syntax-error" });
	} else if (loaded) {
		let enviroment = [
			...machine.env.local_entries(),
			...machine.env.global_entries()
		].map(([name, lit]) => {
			return { from: lit.from, to: lit.to, value: String(lit) };
		});
		// With the current implementation, only identifier expressions get marked
		if (machine.expr instanceof case_eval) {
			let val = machine.expr.val;
			enviroment.push({ from: val.from, to: val.to, value: String(val) });
		}
		// from and to might be -1, but it shouldnt cause any issues
		let props: Object = { className: "current-expression" };
		if (machine.expr instanceof identifier || machine.expr instanceof literal) {
			let val = machine.expr;
			if (val instanceof identifier) {
				val = machine.env.find_value(val);
			}
			props = { className: "current-expression with-value", "data-value": val, ref: currentExpressionRef };
		}
		highlighted = highlight(programText, true, machine.expr.from, machine.expr.to, props, enviroment);
	} else {
		highlighted = highlight(programText);
	}

	function toggleEditable() {
		if (loaded) {
			setLoaded(false);
			return;
		}
		try {
			const ast = build_ast(programText);
			setMachine(new stg_machine(ast, false, true));
			setStep(0);
			toast({
				title: "Success",
				description: "You can now step through the execution"
			});
			setLoaded(true);
		} catch (e) { // build ast can throw an error
			if (e instanceof STGSyntaxError) {
				toast({
					title: "Syntax error",
					description: e.message,
					variant: "destructive"
				});
				setError({ from: e.from, to: e.to });
			}
		}
	}

	function highlight(code: string,
		mark = false, markFrom = -1, markTo = -1, markProps = {},
		valueAnnotations: { from: number, to: number, value: string }[] = []) {
		let children: any[] = [];
		let tmpChildren: any[] = [];
		let start = 0;
		let inMark = false;

		valueAnnotations = valueAnnotations.sort((a, b) => b.from - a.from);
		let annotation = valueAnnotations.pop();

		function putStyle(from: number, to: number, classes: string) {
			if (mark && markTo >= start) {
				if (!inMark && from >= markFrom) { // do we need to start the mark span
					if (start < markFrom) {
						children.push(code.substring(start, markFrom));
						start = markFrom;
					}
					tmpChildren = children;
					children = [];
					inMark = true;
					// Parsing errors have markFrom==markTo (no token in source)
					// So we use last child before the error
					if (markFrom === markTo && tmpChildren.length > 0) {
						children.push(tmpChildren.pop());
					}
				}
				if (inMark) {
					if (from >= markTo) {
						if (start < markTo) {
							children.push(code.substring(start, markTo));
							start = markTo;
						}
						let el = React.createElement("span", markProps, ...children);
						children = tmpChildren;
						children.push(el);
						inMark = false;
					}
				}
			}
			if (start < from) {
				children.push(code.substring(start, from));
			}
			let text = code.substring(from, to);
			// This will skip any annotations that might have been skipped
			while (annotation && annotation.from < from) {
				annotation = valueAnnotations.pop();
			}
			if (annotation && annotation.from == from && annotation.to == to) {
				children.push(React.createElement("span", { className: classes + " with-value", "data-value": annotation.value }, text));
			} else {
				children.push(React.createElement("span", { className: classes }, text));
			}
			start = to;
		}

		highlightTree(
			parser.parse(code),
			classHighlighter,
			putStyle
		);
		// Make sure mark is closed if it lasts until the end of file
		if (inMark) {
			let el = React.createElement("span", markProps, ...children);
			children = tmpChildren;
			children.push(el);
		}
		return React.createElement("code", undefined, ...children);
	}

	function selectExample(s: string) {
		const selected = examples.filter(({ name, code }) => name === s)[0];
		if (selected) {
			let { name, code } = selected;
			setProgramText(code);
			setLoaded(false);
			setError(undefined);
		}
	}

	function inputHandler(e: ChangeEvent<HTMLTextAreaElement>) {
		let code = e.target.value;
		setProgramText(code);
		setError(undefined);
	}

	return (
		<div className={className + " relative flex flex-col"}>
			<div className="flex flex-wrap gap-2 mx-4 items-baseline">
				<h3 className="font-semibold text-xl m-3">Program view</h3>
				<Select onValueChange={selectExample}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select example" />
					</SelectTrigger>
					<SelectContent>
						{examples.map(({ name, code }, i) => {
							return <SelectItem key={i} value={name}>{name}</SelectItem>;
						})}
					</SelectContent>
				</Select>
				<Button onClick={toggleEditable}>{loaded ? "Edit" : "Load"}</Button>
			</div>
			<div className={"relative grow m-2 overflow-y-auto"}>
				<div className="h-max relative m-2">
					<code>
						<textarea className={"absolute inset-0 bg-transparent text-transparent caret-primary p-4 font-semibold \
							resize-none selection:bg-accent selection:text-transparent w-full h-full overflow-visible" + (!loaded ? "" : " pointer-events-none")}
							onChange={inputHandler} value={programText} spellCheck={false} disabled={loaded} />
					</code>
					<pre className={"relative z-10 bg-transparent text-wrap selection:bg-accent" + (loaded ? "" : " pointer-events-none")}>{highlighted}</pre>
				</div>
			</div>
			<Toaster />
		</div>
	);
}