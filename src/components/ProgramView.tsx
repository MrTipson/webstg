import { stg_machine } from "@/stgmachine/machine";

export default function ProgramView({ className, machine }: { className?: string, machine: stg_machine }) {
	return (
		<div className={className}>
			<pre className="h-full w-full"><code>{String(machine.prog)}</code></pre>
		</div>
	);
}