import { stg_machine } from "@/stgmachine/machine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { identifier } from "@/stglang/types";
import HelpPopover from "@/components/HelpPopover";
import Timeline from "@/components/Timeline";

export default function Controls({ className, machine, step, setStep }: { className?: string, machine: stg_machine, step: number, setStep: Function }) {
	const { toast } = useToast();

	function moveTo(newStep: number) {
		try {
			while (newStep > machine.step_number && machine.step());
			while (newStep < machine.step_number && machine.step_back());
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
					<div>Step <span className="font-semibold">{machine.step_number}</span></div>
					<span className="font-semibold text-lg">Next rule: </span>
					<span className="text-muted-foreground">{explanation}</span>
					<div className="bg-muted p-1 rounded"><Latex children={definition} /></div>
				</div>
				||
				<div className="font-semibold text-lg text-center">No matching rule</div>
			}
			<div className={"flex gap-x-1 justify-center"}>
				<Button className="min-w-0" onClick={() => moveTo(step - 100)}>-100</Button>
				<Button className="min-w-0" onClick={() => moveTo(step - 10)}>-10</Button>
				<Button className="min-w-0" onClick={() => moveTo(step - 1)}>-1</Button>
				<Button className="min-w-0" onClick={() => moveTo(step + 1)}>+1</Button>
				<Button className="min-w-0" onClick={() => moveTo(step + 10)}>+10</Button>
				<Button className="min-w-0" onClick={() => moveTo(step + 100)}>+100</Button>
				<HelpPopover>
					<p>The control panel contains controls for stepping the simulation.</p><br />
					<p>It also displays the next rule which will be applied, both as a short
						description, but also as a more formal operational semantics rule.</p>
				</HelpPopover>
			</div>
			<Timeline className="m-auto w-[500px]" width={500} step={step} moveTo={moveTo} markers={[]}></Timeline>
		</div>
	);
}
