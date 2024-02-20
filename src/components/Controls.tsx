import { stg_machine } from "@/stgmachine/machine";
import { Button } from "@/components/ui/button";

export default function Controls({ className, machine, setMachine, setStep }: { className?: string, machine: stg_machine, setMachine: Function, setStep: Function }) {

	function next() {
		machine.step();
		setStep(machine.step_number);
	}

	return (
		<div className={className}>
			<Button onClick={next}>Next step</Button>
		</div>
	);
}
