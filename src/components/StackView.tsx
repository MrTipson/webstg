import { stg_machine } from "@/stgmachine/machine";

export default function StackView({ className, machine }: { className?: string, machine: stg_machine }) {
	return (
		<div className={className}>
			<pre className="h-full w-full"><code>{String(machine.s)}</code></pre>
		</div>
	);
}