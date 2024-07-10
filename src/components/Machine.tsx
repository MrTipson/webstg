import { useState } from "react";
import { stg_machine } from "@/stgmachine/machine";
import { sum_prg } from "@/stglang/test";
import ProgramView from "@/components/ProgramView";
import StackView from "@/components/StackView";
import HeapView from "@/components/HeapView";
import Controls from "@/components/Controls";
import {
	ResizableHandle as Handle,
	ResizablePanel as Panel,
	ResizablePanelGroup as PanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { useMediaQuery } from "@/hooks/use-media-query";

export type STGSettings = {
	garbage_collection: boolean,
	eval_apply: boolean,
	collapse_indirections: boolean,
	run_limit: number
}

export const default_program = sum_prg;

export default function Machine() {
	// set machine is called *only* when a new program is loaded, but will be mutated while stepping
	const [machine, setMachine] = useState<stg_machine>(() => new stg_machine(default_program, false, true));
	const [loaded, setLoaded] = useState(false);
	const [step, setStepOriginal] = useState(0);
	const [breakpoints, setBreakpoints] = useState<Map<number, number>>(new Map());
	const setStep = (newStep: number) => {
		setStepOriginal(newStep);
		const searchParams = new URLSearchParams(location.search);
		searchParams.set('step', String(newStep));
		const newUrl = `${location.pathname}?${searchParams.toString()}`;
		history.replaceState(null, '', newUrl);
	};
	const [settings, setSettings] = useState<STGSettings>({
		garbage_collection: true,
		eval_apply: false,
		collapse_indirections: true,
		run_limit: 1000
	});
	const isDesktop = useMediaQuery("(min-width: 768px)");

	if (!isDesktop) {
		return (
			<div className="h-full w-full flex flex-col">
				<PanelGroup direction="vertical">
					<Panel defaultSize={30}>
						<PanelGroup direction="horizontal">
							<Panel defaultSize={70}>
								<ProgramView machine={machine} setMachine={setMachine}
									step={step} setStep={setStep}
									loaded={loaded} setLoaded={setLoaded}
									settings={settings} setSettings={setSettings}
									breakpoints={breakpoints} setBreakpoints={setBreakpoints}
									isDesktop={isDesktop} className="h-full" />
							</Panel>
							{loaded &&
								<>
									<Handle withHandle />
									<Panel defaultSize={30}><StackView machine={machine} className="h-full" /></Panel>
								</>}
						</PanelGroup>
					</Panel>
					<Handle withHandle />
					<Panel defaultSize={60} className="flex flex-col justify-center">
						{loaded &&
							<HeapView machine={machine} className="h-full" step={step} settings={settings} />
							||
							<span className="text-center text-primary text-2xl font-bold">Load a program to begin simulation</span>
						}
					</Panel>
				</PanelGroup>
				{loaded &&
					<Controls className="bg-background p-2 border" machine={machine} step={step} setStep={setStep} breakpoints={breakpoints} settings={settings} />
				}
				<Toaster />
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col">
			<PanelGroup direction="horizontal">
				<Panel defaultSize={30}>
					<ProgramView machine={machine} setMachine={setMachine}
						step={step} setStep={setStep}
						loaded={loaded} setLoaded={setLoaded}
						settings={settings} setSettings={setSettings}
						breakpoints={breakpoints} setBreakpoints={setBreakpoints}
						isDesktop={isDesktop} className="h-full" />
				</Panel>
				<Handle withHandle />
				{loaded &&
					<>
						<Panel defaultSize={55}><HeapView machine={machine} className="h-full" step={step} settings={settings} /></Panel>
						<Handle withHandle />
						<Panel defaultSize={15}><StackView machine={machine} className="h-full" /></Panel>
						<Controls className="absolute left-0 right-0 m-auto bottom-0 bg-background z-10 p-2 w-fit rounded-t border" machine={machine} step={step} setStep={setStep} breakpoints={breakpoints} settings={settings} />
					</>
					|| // not loaded
					<>
						<Panel defaultSize={60} className="flex flex-col justify-center">
							<span className="text-center text-primary text-2xl font-bold">Load a program to begin simulation</span>
						</Panel>
					</>
				}
			</PanelGroup>
			<Toaster />
		</div>
	);
}