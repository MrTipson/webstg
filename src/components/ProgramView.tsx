import { map_pap_prg, sum_prg, fib_prg } from "@/stglang/test";
import { stg_machine } from "@/stgmachine/machine";
import React, { useState, type ChangeEvent, useContext } from "react";
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
	const [error, setError] = useState<{ from: number, to: number } | undefined>(undefined)
	const { toast } = useToast();

	let highlighted;
	if (error) {
		highlighted = highlight(programText, true, error.from, error.to, "syntax-error");
	} else if (loaded) {
		// from and to might be -1, but it shouldnt cause any issues
		highlighted = highlight(programText, true, machine.expr.from, machine.expr.to, "current-expression")
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

	function highlight(code: string, mark = false, markFrom = -1, markTo = -1, markClass = "") {
		let children: any[] = [];
		let tmpChildren: any[] = [];
		let start = 0;
		let inMark = false;
		function putStyle(from: number, to: number, classes: string) {
			if (mark && markTo >= start) {
				if (!inMark && from >= markFrom) { // do we need to start the error span
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
						let el = React.createElement("span", { className: markClass }, ...children);
						children = tmpChildren;
						children.push(el);
					}
				}
			}
			if (start < from) {
				children.push(code.substring(start, from));
			}
			let text = code.substring(from, to);
			children.push(React.createElement("span", { className: classes }, text));
			start = to;
		}

		highlightTree(
			parser.parse(code),
			classHighlighter,
			putStyle
		);
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
			<div className={"relative grow m-2"}>
				<code>
					<textarea className="absolute inset-0 bg-transparent text-transparent caret-primary p-4 font-semibold resize-none selection:text-transparent selection:bg-accent"
						onChange={inputHandler} value={programText} spellCheck={false} disabled={loaded} />
				</code>
				<pre className="absolute inset-0 pointer-events-none bg-transparent text-wrap">{highlighted}</pre>
			</div>
			<Toaster />
		</div>
	);
}