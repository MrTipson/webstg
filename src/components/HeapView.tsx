import { CON, FUN, PAP, THUNK, literal, type heap_object, BLACKHOLE, identifier } from '@/stglang/types';
import type { stg_machine } from '@/stgmachine/machine';
import { thunk_update } from '@/stgmachine/stack';
import Dagre from '@dagrejs/dagre';
import ReactFlow, {
	Handle,
	Position,
	ReactFlowProvider,
	Controls
} from 'reactflow';

import 'reactflow/dist/style.css';

const getLayoutedElements = (nodes: any, edges: any) => {
	const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: 'BT' });

	edges.forEach((edge) => g.setEdge(edge.source, edge.target));
	nodes.forEach((node) => g.setNode(node.id, node));

	Dagre.layout(g);

	return {
		nodes: nodes.map((node) => {
			const { x, y } = g.node(node.id);

			return { ...node, position: { x, y } };
		}),
		edges,
	};
};

const nodeTypes = {
	heapNode: HeapViewNode,
};

export default function HeapView({ className, machine, step }: { className?: string, machine: stg_machine, step: number }) {

	let edges: any[] = [];

	// Visualize nodes that are going to be/have been updated
	let topFrame = machine.s.peek();
	let updatingNode = (machine.expr instanceof literal || machine.expr instanceof identifier) && topFrame instanceof thunk_update && topFrame.addr.val || undefined;
	let removedFrames = machine.s.removed[machine.s.step - 1];
	let updatedNode = removedFrames && removedFrames[0] instanceof thunk_update && removedFrames[0].addr.val || undefined;

	let nodes = machine.h.current.map((obj, i) => {
		if (!obj) return undefined;
		let outnodes: number[] = [];
		let numVals: number = 0;
		if (obj instanceof THUNK) {
			numVals = obj.env.size;
			outnodes = [...obj.env.values()].map(x => x.val);
		} else if (obj instanceof BLACKHOLE) {
			numVals = obj.thunk.env.size;
			outnodes = [...obj.thunk.env.values()].map(x => x.val);
		} else if (obj instanceof FUN) {
			if (obj.env) {
				numVals = obj.env.size;
				outnodes = [...obj.env.values()].map(x => x.val);
			}
		} else if (obj instanceof CON || obj instanceof PAP) {
			// all atoms should be literals already, but we check anyways
			numVals = obj.atoms.length;
			outnodes = obj.atoms.filter(x => x instanceof literal && x.isAddr).map(x => (x as literal).val);
		}
		let sourceHandle = 0;
		for (let o of outnodes) {
			edges.push({
				id: `e${i}-${o}`,
				source: String(i),
				target: String(o),
				sourceHandle: String(sourceHandle++)
			});
		}
		let variant = "default";
		if (updatingNode === i) variant = "updating";
		if (updatedNode === i) variant = "updated";
		return {
			id: String(i),
			type: 'heapNode',
			data: {
				variant: variant,
				label: String(obj),
				addr: i,
				obj: obj
			},
			position: { x: 100, y: 100 },
			width: 100 + 40 * numVals,
			height: 100
		}
	}).filter(x => Boolean(x)); // When stepping back, some nodes become undefined. This filters them out
	const layouted = getLayoutedElements(nodes, edges);

	return (
		<div className='h-full relative'>
			<ReactFlowProvider>
				<ReactFlow
					nodesDraggable={true}
					nodesConnectable={false}
					nodeTypes={nodeTypes}
					nodes={layouted.nodes}
					edges={layouted.edges}
					fitView
				/>
				<Controls position='top-left' />
			</ReactFlowProvider>
		</div>
	);
}

const heapNodeVariants = {
	default: "",
	updating: " outline outline-yellow-500 outline-2",
	updated: " outline outline-green-500 outline-2"
};
function HeapViewNode({ data }: { data: { addr: number, obj: heap_object, variant: keyof typeof heapNodeVariants } }) {
	let [tag, values] = data.obj.heapInfo();

	return (
		<div className={"p-1 rounded-sm bg-primary-foreground min-w-16" + heapNodeVariants[data.variant]}>
			<div className='flex justify-around items-center'>
				<span className='m-1 font-semibold'>{tag}</span>
				{values.map((val, i) => {
					return (
						<span key={i} className='px-1 m-1 rounded-sm bg-muted relative'>
							{String(val)}
							{val.isAddr &&
								<Handle
									type="source"
									position={Position.Top}
									id={String(i)}
									style={{ background: '#555' }}
								/>
							}
						</span>
					);
				})}
			</div>
			<div className="font-semibold text-center">{`0x${data.addr.toString(16)}`}</div>
			<Handle
				type="target"
				position={Position.Bottom}
				style={{ background: '#555' }}
			/>
		</div>
	);
}