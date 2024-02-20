import { stg_machine } from "@/stgmachine/machine";

export default function HeapView({ className, machine }: { className?: string, machine: stg_machine }) {
	return (
		<div className={className}>
			<pre className="h-full w-full"><code>{String(machine.h)}</code></pre>
		</div>
	);
}