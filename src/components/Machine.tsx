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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type STGSettings = {
	garbage_collection: boolean,
	eval_apply: boolean,
	collapse_indirections: boolean,
	bind_names: boolean,
	run_limit: number
}

export const default_program = sum_prg;

export default function Machine() {
	// set machine is called *only* when a new program is loaded, but will be mutated while stepping
	const [machine, setMachine] = useState<stg_machine>(() => new stg_machine(default_program, false, true));
	const [loaded, setLoaded] = useState(false);
	const [step, setStepOriginal] = useState(0);
	const [breakpoints, setBreakpoints] = useState<Map<number, number>>(new Map());
	const [enteredThunks, setEnteredThunksOriginal] = useState<[number, number][]>(() => {
		const searchParams = new URLSearchParams(location.search);
		const thunks: [number, number][] = [];
		for (let key of searchParams.keys()) {
			if (/^e\d+$/.test(key)) {
				const step = Number(key.substring(1));
				const address = Number(searchParams.get(key));
				thunks.push([step, address]);
			}
		}
		return thunks;
	});
	const setEnteredThunks = (thunks: [number, number][]) => {
		setEnteredThunksOriginal(thunks);
		const searchParams = new URLSearchParams(location.search);
		thunks.forEach(([step, address]) => searchParams.set(`e${step}`, String(address)))
		const newUrl = `${location.pathname}?${searchParams.toString()}`;
		history.replaceState(null, '', newUrl);
	}
	const setStep = (newStep: number) => {
		setStepOriginal(newStep);
		const searchParams = new URLSearchParams(location.search);
		searchParams.set('step', String(newStep));
		const newUrl = `${location.pathname}?${searchParams.toString()}`;
		history.replaceState(null, '', newUrl);
	};
	const [settings, setSettingsOriginal] = useState<STGSettings>(() => {
		const searchParams = new URLSearchParams(location.search);
		return {
			garbage_collection: true,
			eval_apply: searchParams.has("ea") || false,
			collapse_indirections: true,
			bind_names: false,
			run_limit: 1000
		}
	});
	const setSettings = (newSettings: STGSettings) => {
		setSettingsOriginal(newSettings);
		const searchParams = new URLSearchParams(location.search);
		if (newSettings.eval_apply !== searchParams.has("ea")) {
			if (searchParams.has("ea")) {
				searchParams.delete("ea");
			} else {
				searchParams.set("ea", "");
			}
			const newUrl = `${location.pathname}?${searchParams.toString()}`;
			history.replaceState(null, '', newUrl);
		}
	};
	const isDesktop = useMediaQuery("(min-width: 768px)");

	if (!isDesktop) {
		return (
			<>
				<div className="h-full w-full flex flex-col">
					<Tabs defaultValue="program" className="flex flex-col grow relative">
						<TabsList className="w-2/3 mx-auto mt-2 flex">
							<TabsTrigger value="program" className="grow basis-0">Program</TabsTrigger>
							{loaded && <>
								<TabsTrigger value="heap" className="grow basis-0" disabled={!loaded}>Heap</TabsTrigger>
								<TabsTrigger value="stack" className="grow basis-0" disabled={!loaded}>Stack</TabsTrigger>
							</>}
						</TabsList>
						<TabsContent value="program" className="contents">
							<ProgramView machine={machine} setMachine={setMachine}
								step={step} setStep={setStep}
								loaded={loaded} setLoaded={setLoaded}
								settings={settings} setSettings={setSettings}
								breakpoints={breakpoints} setBreakpoints={setBreakpoints}
								enteredThunks={enteredThunks} setEnteredThunks={setEnteredThunks}
								isDesktop={isDesktop} className="w-full h-0 grow" />
						</TabsContent>
						<TabsContent value="heap"><HeapView machine={machine} className="absolute w-full top-12 bottom-0" step={step} settings={settings} /></TabsContent>
						<TabsContent value="stack" className="contents"><StackView machine={machine} className="w-full h-0 grow" /></TabsContent>
					</Tabs>
					{loaded &&
						<Controls className="bg-background p-2 border" machine={machine} step={step} setStep={setStep} breakpoints={breakpoints} settings={settings} isDesktop={isDesktop} enteredThunks={enteredThunks} setEnteredThunks={setEnteredThunks} />
					}
				</div>
				<Toaster />
			</>
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
						enteredThunks={enteredThunks} setEnteredThunks={setEnteredThunks}
						isDesktop={isDesktop} className="h-full" />
				</Panel>
				<Handle withHandle />
				{loaded &&
					<>
						<Panel defaultSize={55}><HeapView machine={machine} className="h-full" step={step} settings={settings} /></Panel>
						<Handle withHandle />
						<Panel defaultSize={15}><StackView machine={machine} className="h-full" /></Panel>
						<Controls className="absolute left-0 right-0 m-auto bottom-0 bg-background z-10 p-2 w-fit rounded-t border" machine={machine} step={step} setStep={setStep} breakpoints={breakpoints} settings={settings} isDesktop={isDesktop} enteredThunks={enteredThunks} setEnteredThunks={setEnteredThunks} />
					</>
					|| // not loaded
					<>
						<Panel defaultSize={70} className="flex flex-col justify-center">
							<span className="text-center text-primary text-2xl font-bold">Load a program to begin simulation</span>
						</Panel>
					</>
				}
			</PanelGroup>
			<Toaster />
		</div>
	);
}