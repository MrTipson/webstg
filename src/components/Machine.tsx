import { useState } from "react";
import { stg_machine } from "../stgmachine/machine";
import { sum_prg } from "../stglang/test";
import ProgramView from "./ProgramView";
import StackView from "./StackView";
import HeapView from "./HeapView";
import EnviromentView from "./EnviromentView";
import Controls from "./Controls";

export default function Machine() {
	const [machine, setMachine] = useState(() => new stg_machine(sum_prg, false, true));
	const [step, setStep] = useState(0);

	return (
		<div>
			<Controls machine={machine} setMachine={setMachine} setStep={setStep} />
			<ProgramView machine={machine} />
			<StackView machine={machine} />
			<HeapView machine={machine} />
			<EnviromentView machine={machine} />
		</div>
	);
}