import { stg_machine } from "@/stgmachine/machine";
import { thunk_update, type stack_object, case_cont, pending_arg, apply_args } from "@/stgmachine/stack";

export default function StackView({ className, machine }: { className?: string, machine: stg_machine }) {
	return (
		<div className={className}>
			<div className="h-full w-full overflow-auto text-wrap">
				{machine.s.current.map((x, i) => {
					return (
						<div key={i} className="border border-secondary px-3 py-1 m-2 font-semibold">
							{formatStackElement(x)}
						</div>
					);
				})}
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
						<>
							<span className="text-sm">Saved locals:</span>
							{[...obj.locals.entries()].map(([k, v], i) => (
								<span key={i} className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono">{`${k} ${v}`}</span>
							))}
						</>
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
				<>
					<span className="text-blue-500">Arguments</span>
					{obj.values.map((x, i) => (
						<span key={i} className="px-1 m-1 rounded-sm bg-muted text-nowrap font-mono">{String(x)}</span>
					))}
				</>
			);
	}
}