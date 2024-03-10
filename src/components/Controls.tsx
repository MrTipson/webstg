import { stg_machine } from "@/stgmachine/machine";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { identifier } from "@/stglang/types";

export default function Controls({ className, machine, setMachine, setStep }: { className?: string, machine: stg_machine, setMachine: Function, setStep: Function }) {
	const [intervalID, setIntervalID] = useState<number>();
	const { toast } = useToast();

	function next(steps: number) {
		if (intervalID) { // if machine is stepped manually, stop interval
			window.clearInterval(intervalID);
			setIntervalID(undefined);
		}
		try {
			while (steps-- > 0 && machine.step());
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

	function back(steps: number) {
		try {
			while (steps-- > 0 && machine.step_back());
			console.log(machine);
			setStep(machine.step_number);
		} catch (e) {
			toast({
				title: "Runtime error",
				description: String(e),
				variant: "destructive"
			})
		}
	}

	function toggleAutoStep() {
		if (intervalID) {
			window.clearInterval(intervalID);
			setIntervalID(undefined);
		} else {
			setIntervalID(window.setInterval(() => {
				if (!machine.step()) { // clear interval if execution stops
					window.clearInterval(intervalID);
					setIntervalID(undefined);
				}
				setStep(machine.step_number);
			}, 1000));
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

	return (
		<div className={className}>
			{definition &&
				<div className="text-center p-2">
					<span className="font-semibold text-lg">Next rule: </span>
					<span className="text-muted-foreground">{explanation}</span>
					<div className="bg-muted p-1 rounded"><Latex children={definition} /></div>
				</div>
				||
				<span className="font-semibold text-lg">No matching rule</span>
			}
			<div className={"flex gap-x-1 justify-center"}>
				<Button onClick={() => back(100)}>-100</Button>
				<Button onClick={() => back(10)}>-10</Button>
				<Button onClick={() => back(1)}>-1</Button>
				<Button onClick={toggleAutoStep}>{intervalID ? "Cancel autostep" : "Start autostep"}</Button>
				<Button onClick={() => next(1)}>+1</Button>
				<Button onClick={() => next(10)}>+10</Button>
				<Button onClick={() => next(100)}>+100</Button>
			</div>
		</div>
	);
}
