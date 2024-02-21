import { stg_machine } from "@/stgmachine/machine";

export default function ExpressionView({ className, machine }: { className?: string, machine: stg_machine }) {
	return (
		<div className={className}>
			<pre className="h-full w-full"><code>{`${machine.step_number}: ${machine.expr}`}</code></pre>
		</div>
	);
}