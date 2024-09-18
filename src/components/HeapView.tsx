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

/**
 * Function for layouting our graph using Dagre
 * @param nodes Heap objects
 * @param edges Connections between heap objects
 * @returns Graph with updated positions
 */
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

type HeapViewProps = {
	readonly className?: string,
	readonly machine: stg_machine,
	readonly step: number,
	readonly settings: STGSettings,
}
/**
 * Heap view component for displaying the STG machine's heap as a graph
 * @param props.className Classes passed down from the parent
 * @param props.machine stg_machine instance of the simulator
 * @param props.settings STG machine and visualization settings
 */
export default function HeapView(props: HeapViewProps) {
	const { className, machine, settings } = props;

	// Node that is going to be updated
	const topFrame = machine.s.peek();
	let updatingNode: number | undefined = undefined;
	if (topFrame instanceof thunk_update) {
		let expr = machine.expr;
		try {
			if (expr instanceof identifier) {
				expr = machine.env.find_value(expr);
			}
		} catch { }
		if (expr instanceof literal) {
			if (expr.isAddr && !(machine.h.get(expr) instanceof THUNK)) {
				updatingNode = topFrame.addr.val;
			}
		}
	}

	// Node that has been updated
	const removedFrames = machine.s.removed[machine.s.step - 1];
	const updatedNode = removedFrames && removedFrames[0] instanceof thunk_update && removedFrames[0].addr.val || undefined;

	// Newly allocated objects
	const added = machine.h.added[machine.h.step - 1]?.map(([addr, _obj]) => addr) || [];
	const removed = machine.h.removed[machine.h.step - 1]?.map(([addr, _obj]) => addr) || [];
	const newlyAllocated = added.filter(x => !removed.includes(x));

	// Build the nodes and edges
	const edges: Edge[] = [];
	let nodes = machine.h.current.map<Node | undefined>((obj, i) => {
		if (!obj) return undefined;

		// Find references to other objects
		let outnodes: number[] = [];
		let numVals: number = 0;
		if (obj instanceof THUNK) {
			numVals = obj.env.size;
			outnodes = [...obj.env.values()].filter(x => x.isAddr).map(x => x.val);
		} else if (obj instanceof BLACKHOLE) {
			numVals = obj.thunk.env.size;
			outnodes = [...obj.thunk.env.values()].filter(x => x.isAddr).map(x => x.val);
		} else if (obj instanceof FUN) {
			if (obj.env) {
				numVals = obj.env.size;
				outnodes = [...obj.env.values()].filter(x => x.isAddr).map(x => x.val);
			}
		} else if (obj instanceof CON || obj instanceof PAP) {
			// all atoms should be literals already, but we check anyways
			numVals = obj.atoms.length;
			outnodes = obj.atoms.filter(x => x instanceof literal && x.isAddr).map(x => (x as literal).val);
		} else if (obj instanceof INDIRECTION) {
			numVals = 1;
			outnodes = [obj.addr.val];
		}

		// Use references to construct all the edges
		let sourceHandle = 0;
		for (let o of outnodes) {
			let outObj = machine.h.current[o];
			// Indirections get styled differently if collapsing is enabled
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
					labelBgStyle: { fill: "hsl(var(--muted))" },
					style: { strokeDasharray: 5 },
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

		// Apply variant if possible
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
				showBindNames: settings.bind_names,
				obj: obj
			},
			position: { x: 100, y: 100 },
			width: 100 + 40 * numVals,
			height: 100
		}
	}).filter<Node>((x): x is Node => Boolean(x)); // When stepping back, some nodes become undefined. This filters them out

	// Don't include indirections if collapsing is enabled (except global ones)
	if (settings.collapse_indirections) {
		let globalEnv = [...machine.env.current_global.values()].map(x => x.val);
		nodes = nodes.filter(x => !(x.data.obj instanceof INDIRECTION) || globalEnv.includes(x.data.addr))
	}

	const layouted = getLayoutedElements(nodes, edges);

	return (
		<div className={className}>
			<div className="h-full flex flex-col">
				<div className='flex flex-wrap gap-2 m-1 items-center'>
					<h2 className="font-semibold text-xl m-3">Heap</h2>
					<HelpPopover>
						<p className='text-muted-foreground'>Heap view displays all allocated objects on the heap.</p>

						<br />
						<span className='font-semibold'>Garbage collection:</span>
						<p className='text-muted-foreground'>If garbage collection is enabled, objects with no references are deleted.</p>

						<br />
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
						</ul>

						<br />
						<span className='font-semibold'>Indrections:</span>
						<p className='text-muted-foreground'>When thunks are updated, they are replaced by an indirection,
							which points to the new value (i.e. <span className='italic'>big value</span> model). For
							better clarity, indirections are collapsed by default and replaced with a tag above the connection.
						</p>

						<br />
						<span className='font-semibold'>Bind names:</span>
						<p className='text-muted-foreground'>Bind names can be enabled in the settings, and will appear
							above a heap object, indicating what was the name of the binding that allocated it.
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

const nodeTypes = {
	heapNode: HeapViewNode,
};
type HeapNodeData = {
	addr: number,
	obj: heap_object,
	variant: keyof typeof heapNodeVariants,
	showBindNames: boolean
}
const heapNodeVariants = {
	default: "",
	updating: " outline outline-yellow-500 outline-2",
	updated: " outline outline-green-500 outline-2",
	allocated: " after:absolute after:content-['NEW'] after:-right-2 after:-bottom-3 after:text-yellow-400 after:font-semibold"
};
/**
 * Component for displaying a heap object
 * @param props.data.addr Address of the heap object
 * @param props.data.obj The heap object itself
 * @param props.data.variant Variant of the HeapNode component
 * @param props.data.showBindNames Show bind names vizualization setting
 */
function HeapViewNode({ data }: { data: HeapNodeData }) {
	const { addr, obj, variant, showBindNames } = data;
	let [tag, values, bind_name] = obj.heapInfo();

	return (
		<div className={"p-1 rounded-sm bg-primary-foreground min-w-16" + heapNodeVariants[variant]}>
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
									style={{ background: '#555', top: "-10px" }}
								/>
							}
						</span>
					);
				})}
			</div>
			{showBindNames && <div className="font-thin text-center text-muted-foreground absolute top-0 -translate-y-full">{bind_name}</div>}
			<div className="font-semibold text-center">{`0x${addr.toString(16)}`}</div>
			<Handle
				type="target"
				position={Position.Bottom}
				style={{ background: '#555' }}
			/>
		</div>
	);
}