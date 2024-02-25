import { sum_prg } from "@/stglang/test";
import { stg_machine } from "@/stgmachine/machine";
import React, { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { parser as stg_parser } from "@/stglang/parser";
import { highlightTree, classHighlighter } from "@lezer/highlight";
import { STGSyntaxError, build_ast } from "@/stglang/ASTBuilder";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function ProgramView({ className, machine, setMachine, setStep }:
	{
		className?: string,
		machine: stg_machine,
		setMachine: Function,
		setStep: Function
	}) {
	const [parser, setParser] = useState(stg_parser);
	const [programText, setProgramText] = useState(String(sum_prg));
	const [highlighted, setHighlighted] = useState(highlight(programText));
	const { toast } = useToast();

	function loadProgram() {
		try {
			const ast = build_ast(programText);
			setMachine(new stg_machine(ast, false, true));
			setStep(0);
			toast({
				title: "Success",
				description: "You can now step through the execution"
			});
		} catch (e) { // build ast can throw an error
			if (e instanceof STGSyntaxError) {
				toast({
					title: "Syntax error",
					description: e.message,
					variant: "destructive"
				});
				setHighlighted(highlight(programText, true, e.from, e.to, e.message));
			}
		}
	}

	function highlight(code: string, isError = false, errorFrom = -1, errorTo = -1, errorMessage = "") {
		let children: any[] = [];
		let tmpChildren: any[] = [];
		let start = 0;
		let inError = false;
		function putStyle(from: number, to: number, classes: string) {
			if (isError && errorTo >= start) {
				if (!inError && from >= errorFrom) { // do we need to start the error span
					if (start < errorFrom) {
						children.push(code.substring(start, errorFrom));
						start = errorFrom;
					}
					tmpChildren = children;
					children = [];
					inError = true;
					if (errorFrom === errorTo && tmpChildren.length > 0) {
						children.push(tmpChildren.pop());
					}
				}
				if (inError) {
					if (from >= errorTo) {
						if (start < errorTo) {
							children.push(code.substring(start, errorTo));
							start = errorTo;
						}
						let el = React.createElement("span", { className: "syntax-error", title: errorMessage }, ...children);
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

	function inputHandler(e: ChangeEvent<HTMLTextAreaElement>) {
		let code = e.target.value;
		setProgramText(code);
		setHighlighted(highlight(code));
	}

	return (
		<div className={"relative " + className}>
			<code>
				<textarea className="absolute inset-0 bg-transparent text-transparent caret-primary p-4 font-semibold resize-none selection:text-transparent selection:bg-accent"
					onChange={inputHandler} defaultValue={programText} spellCheck={false} />
			</code>
			<pre className="absolute inset-0 pointer-events-none bg-transparent text-wrap">{highlighted}</pre>
			<Button onClick={loadProgram} className="absolute right-2 top-2">Load program</Button>
			<Toaster />
		</div>
	);
}