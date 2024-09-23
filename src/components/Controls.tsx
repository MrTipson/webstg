import { stg_machine } from "@/stgmachine/machine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { identifier, THUNK, type heap_object } from "@/stglang/types";
import HelpPopover from "@/components/HelpPopover";
import Timeline from "@/components/Timeline";
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Flag, Play } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { macros } from "@/stgmachine/evaluation_rules/utils";
import type { STGSettings } from "@/components/Machine";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ControlsProps = {
	readonly className?: string,
	readonly machine: stg_machine,
	readonly step: number,
	readonly breakpoints: Map<number, number>,
	readonly settings: STGSettings,
	readonly isDesktop: boolean,
	readonly enteredThunks: [number, number][],

	setStep: React.Dispatch<number>,
	setEnteredThunks: React.Dispatch<[number, number][]>,
}
/** 
 * Control panel for the visualization. Contains step controls, timeline and rule explanation.
 * @param props.className Classes passed down from the parent
 * @param props.machine stg_machine instance for the simulator
 * @param props.step Current step state of the simulation
 * @param props.breakpoints Mapping for breakpoints. A breakpoint exists for expression e if breakpoints[e.from] === e.to
 * @param props.settings Settings for the stg_machine and visualization
 * @param props.isDesktop Flag to choose which layout to use
 * @param props.enteredThunks Thunks which were manually entered after finishing execution. Entered thunk is a tuple [step, address]
 * 
 * @param props.setStep Setter for the step state
 * @param props.setEnteredThunks Setter for entered thunks
 * */
export default function Controls(props: ControlsProps) {
	const { className, machine, step, setStep, breakpoints, settings, isDesktop, enteredThunks, setEnteredThunks } = props;
	const { toast } = useToast();
	// Markers are mappings from steps to labels.
	const [markers, setMarkers] = useState<ReadonlyMap<number, string>>(() => {
		const searchParams = new URLSearchParams(location.search);
		const markers = new Map();
		for (let key of searchParams.keys()) {
			if (/^m\d+$/.test(key)) {
				const step = Number(key.substring(1));
				const name = decodeURIComponent(searchParams.get(key) as string);
				markers.set(step, name);
			}
		}
		return markers;
	});
	// Setup keyboard shortcuts for stepping
	useEffect(() => {
		function keyboardHandler(event: KeyboardEvent) {
			if (event.key == "ArrowLeft") {
				moveTo(step - 1);
			} else if (event.key == "ArrowRight") {
				moveTo(step + 1);
			}
		}
		document.addEventListener("keydown", keyboardHandler);
		return () => document.removeEventListener("keydown", keyboardHandler);
	})

	/**
	 * Enter another thunk after execution has finished
	 * @param thunk Thunk address to enter
	 */
	function enterThunk(thunk: number) {
		machine.enter_thunk(thunk);
		setEnteredThunks([...enteredThunks, [machine.step_number, thunk]]);
		setStep(machine.step_number);
	}
	/**
	 * Move execution from current step to newStep (can be forwards or backwards).
	 * > Only updates the visualization *once*.
	 * 
	 * > *Also logs the machine instance to the console for easier inspection.*
	 * @param newStep Step to move to
	 */
	function moveTo(newStep: number) {
		try {
			while (newStep > machine.step_number && machine.step());
			while (newStep < machine.step_number && machine.step_back());
			console.log(machine);
			setStep(machine.step_number);
		} catch (e) {
			toast({
				title: "Runtime error",
				description: String(e),
				variant: "destructive"
			});
		}
	}

	/**
	 * Step forward, but stop if:
	 * - run_limit steps have elapsed
	 * - a breakpoint is reached
	 * - execution is finished
	 * 
	 * Only updates the visualization *once*.
	 */
	function run() {
		try {
			let stepLimit = settings.run_limit;
			while (machine.step() && --stepLimit > 0) {
				const { from, to } = machine.expr;
				if (breakpoints.get(from) === to) {
					break;
				}
			}
		} catch (e) {
			toast({
				title: "Runtime error",
				description: String(e),
				variant: "destructive"
			});
		}
		console.log(machine);
		setStep(machine.step_number);
	}

	// Find next matching rule
	let definition, explanation;
	let expr = machine.expr;
	try {
		if (expr instanceof identifier) expr = machine.env.find_value(expr);
	} catch (e) { } // error should get reported by ProgramView
	for (let rule of machine.ruleset) {
		let result = rule.match(expr, machine.env, machine.s, machine.h);
		if (result) {
			definition = rule.definition;
			explanation = rule.explanation;
			break;
		}
	}

	/**
	 * Handle changes to the markers and update the state
	 * @param event Change event to handle
	 */
	function onChangeMarker(event: React.ChangeEvent<HTMLInputElement>) {
		const value = event.target.value;
		const newMarkers = new Map(markers);
		const searchParams = new URLSearchParams(location.search);
		if (value === '') {
			newMarkers.delete(step);
			searchParams.delete(`m${step}`)
		} else {
			newMarkers.set(step, value);
			searchParams.set(`m${step}`, encodeURIComponent(value))
		}
		setMarkers(newMarkers);
		const newUrl = `${location.pathname}?${searchParams.toString()}`;
		history.replaceState(null, '', newUrl);
	}

	return (
		<div className={className}>
			<details open>
				<summary className="text-center">
					Step <span className="font-semibold">{machine.step_number}</span>
				</summary>
				<Timeline className={"m-auto " + (isDesktop ? "w-[500px]" : "w-[300px]")} width={isDesktop ? 500 : 300} step={step} moveTo={moveTo} markers={[...markers.entries()]}></Timeline>
			</details>
			{
				definition &&
				<div className="text-center p-2">
					<details open>
						<summary>
							<span className="font-semibold text-lg">Next rule: </span>
							<span className="text-muted-foreground">{explanation}</span>
						</summary>
						<div className="bg-muted p-1 rounded text-3xl"><Latex children={definition} macros={macros} /></div>
					</details>
				</div>
				||
				<div className="font-semibold text-lg text-center p-2">No matching rule</div>
			}
			<div className={"flex gap-x-1 justify-center"}>
				<MarkerPopover>
					<p>Set marker name or leave empty to remove marker.</p>
					<div className="grid grid-cols-3 items-center mt-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							defaultValue={markers.get(step) || ''}
							className="col-span-2 h-8"
							onInput={onChangeMarker}
						/>
					</div>
				</MarkerPopover>
				<Button onClick={() => moveTo(step - 1)}><ArrowLeft /></Button>
				{definition
					&& <Button onClick={run} size={'icon'}><Play /></Button>
					|| <ThunkPopover machine={machine} enterThunk={enterThunk}>Enter another thunk?</ThunkPopover>
				}
				<Button onClick={() => moveTo(step + 1)} ><ArrowRight /></Button>
				<HelpPopover>
					<p>The control panel contains controls for stepping the simulation.</p><br />
					<span className="font-semibold">Timeline:</span>
					<p className="text-muted-foreground">As the execution progresses, the timeline grows. Use it to
						jump back to previous steps. Markers can be added using the flag
						icon, and allow you to jump to the marked step.
					</p><br />
					<span className="font-semibold">Next rule:</span>
					<p className="text-muted-foreground">
						Displays the next rule which will be applied, both as a short
						description, but also as a more formal operational semantics rule.
					</p><br />
					<span className="font-semibold">Controls:</span>
					<p className="text-muted-foreground">
						The arrow buttons move the simulation one step at a time, while the continue button goes forward for
						<span className="italic"> step_limit</span> steps and stops at breakpoints.
					</p><br />
				</HelpPopover>
			</div>
		</div >
	);
}

