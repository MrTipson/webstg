import { stg_machine } from "@/stgmachine/machine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { identifier } from "@/stglang/types";
import HelpPopover from "@/components/HelpPopover";
import Timeline from "@/components/Timeline";
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Flag, Play } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { STGSettings } from "@/components/Machine";

export default function Controls({ className, machine, step, setStep, breakpoints, settings }: {
	className?: string,
	machine: stg_machine,
	step: number,
	setStep: Function,
	breakpoints: Map<number, number>,
	settings: STGSettings
}) {
	const { toast } = useToast();
	const [markers, setMarkers] = useState<Map<number, string>>(() => {
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

	function run() {
		try {
			let stepLimit = settings.run_limit;
			while (machine.step() && --stepLimit > 0) {
				const { from, to } = machine.expr;
				if (breakpoints.get(from) === to) {
					break;
				}
			}
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

	let definition, explanation;
	let expr = machine.expr;
	if (expr instanceof identifier) expr = machine.env.find_value(expr);
	for (let rule of machine.ruleset) {
		let result = rule.match(expr, machine.env, machine.s, machine.h);
		if (result) {
			definition = rule.definition;
			explanation = rule.explanation;
			break;
		}
	}

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
			<div className="text-center">
				Step <span className="font-semibold">{machine.step_number}</span>
			</div>
			<Timeline className="m-auto w-[500px]" width={500} step={step} moveTo={moveTo} markers={[...markers.entries()]}></Timeline>
			{
				definition &&
				<div className="text-center p-2">
					<span className="font-semibold text-lg">Next rule: </span>
					<span className="text-muted-foreground">{explanation}</span>
					<div className="bg-muted p-1 rounded"><Latex children={definition} /></div>
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
				<Button onClick={() => run()} size={'icon'}><Play /></Button>
				<Button onClick={() => moveTo(step + 1)} ><ArrowRight /></Button>
				<HelpPopover>
					<p>The control panel contains controls for stepping the simulation.</p><br />
					<p>It also displays the next rule which will be applied, both as a short
						description, but also as a more formal operational semantics rule.</p>
				</HelpPopover>
			</div>
		</div>
	);
}

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