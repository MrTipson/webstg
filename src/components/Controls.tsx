import { stg_machine } from "../stgmachine/machine";

export default function Controls({ machine, setMachine, setStep }: { machine: stg_machine, setMachine: Function, setStep: Function }) {

	function next() {
		machine.step();
		setMachine(machine);
		setStep(machine.step_number);
	}

	return (
		<button onClick={next}>Next step</button>
	);
}
