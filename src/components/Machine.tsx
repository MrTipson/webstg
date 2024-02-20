import { useState } from "react";
import { stg_machine } from "@/stgmachine/machine";
import { sum_prg } from "@/stglang/test";
import ProgramView from "@/components/ProgramView";
import StackView from "@/components/StackView";
import HeapView from "@/components/HeapView";
import EnviromentView from "@/components/EnviromentView";
import ExpressionView from "@/components/ExpressionView";
import Controls from "@/components/Controls";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Machine() {
	const [machine, setMachine] = useState<stg_machine>(() => new stg_machine(sum_prg, false, true));
	const [step, setStep] = useState(0);

	return (
		<div className="h-full flex flex-col">
			<ExpressionView machine={machine}></ExpressionView>
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel>
					<ProgramView machine={machine} className="h-full" />
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel>
					<HeapView machine={machine} className="h-full" />
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel><StackView machine={machine} className="h-full" /></ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel><EnviromentView machine={machine} className="h-full" /></ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>
			</ResizablePanelGroup>
			<Controls className="absolute bottom-6 left-0 right-0 m-auto w-fit" machine={machine} setMachine={setMachine} setStep={setStep} />
		</div>
	);
}