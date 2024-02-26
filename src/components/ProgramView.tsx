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

export default function ProgramView({ className, machine, setMachine, setStep, loaded, setLoaded }:
	{
		className?: string,
		machine: stg_machine,
		setMachine: Function,
		setStep: Function,
		loaded: boolean,
		setLoaded: Function
	}) {
	const [parser, setParser] = useState(stg_parser);
	const [programText, setProgramText] = useState(String(sum_prg));
	const [highlighted, setHighlighted] = useState(highlight(programText));
	const { toast } = useToast();

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

	function selectExample(s: string) {
		const selected = examples.filter(({ name, code }) => name === s)[0];
		if (selected) {
			let { name, code } = selected;
			// We need to assign here because setProgramText only impacts next render
			setProgramText(code);
			setHighlighted(highlight(code));
		}
	}

	function inputHandler(e: ChangeEvent<HTMLTextAreaElement>) {
		let code = e.target.value;
		setProgramText(code);
		setHighlighted(highlight(code));
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
				<Button onClick={toggleEditable} className="">{loaded ? "Edit program" : "Load program"}</Button>
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