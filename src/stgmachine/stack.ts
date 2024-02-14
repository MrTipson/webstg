import type { alternatives, atom, heap_object, identifier, literal } from "../stglang/types";

export type stack_object = case_cont | thunk_update | apply_args | pending_arg;
export class case_cont {
	constructor(public alts: alternatives, public locals: Map<string, literal>) { }

	public toString() {
		return `case continuation:\n${this.alts}\nLocals:${[...this.locals.entries()].map(([name, lit]) => `\t${name}: ${lit}`).join("\n")}\n`;
	}
}

export class thunk_update {
	constructor(public addr: literal) { }

	public toString() {
		return `thunk update: ${this.addr}`;
	}
}

export class apply_args {
	constructor(public values: literal[]) { }

	public toString() {
		return `eval/apply args: ${this.values}`;
	}
}

export class pending_arg {
	constructor(public value: literal) { }

	public toString() {
		return `Arg ${this.value}`;
	}
}

export class stack {
	step: number = 0;
	// Current state of the stack
	current: stack_object[] = [];
	// Changes for each simulated stack
	added: stack_object[][] = [];
	removed: stack_object[][] = [];
	public push(obj: stack_object): void {
		this.current.push(obj);
		if (!this.added[this.step]) {
			this.added[this.step] = [];
		}
		this.added[this.step].push(obj);
		//console.log("i push", obj, this.current);
	}
	public peek(): stack_object | undefined {
		return this.current[this.current.length - 1];
	}
	public peekn(n: number): stack_object[] {
		let from = this.current.length - n;
		if (from < 0) from = 0;
		return this.current.slice(from, this.current.length).reverse();
	}
	public pop(): stack_object | undefined {
		//console.trace();
		let obj = this.current.pop();
		if (!obj) {
			return undefined;
		}
		if (!this.removed[this.step]) {
			this.removed[this.step] = [];
		}
		this.removed[this.step].push(obj);
		return obj;
	}
	public find_saved_local(name: identifier): literal | undefined {
		for (let j = this.current.length; j >= 0; j--) {
			let el = this.current[j];
			if (el instanceof case_cont) {
				let locals = (el as case_cont).locals;
				let x = locals.get(name.name);
				if (x) return x;
			}
		}
		return undefined;
	}
	public toString() {
		return this.current.join("\n");
	}
}
