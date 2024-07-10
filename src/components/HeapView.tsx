import { CON, FUN, PAP, THUNK, literal, type heap_object, BLACKHOLE, identifier, INDIRECTION } from '@/stglang/types';
import type { stg_machine } from '@/stgmachine/machine';
import { thunk_update } from '@/stgmachine/stack';
import Dagre from '@dagrejs/dagre';
import ReactFlow, {
	Handle,
	Position,
	ReactFlowProvider,
	Controls,
	type Node,
	type Edge
} from 'reactflow';

import 'reactflow/dist/style.css';
import { Separator } from '@/components/ui/separator';
import HelpPopover from '@/components/HelpPopover';
import type { STGSettings } from '@/components/Machine';

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
	const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: 'BT' });

	edges.forEach((edge) => g.setEdge(edge.source, edge.target));
	nodes.forEach((node) => g.setNode(node.id, {
		width: node.width || undefined,
		height: node.height || undefined
	}));

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

export default function HeapView({ className, machine, settings }: {
	className?: string,
	machine: stg_machine,
	step: number,
	settings: STGSettings
}) {
	let edges: Edge[] = [];

	// Visualize nodes that are going to be/have been updated
	let topFrame = machine.s.peek();
	let updatingNode: number | undefined = undefined;
	if (topFrame instanceof thunk_update) {
		let expr = machine.expr;
		if (expr instanceof identifier) {
			expr = machine.env.find_value(expr);
		}
		if (expr instanceof literal) {
			if (expr.isAddr && !(machine.h.get(expr) instanceof THUNK)) {
				updatingNode = topFrame.addr.val;
			}
		}
	}
	let removedFrames = machine.s.removed[machine.s.step - 1];
	let updatedNode = removedFrames && removedFrames[0] instanceof thunk_update && removedFrames[0].addr.val || undefined;
	let added = machine.h.added[machine.h.step - 1]?.map(([addr, _obj]) => addr) || [];
	let removed = machine.h.removed[machine.h.step - 1]?.map(([addr, _obj]) => addr) || [];
	let newlyAllocated = added.filter(x => !removed.includes(x));

	let nodes = machine.h.current.map<Node | undefined>((obj, i) => {
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
		} else if (obj instanceof INDIRECTION) {
			numVals = 1;
			outnodes = [obj.addr.val];
		}
		let sourceHandle = 0;
		for (let o of outnodes) {
			let outObj = machine.h.current[o];
			if (settings.collapse_indirections && outObj instanceof INDIRECTION) {
				edges.push({
					id: `e${i}-${outObj.addr.val}`,
					source: String(i),
					target: String(outObj.addr.val),
					sourceHandle: String(sourceHandle++),
					label: "Indirection",
					labelBgBorderRadius: 4,
					labelStyle: { fill: "hsl(var(--primary))" },
					labelBgPadding: [4, 2],
					labelBgStyle: { fill: "hsl(var(--muted))" }
				});
			} else {
				edges.push({
					id: `e${i}-${o}`,
					source: String(i),
					target: String(o),
					sourceHandle: String(sourceHandle++)
				});
			}
		}
		let variant = "default";
		if (updatingNode === i) variant = "updating";
		if (updatedNode === i) variant = "updated";
		if (newlyAllocated.includes(i)) variant = "allocated";
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
	}).filter<Node>((x): x is Node => Boolean(x)); // When stepping back, some nodes become undefined. This filters them out
	if (settings.collapse_indirections) {
		let globalEnv = [...machine.env.current_global.values()].map(x => x.val);
		nodes = nodes.filter(x => !(x.data.obj instanceof INDIRECTION) || globalEnv.includes(x.data.addr))
	}
	const layouted = getLayoutedElements(nodes, edges);

	return (
		<div className={className}>
			<div className="h-full flex flex-col">
				<div className='flex flex-wrap gap-2 m-1 items-center'>
					<h2 className="font-semibold text-xl m-3">Heap view</h2>
					<HelpPopover>
						<p className='text-muted-foreground'>Heap view displays all allocated objects on the heap.</p><br />
						<span className='font-semibold'>Garbage collection:</span>
						<p className='text-muted-foreground'>If garbage collection is enabled, objects with no references are deleted.</p><br />

						<span className='font-semibold'>Marked objects:</span>
						<p className='text-muted-foreground'>Some objects may be additionally marked, such as:</p>
						<ul className='list-disc list-inside text-muted-foreground'>
							<li className='my-1'>
								to-be updated object:
								<span className={"relative inline-block mx-2 px-1 rounded text-foreground" + heapNodeVariants["updating"]}>TEST</span>
							</li>
							<li className='my-1'>
								updated object:
								<span className={"relative inline-block mx-2 px-1 rounded text-foreground" + heapNodeVariants["updated"]}>TEST</span>
							</li>
							<li className='my-1'>
								newly allocated object:
								<span className={"relative inline-block px-3 rounded text-foreground" + heapNodeVariants["allocated"] + " after:text-xs after:-bottom-0.5"}>TEST</span>
							</li>
						</ul><br />

						<span className='font-semibold'>Indrections:</span>
						<p className='text-muted-foreground'>When thunks are updated, they are replaced by an indirection,
							which points to the new value (i.e. <span className='italic'>big value</span> model). For
							better clarity, indirections are collapsed by default and replaced with a tag above the connection.
						</p>
					</HelpPopover>
				</div>
				<Separator />
				<div className='flex-grow relative'>
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
			</div>
		</div>
	);
}

const heapNodeVariants = {
	default: "",
	updating: " outline outline-yellow-500 outline-2",
	updated: " outline outline-green-500 outline-2",
	allocated: " after:absolute after:content-['NEW'] after:-right-2 after:-bottom-3 after:text-yellow-400 after:font-semibold"
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