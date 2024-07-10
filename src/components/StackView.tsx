import { stg_machine } from "@/stgmachine/machine";
import { thunk_update, type stack_object, case_cont, pending_arg, apply_args } from "@/stgmachine/stack";
import { Separator } from "@/components/ui/separator";
import HelpPopover from "@/components/HelpPopover";

export default function StackView({ className, machine }: { className?: string, machine: stg_machine }) {
	return (
		<div className={className}>
			<div className="h-full w-full flex flex-col">
				<div className="flex flex-wrap gap-2 m-1 items-center">
					<h2 className="font-semibold text-xl m-3">Stack view</h2>
					<HelpPopover>
						<p className="text-muted-foreground">Stack view displays the current state of the stack.</p><br />
						<p className="text-muted-foreground">
							Most of the time it's populated with update frames (
							<span className="text-green-500">Update</span>
							<span className="px-1 m-1 rounded-sm bg-muted font-mono text-foreground">0x5</span>
							) and case continuations
							<span className="text-sm flex gap-2 items-center">
								(<span className="text-orange-500">Case continuation</span>
								<span className='flex flex-wrap items-center text-foreground'>
									<span className="text-xs">Saved locals:</span>
									<span className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono">x 5</span>
								</span>),
							</span>
							while arguments for the push-enter (
							<span className="text-blue-500">Argument</span>
							<span className="px-1 m-1 rounded-sm bg-muted font-mono text-foreground">0x10</span>
							) and eval-apply (
							<span className="text-blue-500">Arguments</span>
							<span className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono text-foreground">3</span>
							<span className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono text-foreground">2</span>
							<span className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono text-foreground">0x10</span>
							) also appear for short periods of time.
						</p>
					</HelpPopover>
				</div>
				<Separator />
				<div className="flex-grow overflow-auto text-wrap">
					<div key={-1} className="border border-secondary px-3 py-1 m-2 font-semibold text-center">
						START
					</div>
					{machine.s.current.map((x, i) => {
						return (
							<div key={i} className="border border-secondary px-3 py-1 m-2 font-semibold">
								{formatStackElement(x)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function formatStackElement(obj: stack_object) {
	switch (obj.constructor) {
		case thunk_update:
			obj = obj as thunk_update;
			return (
				<>
					<span className="text-green-500">Update</span>
					<span className="px-1 m-1 rounded-sm bg-muted font-mono">{String(obj.addr)}</span>
				</>
			);
		case case_cont:
			obj = obj as case_cont;
			return (
				<>
					<div className="text-orange-500">Case continuation</div>
					{obj.locals.size > 0 &&
						<div className='flex flex-wrap items-center'>
							<span className="text-sm">Saved locals:</span>
							{[...obj.locals.entries()].map(([k, v], i) => (
								<span key={i} className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono">{`${k} ${v}`}</span>
							))}
						</div>
					}
				</>
			);
		case pending_arg:
			obj = obj as pending_arg;
			return (
				<>
					<span className="text-blue-500">Argument</span>
					<span className="px-1 m-1 rounded-sm bg-muted font-mono">{String(obj.value)}</span>
				</>
			);
		case apply_args:
			obj = obj as apply_args;
			return (
				<div className="flex flex-wrap items-center">
					<span className="text-blue-500">Arguments</span>
					{obj.values.map((x, i) => (
						<span key={i} className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono">{String(x)}</span>
					))}
				</div>
			);
	}
}