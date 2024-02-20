import { stg_machine } from "../stgmachine/machine";

export default function ProgramView({ machine }: { machine: stg_machine }) {
	return (
		<pre><code>{String(machine.prog)}</code></pre>
	);
}