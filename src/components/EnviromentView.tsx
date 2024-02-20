import { stg_machine } from "../stgmachine/machine";

export default function EnviromentView({ machine }: { machine: stg_machine }) {
	return (
		<pre><code>{String(machine.env)}</code></pre>
	);
}