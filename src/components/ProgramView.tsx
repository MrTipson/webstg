import { stg_machine } from "@/stgmachine/machine";
import React, { useState, type ChangeEvent, useRef, useEffect, useMemo, type BaseSyntheticEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { parser } from "@/stglang/parser";
import { highlightTree, classHighlighter } from "@lezer/highlight";
import { STGSyntaxError, build_ast } from "@/stglang/ASTBuilder";
import { useToast } from "@/components/ui/use-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { binding, case_eval, case_expr, FUN, identifier, let_expr, letrec_expr, literal, THUNK, type expression } from "@/stglang/types";
import { Separator } from "@/components/ui/separator";
import HelpPopover from "@/components/HelpPopover";
import type { STGSettings } from "@/components/Machine";
import SettingsMenu from "@/components/SettingsMenu";
import { inflate, deflate } from 'pako';
import type { InferEntrySchema } from "astro:content";

/**
 * Compress input text using DEFLATE and encode it using base64
 * @param txt Input text
 * @returns Base64 encoded compressed text
 */
function compress(txt: string) {
	return btoa(Array.from(deflate(txt), (byte) => String.fromCodePoint(byte)).join(""));
}

/**
 * Decode input base64 and decompress it using INFLATE 
 * @param txt Input encoded+compressed text
 * @returns Decoded and decompressed text
 */
function decompress(txt: string) {
	return inflate(Uint8Array.from(atob(txt), char => char.codePointAt(0) as number), { to: 'string' });
}

/**
 * Helper function to find subexpression to which a breakpoint should be attached.
 * @param lineStart Index of the first char in the current line
 * @param nextLineStart Index of the first chat in the next line
 * @param expr Expression we are examining
 * @returns 
 */
function findExpression(lineStart: number, nextLineStart: number, expr: expression): expression | undefined {
	if (expr instanceof let_expr || expr instanceof letrec_expr) {
		// Body of let(rec) expression
		let e = findExpression(lineStart, nextLineStart, expr.expr);
		if (e) return e;

		// Binds of let(rec) expression
		for (const bind of expr.binds) {
			if (bind.obj instanceof FUN || bind.obj instanceof THUNK) {
				e = findExpression(lineStart, nextLineStart, bind.obj.expr);
				if (e) return e;
			}
		}
	} else if (expr instanceof case_expr) {
		// Scrutinee
		let e = findExpression(lineStart, nextLineStart, expr.expr);
		if (e) return e;

		// Alternatives
		const exprs = [...expr.alts.named_alts.map(x => x.expr)];
		if (expr.alts.default_alt) {
			exprs.push(expr.alts.default_alt.expr);
		}
		for (let x of exprs) {
			e = findExpression(lineStart, nextLineStart, x);
			if (e) return e;
		}
	}
	if (lineStart <= expr.from && nextLineStart > expr.from ||
		lineStart < expr.to && nextLineStart >= expr.to ||
		lineStart >= expr.from && nextLineStart <= expr.to
	) {
		return expr;
	}
	return undefined;
}

type ProgramViewProps = {
	readonly className?: string,
	readonly machine: stg_machine,
	readonly step: number,
	readonly loaded: boolean,
	readonly settings: STGSettings,
	readonly breakpoints: Map<number, number>,
	readonly isDesktop: boolean,
	readonly enteredThunks: [number, number][],
	readonly examples: InferEntrySchema<"examples">[],
	readonly default_program: string,

	setMachine: React.Dispatch<stg_machine>,
	setStep: React.Dispatch<number>,
	setLoaded: React.Dispatch<boolean>,
	setSettings: React.Dispatch<STGSettings>,
	setBreakpoints: React.Dispatch<Map<number, number>>,
	setEnteredThunks: React.Dispatch<[number, number][]>,
}
/**
 * ProgramView component for fascilitating editing and loading of STG programs.
 * During runtime, it also visualizes the enviroment and current expression.
 * @param props.className Classes passed down by the parent
 * @param props.machine stg_machine instance of the simulator
 * @param props.step Current step of the simulation
 * @param props.loaded Flag whether the program is currently loaded in the machine
 * @param props.settings STG machine and visualization settings
 * @param props.breakpoints Mapping for breakpoints. A breakpoint exists for expression e if breakpoints[e.from] === e.to
 * @param props.isDesktop Flag whether the visualization is displaying the mobile layout
 * @param props.enteredThunks Thunks which were manually entered after finishing execution. Entered thunk is a tuple [step, address]
 * @param props.examples Examples used in the program editor
 * @param props.default_program Which example (by name) is used by default
 */
export default function ProgramView(props: ProgramViewProps) {
	const { className, machine, step, loaded, settings, breakpoints, isDesktop, enteredThunks, examples, default_program } = props;
	const { setMachine, setStep, setLoaded, setSettings, setBreakpoints, setEnteredThunks } = props;

	const [selected, setSelected] = useState<string>(default_program);
	const [programText, setProgramText] = useState(() => {
		const searchParams = new URLSearchParams(location.search);
		const programParam = searchParams.get('program');
		if (programParam) {
			setSelected('');
			return decompress(programParam);
		} else {
			return examples.find(x => x.name === default_program)?.code as string;
		}
	});
	const [error, setError] = useState<{ from: number, to: number, step: number } | undefined>(undefined);
	if (error && step < error.step) {
		setError(undefined);
	}

	const currentExpressionRef = useRef<HTMLSpanElement | undefined>(undefined);
	const { toast } = useToast();

	// Memoize line starts which are used for breakpoints
	const lineStarts = useMemo(() => {
		if (!loaded) {
			return [];
		}
		const lineLengths = programText.split("\n").map(x => x.length + 1);
		let total = 0;
		const starts = [];
		for (const len of lineLengths) {
			starts.push(total);
			total += len;
		}
		starts.push(total);
		return starts;
	}, [loaded]);

	// Memoize breakpoint status which is used for displaying breakpoints
	const breakPointIsActive = useMemo<boolean[]>(() => {
		const spans = [...breakpoints.keys()].sort();
		const result = new Array(lineStarts.length).fill(false);
		let spanIndex = 0;
		for (let lineIndex = 0; lineIndex < lineStarts.length; lineIndex++) {
			if (lineStarts[lineIndex] > spans[spanIndex]) {
				result[lineIndex - 1] = true;
				spanIndex++;
			}
		}
		return result;
	}, [lineStarts, breakpoints]);

	// Scroll to the current 
	useEffect(() => currentExpressionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));

	// Try to load program from URL if possible
	useEffect(() => {
		const searchParams = new URLSearchParams(location.search);
		if (!loaded && searchParams.has('program')) {
			if (!loadMachine(programText, step)) {
				toast({
					title: 'Import failed',
					description: 'Could not restore configuration from the URL',
					variant: 'destructive'
				});
				history.replaceState(null, '', location.pathname);
			}
		}
	}, []);

	// Highlight the syntax, enviroment, current expression or error
	let highlighted;
	if (error) {
		highlighted = highlight(programText, true, error.from, error.to, { className: "syntax-error" });
	} else if (loaded) {
		// Extract from and to indices for all enviroment entries, and main specifically
		let mainfrom, mainto;
		let enviroment = [
			...machine.env.local_entries(),
			...machine.env.global_entries()
		].map(([name, lit]) => {
			if (name === "main") {
				mainfrom = lit.from;
				mainto = lit.to;
			}
			return { from: lit.from, to: lit.to, value: String(lit) };
		});
		// With the current implementation, only identifier expressions get marked
		if (machine.expr instanceof case_eval) {
			let val = machine.expr.val;
			enviroment.push({ from: val.from, to: val.to, value: String(val) });
		}
		// from and to might be -1, but it shouldnt cause any issues
		let props: Object = { className: "current-expression" };
		if (mainfrom !== machine.expr.from && mainto !== machine.expr.to && // don't mark main's value again
			(machine.expr instanceof identifier || machine.expr instanceof literal)) {
			let val = machine.expr;
			try {
				if (val instanceof identifier) {
					val = machine.env.find_value(val);
				}
				props = { className: "current-expression with-value", "data-value": val, ref: currentExpressionRef };
			} catch (e) {
				toast({
					title: "Runtime error",
					description: String(e),
					variant: "destructive"
				});
				setError({ from: val.from, to: val.to, step: step });
			}
		}
		highlighted = highlight(programText, true, machine.expr.from, machine.expr.to, props, enviroment);
	} else {
		highlighted = highlight(programText);
	}

	/**
	 * Parse program from code, load it into the STG machine and go to step
	 * @param code STG program text
	 * @param step Step number to go to
	 */
	function loadMachine(code: string, step: number) {
		try {
			const ast = build_ast(code);
			const machine = new stg_machine(ast, settings.eval_apply, settings.garbage_collection, enteredThunks);
			while (step > machine.step_number && machine.step());
			setMachine(machine);
			setStep(step);
			toast({
				title: "Success",
				description: "You can now step through the execution"
			});
			setLoaded(true);
			return true;
		} catch (e) { // build ast can throw an error
			if (e instanceof STGSyntaxError) {
				toast({
					title: "Syntax error",
					description: e.message,
					variant: "destructive"
				});
				setError({ from: e.from, to: e.to, step: 0 });
			} else if (e instanceof Error) {
				toast({
					title: "Error",
					description: e.message,
					variant: "destructive"
				});
			} else {
				toast({
					title: "Unexpected error",
					description: String(e),
					variant: "destructive"
				});
			}
			return false;
		}
	}

	/**
	 * Toggle loaded state and synchronize program search param in url
	 */
	function toggleEditable() {
		if (loaded) {
			history.replaceState(null, '', location.pathname);
			setEnteredThunks([]);
			setLoaded(false);
		} else if (loadMachine(programText, 1)) {
			setLoaded(true);
			const searchParams = new URLSearchParams(location.search);
			if (!searchParams.has('program')) {
				searchParams.set('program', compress(programText));
			}
			const newUrl = `${location.pathname}?${searchParams.toString()}`;
			history.replaceState(null, '', newUrl);
		}
	}

	/**
	 * Use lezer to emit styles for syntax, value annotatiosn and marks
	 * @param code STG program source text
	 * @param mark Flag for applying mark
	 * @param markFrom Mark start index
	 * @param markTo Mark end index
	 * @param markProps Mark classes
	 * @param valueAnnotations Annotations for values in the enviroment
	 * @returns Marked code element
	 */
	function highlight(code: string,
		mark = false, markFrom = -1, markTo = -1, markProps = {},
		valueAnnotations: { from: number, to: number, value: string }[] = []) {
		let children: any[] = [];
		let tmpChildren: any[] = []; // used for children inside a mark
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

			// Unstyled text
			if (start < from) {
				children.push(code.substring(start, from));
			}
			let text = code.substring(from, to);

			// This will skip any annotations that might have been skipped
			while (annotation && annotation.from < from) {
				console.warn("Skipped annotation", annotation);
				annotation = valueAnnotations.pop();
			}

			// Emit syntax with optional value annotation
			if (annotation && annotation.from == from && annotation.to == to) {
				children.push(React.createElement("span", { className: classes + " with-value", "data-value": annotation.value }, text));
				annotation = valueAnnotations.pop();
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

	/**
	 * Handler for example selector
	 * @param s Name of example
	 */
	function selectExample(s: string) {
		const selected = examples.find(({ name }) => name === s);
		if (selected) {
			setSelected(s);
			setProgramText(selected.code);
			setLoaded(false);
			setError(undefined);
		}
	}

	/**
	 * Handler for STG program input
	 * @param e TextArea change event
	 */
	function inputHandler(e: ChangeEvent<HTMLTextAreaElement>) {
		let code = e.target.value;
		setSelected('');
		setProgramText(code);
		setError(undefined);
	}

	/**
	 * Handler for setting a breakpoint
	 * @param lineNumber 
	 */
	function setBreakpoint(lineNumber: number) {
		const lineStart = lineStarts[lineNumber];
		// Check if there is a breakpoint on this line already
		for (const start of breakpoints.keys()) {
			if (lineStart <= start && lineStarts[lineNumber + 1] > start) {
				const newBreakpoints = new Map(breakpoints);
				newBreakpoints.delete(start);
				setBreakpoints(newBreakpoints);
				return;
			}
		}
		// Find binding which contains the line
		for (const decl of machine.prog.decls) {
			if (lineStart >= decl.from && lineStart < decl.to && decl instanceof binding) {
				if (decl.obj instanceof FUN || decl.obj instanceof THUNK) {
					// Try to find expression at exact line, but fallback if it was not found
					const expr = findExpression(lineStart, lineStarts[lineNumber + 1], decl.obj.expr) ||
						findExpression(decl.from, decl.to, decl.obj.expr);
					if (expr) {
						const newBreakpoints = new Map(breakpoints);
						newBreakpoints.set(expr.from, expr.to);
						setBreakpoints(newBreakpoints);
					}
					return;
				}
			}
		}
	}

	/**
	 * Handler for keyboard events inside the editor. Used to override default behaviour
	 * concerning tab focus. Tab inserts a tabulator (\t), and focus for keyboard navigation is
	 * restored using escape.
	 * @param e Keyboard event to handle
	 */
	function keyDownHandler(e: BaseSyntheticEvent & KeyboardEvent) {
		switch (e.key) {
			case 'Tab': // Change behaviour so tab doesn't move to next element
				e.preventDefault();
				document.execCommand('insertText', false, '\t');
				e.target.dispatchEvent(new Event('input'));
				break;
			case 'Escape': // Escape unfocuses text area, so tab can move on to next element again
				e.target.blur();
				break;
		}
	}

	return (
		<div className={className + " relative flex flex-col"}>
			<div className="flex flex-wrap gap-2 m-1 items-center">
				<h2 className="font-semibold text-xl m-3">Program</h2>
				<HelpPopover>
					<p className="text-muted-foreground">Program view allows you to import examples, edit programs and change settings.
						Basic syntax highlighting and error handling is also available.</p><br />

					<span className="font-semibold">Runtime:</span>
					<p className="text-muted-foreground">During runtime, additional info is displayed in the program code:</p>
					<ul className="list-disc list-inside text-muted-foreground">
						<li className='my-1'>
							values of bindings in the enviroment:
							<span className="tok-variableName with-value px-1 py-0.5 mx-1 rounded font-semibold" data-value="0xb">TEST</span>
						</li>
						<li className='my-1'>current expression: <span className="current-expression px-1 py-0.5 rounded text-foreground">1 +# 2</span></li>
						<li className='my-1'>expression result: <span className="current-expression with-value px-1 py-0.5 rounded text-foreground" data-value="3">1 +# 2</span></li>
					</ul><br />

					<span className="font-semibold">Breakpoints:</span>
					<p className="text-muted-foreground">When a program is loaded,
						you can set breakpoints on the left side of the program code.</p>
				</HelpPopover>
				{!loaded &&
					<Select onValueChange={selectExample} value={selected}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Custom program" />
						</SelectTrigger>
						<SelectContent>
							{examples.map(({ name }, i) => {
								return <SelectItem key={i} value={name}>{name}</SelectItem>;
							})}
						</SelectContent>
					</Select>
				}
				<Button onClick={toggleEditable}>{loaded ? "Edit" : "Load"}</Button>
				<SettingsMenu settings={settings} setSettings={setSettings} loaded={loaded} setLoaded={setLoaded} />
			</div>
			<Separator />
			<div className="relative grow m-2 overflow-y-auto p-2 flex flex-col">
				<div className="relative w-full min-w-max grow">
					<pre className={"relative z-10 bg-transparent selection:bg-accent p-4" + (loaded ? "" : " pointer-events-none")}>{highlighted}</pre>
					<ul className="absolute left-0 top-0 list-disc list-inside pt-4 z-10 select-all marker:text-red-700">
						{loaded && breakPointIsActive.map((active, i) => {
							const opacity = active ? "opacity-100" : isDesktop ? "opacity-0 hover:opacity-50" : "opacity-25";
							return <li className={"px-2 -ml-2 w-6 " + opacity} key={i} onClick={() => setBreakpoint(i)} ></li>
						})}
					</ul>
					<code>
						<textarea className={"absolute inset-0 bg-transparent text-transparent caret-primary p-4 font-semibold \
							resize-none selection:bg-accent selection:text-transparent w-full h-full overflow-hidden text-nowrap whitespace-pre" + (!loaded ? "" : " pointer-events-none")}
							onChange={inputHandler} value={programText} spellCheck={false} disabled={loaded} onKeyDownCapture={keyDownHandler} aria-label="Editor for the STG program." aria-description="Tab behaviour has been altered. If you wish to switch focus, press the escape key before using tab." />
					</code>
				</div>
			</div>
		</div>
	);
}
