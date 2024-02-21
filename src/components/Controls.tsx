import { stg_machine } from "@/stgmachine/machine";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Controls({ className, machine, setMachine, setStep }: { className?: string, machine: stg_machine, setMachine: Function, setStep: Function }) {
	const [intervalID, setIntervalID] = useState<number>();

	function next(steps: number) {
		if (intervalID) { // if machine is stepped manually, stop interval
			window.clearInterval(intervalID);
			setIntervalID(undefined);
		}
		while (steps-- > 0 && machine.step());
		console.log(machine);
		setStep(machine.step_number);
	}

	function back(steps: number) {
		while (steps-- > 0 && machine.step_back());
		console.log(machine);
		setStep(machine.step_number);
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

	return (
		<div className={className + " flex gap-x-1"}>
			<Button onClick={() => back(100)}>-100</Button>
			<Button onClick={() => back(10)}>-10</Button>
			<Button onClick={() => back(1)}>-1</Button>
			<Button onClick={toggleAutoStep}>{intervalID ? "Cancel autostep" : "Start autostep"}</Button>
			<Button onClick={() => next(1)}>+1</Button>
			<Button onClick={() => next(10)}>+10</Button>
			<Button onClick={() => next(100)}>+100</Button>
		</div>
	);
}