/**
 * Popover for the marker input field
 * @param props.children Elements to put inside the popover
 */
function MarkerPopover({ children }: React.PropsWithChildren) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant={"outline"} size="icon">
					<Flag />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				{children}
			</PopoverContent>
		</Popover>
	);
}

type ThunkPopoverProps = {
	readonly children: React.ReactNode,
	readonly machine: stg_machine,

	enterThunk: (addr: number) => void
}
/**
 * Popover for selecting thunk to enter
 * 
 * *Entering thunks is only available when execution of the machine is finished*
 * @param props.children Contents of the button that triggers the popover
 * @param props.machine stg_machine instance of the simulator
 * @param props.enterThunk Handler for when thunk is selected
 */
function ThunkPopover(props: ThunkPopoverProps) {
	const { children, machine, enterThunk } = props;
	const thunks = machine.h.current.map((x, i) => [x, i]).filter(([x, _]) => x instanceof THUNK) as [heap_object, number][];
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button>
					{children}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-52 max-h-72 grid grid-rows-1">
				<ScrollArea>
					{
						thunks.length > 0
						&& <h3>Thunks on the heap:</h3>
						|| <h3>No thunks on the heap</h3>
					}
					{thunks.map(([_, address], i) =>
						<div key={i} className="contents">
							<Button variant={'ghost'} className="w-full rounded-none justify-start" onClick={() => enterThunk(address)}>
								{`0x${address.toString(16)}`}
							</Button>
							{i < thunks.length - 1 && <Separator />}
						</div>
					)}
				</ScrollArea>
			</PopoverContent>
		</Popover>
	);
}
