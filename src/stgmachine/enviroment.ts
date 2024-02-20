import { identifier, literal } from "@/stglang/types";
import type { stack } from "@/stgmachine/stack";

export class enviroment {
	step: number = 0;
	current_local: Map<string, literal> = new Map();
	current_global: Map<string, literal> = new Map();
	// journaling so backwards steps are possible
	added_globals: [string, literal][][] = [];
	// globals cannot be removed in general
	added_locals: [string, literal][][] = [];
	removed_locals: [string, literal][][] = [];
	add_local(name: identifier, val: literal | identifier): void {
		let value = val instanceof literal ? val : this.find_value(val as identifier);
		if (!this.added_locals[this.step]) {
			this.added_locals[this.step] = [];
		}
		// we are replacing a local that had the same name
		this.added_locals[this.step].push([name.name, value]);
		if (this.current_local.has(name.name)) {
			if (!this.removed_locals[this.step]) {
				this.removed_locals[this.step] = [];
			}
			this.removed_locals[this.step].push([name.name, value]);
		}

		this.current_local.set(name.name, value);
	}
	replace_locals(new_locals: Map<string, literal>): void {
		if (!this.removed_locals[this.step]) {
			this.removed_locals[this.step] = [];
		}
		if (!this.added_locals[this.step]) {
			this.added_locals[this.step] = [];
		}
		this.removed_locals[this.step].concat([...this.current_local.entries()]);
		this.added_locals[this.step].concat([...new_locals.entries()]);
		this.current_local = new Map(new_locals);
	}
	clear_locals(): void {
		if (!this.removed_locals[this.step]) {
			this.removed_locals[this.step] = [];
		}
		this.removed_locals[this.step].concat([...this.current_local.entries()]);
		this.current_local.clear();
	}
	add_global(name: identifier, val: literal): void {
		this.current_global.set(name.name, val);
		if (!this.added_globals[this.step]) {
			this.added_globals[this.step] = [];
		}
		this.added_globals[this.step].push([name.name, val]);
	}
	find_value(name: identifier): literal {
		let val = this.current_local.get(name.name) ||
			this.current_global.get(name.name);
		if (val) return val;
		throw new Error(`Identifier ${name.name} not in enviroment`);
	}
	private _toString(env: Map<String, literal>): string {
		return [...env.entries()].map(([name, lit]) => `\t${name}: ${lit}`).join("\n");
	}
	public toString() {
		return `Local:\n${this._toString(this.current_local)}\nGlobal:\n${this._toString(this.current_global)}`;
	}
}
