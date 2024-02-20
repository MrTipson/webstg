import { stg_machine } from "../stgmachine/machine";

export default function StackView({ machine }: { machine: stg_machine }) {
	return (
		<pre><code>{String(machine.s)}</code></pre>
	);
}