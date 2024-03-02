import { useState } from "react";
import { stg_machine } from "@/stgmachine/machine";
import { sum_prg } from "@/stglang/test";
import ProgramView from "@/components/ProgramView";
import StackView from "@/components/StackView";
import HeapView from "@/components/HeapView";
import Controls from "@/components/Controls";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";

export default function Machine() {
	// set machine is called *only* when a new program is loaded, but will be mutated while stepping
	const [machine, setMachine] = useState<stg_machine>(() => new stg_machine(sum_prg, false, true));
	const [loaded, setLoaded] = useState(false);
	const [step, setStep] = useState(0);

	return (
		<div className="h-full w-full flex flex-col">
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={30}>
					<ProgramView machine={machine} setMachine={setMachine}
						step={step} setStep={setStep}
						loaded={loaded} setLoaded={setLoaded}
						className="h-full" />
				</ResizablePanel>
				<ResizableHandle withHandle />
				{loaded &&
					<>
						<ResizablePanel defaultSize={55}><HeapView machine={machine} className="h-full" step={step} /></ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={15}><StackView machine={machine} className="h-full" /></ResizablePanel>
						<Controls className="absolute bottom-6 left-0 right-0 m-auto w-fit" machine={machine} setMachine={setMachine} setStep={setStep} />
					</>
					|| // not loaded
					<>
						<ResizablePanel defaultSize={60} className="flex flex-col justify-center">
							<span className="text-center text-primary text-2xl font-bold">Load a program to begin simulation</span>
						</ResizablePanel>
					</>
				}
			</ResizablePanelGroup>
			<Toaster />
		</div>
	);
}