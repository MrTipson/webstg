
import { Settings2 } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import type { STGSettings } from "@/components/Machine";
import { Input } from "@/components/ui/input";

export default function SettingsMenu({ settings, setSettings, setLoaded }: { settings: STGSettings, setSettings: Function, setLoaded: Function }) {
	function onChange(change: Partial<STGSettings>) {
		setSettings({ ...settings, ...change });
		setLoaded(false);
	}
	const current_model = settings.eval_apply ? "eval-apply" : "push-enter";

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant={"outline"} size="icon">
					<Settings2 />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<div className="grid grid-cols-[auto,75px] items-center gap-x-2 gap-y-1">
					<div className="col-span-2">
						<h3 className="text-lg font-thin">Evaluation model</h3>
						<RadioGroup defaultValue={current_model} className="ml-3 my-2" onValueChange={(val) => onChange({ eval_apply: val === "eval-apply" })}>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="push-enter" id="r-push-enter" />
								<Label htmlFor="r-push-enter">push-enter</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="eval-apply" id="r-eval-apply" />
								<Label htmlFor="r-eval-apply">eval-apply</Label>
							</div>
						</RadioGroup>
					</div>
					<Label htmlFor="garbage-collection" className="text-lg font-thin">Garbage collection</Label>
					<Switch id="garbage-collection" className="justify-self-end" checked={settings.garbage_collection} onCheckedChange={(val) => onChange({ garbage_collection: val })} />

					<Label htmlFor="collapse-indirections" className="text-lg font-thin">Collapse indirections</Label>
					<Switch id="collapse-indirections" className="justify-self-end" checked={settings.collapse_indirections} onCheckedChange={(val) => onChange({ collapse_indirections: val })} />

					<Label htmlFor="run-limit" className="text-lg font-thin">Continue step limit</Label>
					<Input id="run-limit" className="justify-self-end" defaultValue={settings.run_limit} onChange={({ target }) => Number(target.value) && onChange({ run_limit: Number(target.value) })} />
				</div>
			</PopoverContent>
		</Popover>
	);
}