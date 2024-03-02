import { CON, FUN, PAP, THUNK, literal, type heap_object, BLACKHOLE } from '@/stglang/types';
import type { stg_machine } from '@/stgmachine/machine';
import { useMemo, useState } from 'react';
import ReactFlow, {
	Handle,
	Position,
	ReactFlowProvider,
	Controls
} from 'reactflow';
import type { Node, Edge, NodeChange } from 'reactflow';

import 'reactflow/dist/style.css';

const calculatePositions = (oldPositions: { x: number, y: number }[], nodes: Node[], edges: Edge[]) => {
	return nodes.map(x => { return { x: 100, y: 100 } });
};

const nodeTypes = {
	heapNode: HeapViewNode,
};

function getObjectConnections(obj: heap_object) {
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
	return { numVals, outnodes };
}

export default function HeapView({ className, machine, step }: { className?: string, machine: stg_machine, step: number }) {
	let nodesChanged = false;
	const { edges, nodes } = useMemo(
		() => {
			nodesChanged = true;
			let edges: any[] = [];
			let nodes = machine.h.current.map((obj, i) => {
				if (!obj) return undefined;
				const { numVals, outnodes } = getObjectConnections(obj);

				outnodes.forEach((o, sourceHandle) =>
					edges.push({ id: `e${i}-${o}`, source: String(i), target: String(o), sourceHandle: String(sourceHandle++) }));

				return {
					id: String(i),
					type: 'heapNode',
					data: {
						label: String(obj),
						addr: i,
						obj: obj
					},
					width: 100 + 40 * numVals,
					height: 100
				}
			}).filter(x => Boolean(x)) as Node[]; // When stepping back, some nodes become undefined. This filters them out
			return { edges, nodes };
		},
		[step]
	);
	const [positions, setPositions] = useState<{ x: number, y: number }[]>([]);
	if (nodesChanged) {
		setPositions(calculatePositions(positions, nodes, edges));
	}

	function onNodesChanged(changes: NodeChange[]) {
		let newPositions = [...positions];
		for (let change of changes) {
			if (change.type === 'position' && change.position) {
				newPositions[Number(change.id)] = change.position;
			}
		}
		setPositions(newPositions);
	}

	const positionedNodes: any[] = nodes.map((n, i) => { return { ...n, position: positions[i] } })
	return (
		<div className='h-full relative'>
			<ReactFlowProvider>
				<ReactFlow
					nodesDraggable={true}
					nodesConnectable={false}
					onNodesChange={onNodesChanged}
					nodeTypes={nodeTypes}
					nodes={positionedNodes}
					edges={edges}
					fitView
				/>
				<Controls position='top-left' />
			</ReactFlowProvider>
		</div>
	);
}

function HeapViewNode({ data }: { data: { addr: number, obj: heap_object } }) {
	let [tag, values] = data.obj.heapInfo();

	return (
		<div className="p-1 rounded-sm bg-primary-foreground min-w-16">
			<div className='flex justify-around items-center gap'>
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