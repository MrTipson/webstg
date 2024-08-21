import type { PropsWithChildren } from "react";
import { type STGSettings } from "./Machine";
import { build_ast } from "@/stglang/ASTBuilder";
import { stg_machine } from "@/stgmachine/machine";
import React from "react";
import HeapView from "./HeapView";
import StackView from "./StackView";

const heap_slot = `<stack></stack>`;
const stack_slot = `<heap></heap>`;

export function MdMachine({ children, program, step, garbage_collection, eval_apply, collapse_indirections, bind_names }:
	PropsWithChildren & STGSettings & { program: string, step: number }) {
	const ast = build_ast(program);
	const machine = new stg_machine(ast, eval_apply = eval_apply, garbage_collection = garbage_collection);
	const settings: STGSettings = {
		garbage_collection: garbage_collection,
		eval_apply: eval_apply,
		collapse_indirections: collapse_indirections,
		bind_names: bind_names,
		run_limit: 1 // should not matter since machine isn't run
	}
	while (step > machine.step_number && machine.step());
	const str = (children as React.ReactElement).props.value;
	// Replace placeholder tags with the actual HeapView/StackView components
	let index1 = str.indexOf(heap_slot);
	let [element1, element2]: (JSX.Element | string)[] = ['', ''];
	let [len1, len2] = [0, 0];
	if (index1 !== -1) {
		element1 = <HeapView className="h-[500px]" machine={machine} step={step} settings={settings} />
		len1 = heap_slot.length;
	}
	let index2 = str.indexOf(stack_slot);
	if (index2 !== -1) {
		element2 = <StackView className="h-fit" machine={machine} />
		len2 = stack_slot.length;
	}
	if (index2 < index1) {
		[index1, index2] = [index2, index1];
		[element1, element2] = [element2, element1];
		[len1, len2] = [len2, len1];
	}
	const before = <div dangerouslySetInnerHTML={{ __html: str.substring(0, index1) }} />;
	const between = <div dangerouslySetInnerHTML={{ __html: str.substring(index1 + len1, index2) }} />;
	const after = <div dangerouslySetInnerHTML={{ __html: str.substring(index2 + len2) }} />;
	return (
		<>
			{...[before, element1, between, element2, after]}
		</>
	);
}
