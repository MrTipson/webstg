import { stg_machine } from "../stgmachine/machine";

export default function HeapView({ machine }: { machine: stg_machine }) {
	return (
		<pre><code>{String(machine.h)}</code></pre>
	);
}