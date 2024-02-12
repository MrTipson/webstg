import type { alternatives, atom, heap_object, identifier, literal } from "../stglang/types";

export type stack_object = case_cont | thunk_update | apply_args | pending_arg;
export class case_cont {
	constructor(public alts: alternatives, public locals: Map<identifier, literal>) { }

	public toString() {
		return `case continuation:\n${this.alts}\nLocals:${this.locals}\n`;
	}
}

export class thunk_update {
	constructor(public addr: literal) { }

	public toString() {
		return `thunk update: ${this.addr}`;
	}
}

export class apply_args {
	constructor(public atoms: atom[]) { }

	public toString() {
		return `eval/apply args: ${this.atoms}`;
	}
}

export class pending_arg {
	constructor(public atom: atom) { }

	public toString() {
		return `Arg ${this.atom}`;
	}
}

export class stack {
	step: number = 0;
	i: number = 0;
	// Current state of the stack
	current: stack_object[] = [];
	// Changes for each simulated stack
	added: stack_object[][] = [];
	removed: stack_object[][] = [];
	public push(obj: stack_object): void {
		let pos = this.i++;
		this.current[pos] = obj;
		if (!this.added[this.step]) {
			this.added[this.step] = [];
		}
		this.added[this.step].push(obj);
	}
	public peek(): stack_object {
		let pos = this.i - 1;
		if (this.current[pos]) {
			return this.current[pos];
		} else {
			throw `Peek: Invalid stack address ${pos}`;
		}
	}
	public peekn(n: number): stack_object[] {
		let from = this.i - n;
		if (from < 0) from = 0;
		return this.current.splice(from, this.i).reverse();
	}
	public pop(): stack_object {
		let obj = this.current[--this.i];
		if (!obj) {
			throw `Pop: Invalid/empty stack`;
		}
		if (!this.removed[this.step]) {
			this.removed[this.step] = [];
		}
		this.removed[this.step].push(obj);
		return obj;
	}
	public find_saved_local(name: identifier): literal | undefined {
		for (let j = this.i; j >= 0; j--) {
			let el = this.current[j];
			if (el instanceof case_cont) {
				let locals = (el as case_cont).locals;
				let x = locals.get(name);
				if (x) return x;
			}
		}
		return undefined;
	}
}
