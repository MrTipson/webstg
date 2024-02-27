import { identifier, literal } from "@/stglang/types";
import type { stack } from "@/stgmachine/stack";

export class enviroment {
	step: number = 0;
	current_local: Map<string, literal> = new Map();
	current_global: Map<string, literal> = new Map();
	// journaling so backwards steps are possible
	// globals should only be changed in the 0th step
	added_locals: [string, literal][][] = [];
	removed_locals: [string, literal][][] = [];
	add_local(name: identifier, val: literal | identifier): void {
		let value = val instanceof literal ? val : this.find_value(val as identifier);
		value = new literal(value.val, value.isAddr, name.from, name.to);
		if (!this.added_locals[this.step]) {
			this.added_locals[this.step] = [];
		}
		// we are replacing a local that had the same name
		this.added_locals[this.step].push([name.name, value]);
		let old_val = this.current_local.get(name.name);
		if (old_val) {
			if (!this.removed_locals[this.step]) {
				this.removed_locals[this.step] = [];
			}
			this.removed_locals[this.step].push([name.name, old_val]);
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
		this.removed_locals[this.step] = this.removed_locals[this.step].concat([...this.current_local.entries()]);
		this.added_locals[this.step] = this.added_locals[this.step].concat([...new_locals.entries()]);
		this.current_local = new Map(new_locals);
	}
	clear_locals(): void {
		if (!this.removed_locals[this.step]) {
			this.removed_locals[this.step] = [];
		}
		this.removed_locals[this.step] = this.removed_locals[this.step].concat([...this.current_local.entries()]);
		this.current_local.clear();
	}
	add_global(name: identifier, val: literal): void {
		val.from = name.from;
		val.to = name.to;
		this.current_global.set(name.name, val);
	}
	find_value(name: identifier): literal {
		let val = this.current_local.get(name.name) ||
			this.current_global.get(name.name);
		if (val) {
			val = new literal(val.val, val.isAddr, name.from, name.to);
			return val;
		}
		throw new Error(`Identifier ${name.name} not in enviroment`);
	}
	back() {
		if (this.step <= 0) return;
		this.step--;
		if (this.added_locals[this.step]) {
			for (let [k, v] of this.added_locals[this.step]) {
				this.current_local.delete(k);
			}
			this.added_locals[this.step] = [];
		}
		if (this.removed_locals[this.step]) {
			for (let [k, v] of this.removed_locals[this.step]) {
				this.current_local.set(k, v);
			}
			this.removed_locals[this.step] = [];
		}
	}
	local_entries() {
		return this.current_local.entries();
	}
	global_entries() {
		return this.current_global.entries();
	}
	private _toString(env: Map<String, literal>): string {
		return [...env.entries()].map(([name, lit]) => `\t${name}: ${lit}`).join("\n");
	}
	public toString() {
		return `Local:\n${this._toString(this.current_local)}\nGlobal:\n${this._toString(this.current_global)}`;
	}
}
