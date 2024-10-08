
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
import { useToast } from "@/components/ui/use-toast";
import type React from "react";

type SettingsMenuProps = {
	readonly settings: STGSettings,
	readonly setSettings: React.Dispatch<STGSettings>,
	readonly loaded: boolean,
	readonly setLoaded: React.Dispatch<boolean>,
}
export default function SettingsMenu(props: SettingsMenuProps) {
	const { settings, setSettings, loaded, setLoaded } = props;
	const { toast } = useToast();

	/**
	 * Helper for handling partial change in the settings
	 * @param change 
	 */
	function onChange(change: Partial<STGSettings>) {
		setSettings({ ...settings, ...change });
		if (typeof change.eval_apply === "boolean" || typeof change.garbage_collection === "boolean") {
			setLoaded(false);
			if (loaded) {
				toast({
					title: 'Machine unloaded',
					description: 'State cannot be retained when changing evaluation model or garbage collection settings.',
				});
			}
		}
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
					<Switch id="garbage-collection" className="justify-self-center" checked={settings.garbage_collection} onCheckedChange={(val) => onChange({ garbage_collection: val })} />

					<Label htmlFor="collapse-indirections" className="text-lg font-thin">Collapse indirections</Label>
					<Switch id="collapse-indirections" className="justify-self-center" checked={settings.collapse_indirections} onCheckedChange={(val) => onChange({ collapse_indirections: val })} />

					<Label htmlFor="bind-names" className="text-lg font-thin">Show bind names</Label>
					<Switch id="bind-names" className="justify-self-center" checked={settings.bind_names} onCheckedChange={(val) => onChange({ bind_names: val })} />

					<Label htmlFor="run-limit" className="text-lg font-thin">Continue step limit</Label>
					<Input id="run-limit" className="justify-self-end" defaultValue={settings.run_limit} onChange={({ target }) => Number(target.value) && onChange({ run_limit: Number(target.value) })} />
				</div>
			</PopoverContent>
		</Popover>
	);
}