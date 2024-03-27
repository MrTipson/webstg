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
import { useMediaQuery } from "@/hooks/use-media-query";

export type STGSettings = {
	garbage_collection: boolean,
	eval_apply: boolean,
	collapse_indirections: boolean
}

export default function Machine() {
	// set machine is called *only* when a new program is loaded, but will be mutated while stepping
	const [machine, setMachine] = useState<stg_machine>(() => new stg_machine(sum_prg, false, true));
	const [loaded, setLoaded] = useState(false);
	const [step, setStep] = useState(0);
	const [settings, setSettings] = useState<STGSettings>({
		garbage_collection: true,
		eval_apply: false,
		collapse_indirections: true
	});
	const isDesktop = useMediaQuery("(min-width: 768px)");

	if (!isDesktop) {
		return (
			<div className="h-full w-full flex flex-col">
				<ResizablePanelGroup direction="vertical">
					<ResizablePanel defaultSize={30}>
						<ResizablePanelGroup direction="horizontal">
							<ResizablePanel defaultSize={70}>
								<ProgramView machine={machine} setMachine={setMachine}
									step={step} setStep={setStep}
									loaded={loaded} setLoaded={setLoaded}
									settings={settings} setSettings={setSettings}
									className="h-full" />
							</ResizablePanel>
							{loaded &&
								<>
									<ResizableHandle withHandle />
									<ResizablePanel defaultSize={30}><StackView machine={machine} className="h-full" /></ResizablePanel>
								</>}
						</ResizablePanelGroup>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize={60} className="flex flex-col justify-center">
						{loaded &&
							<HeapView machine={machine} className="h-full" step={step} settings={settings}/>
							||
							<span className="text-center text-primary text-2xl font-bold">Load a program to begin simulation</span>
						}
					</ResizablePanel>
				</ResizablePanelGroup>
				{loaded &&
					<Controls className="bg-background p-2 border" machine={machine} setStep={setStep} />
				}
				<Toaster />
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col">
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={30}>
					<ProgramView machine={machine} setMachine={setMachine}
						step={step} setStep={setStep}
						loaded={loaded} setLoaded={setLoaded}
						settings={settings} setSettings={setSettings}
						className="h-full" />
				</ResizablePanel>
				<ResizableHandle withHandle />
				{loaded &&
					<>
						<ResizablePanel defaultSize={55}><HeapView machine={machine} className="h-full" step={step} settings={settings}/></ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={15}><StackView machine={machine} className="h-full" /></ResizablePanel>
						<Controls className="absolute left-0 right-0 m-auto bottom-0 bg-background z-10 p-2 w-fit rounded-t border" machine={machine} setStep={setStep} />
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