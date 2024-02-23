import { sum_prg } from "@/stglang/test";
import { stg_machine } from "@/stgmachine/machine";
import React, { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { parser as stg_parser } from "@/stglang/parser";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import type { LRParser } from "@lezer/lr";

export default function ProgramView({ className, machine }: { className?: string, machine: stg_machine }) {
	const [parser, setParser] = useState(stg_parser);
	const [programText, setProgramText] = useState(String(sum_prg));
	const [highlighted, setHighlighted] = useState<React.DetailedReactHTMLElement<React.HTMLAttributes<HTMLElement>, HTMLElement>>(highlight(programText));
	const [editable, setEditable] = useState(false);

	function toggleEditable() {

		setEditable(!editable);
	}

	function highlight(code: string) {
		let children: any[] = [];
		function emit(text: string, classes: string) {
			if (classes) {
				children.push(React.createElement("span", { className: classes }, text));
			} else {
				children.push(text);
			}
		}
		function emitBreak() {
			children.push("\n");
		}

		highlightCode(
			code,
			parser.parse(code),
			classHighlighter,
			emit,
			emitBreak,
		);
		return React.createElement("code", undefined, ...children);
	}

	function inputHandler(e: FormEvent) {
		let code = (e.target as HTMLPreElement).innerText;
		setHighlighted(highlight(code));
	}

	return (
		<div className={"relative " + className}>
			<pre className="absolute inset-0 bg-transparent text-transparent caret-primary"
				contentEditable={editable} suppressContentEditableWarning onInput={inputHandler}>
				<code>{programText}</code>
			</pre>
			<pre className="absolute inset-0 pointer-events-none bg-transparent">{highlighted}</pre>
			<Button onClick={toggleEditable} className="absolute right-2 top-2">{editable ? "Load program" : "Edit"}</Button>
		</div>
	);
}