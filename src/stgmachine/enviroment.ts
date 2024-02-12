import { identifier, type literal } from "../stglang/types";
import type { stack } from "./stack";

export class enviroment {
	step: number = 0;
	current_local: Map<identifier, literal> = new Map();
	current_global: Map<identifier, literal> = new Map();
	// journaling so backwards steps are possible
	added_globals: [identifier, literal][][] = [];
	// globals cannot be removed in general
	added_locals: [identifier, literal][][] = [];
	removed_locals: [identifier, literal][][] = [];
	add_local(name: identifier, val: literal | identifier, stack: stack): void {
		let value: literal;
		if (val instanceof identifier) {
			let found = this.find_value(val as identifier, stack);
			if (!found) {
				throw "Assignment of undefined value";
			}
			value = found;
		} else {
			value = val;
		}
		if (!this.added_locals[this.step]) {
			this.added_locals[this.step] = [];
		}
		// we are replacing a local that had the same name
		this.added_locals[this.step].push([name, value]);
		if (this.current_local.has(name)) {
			if (!this.removed_locals[this.step]) {
				this.removed_locals[this.step] = [];
			}
			this.removed_locals[this.step].push([name, value]);
		}

		this.current_local.set(name, value);
	}
	replace_locals(new_locals: Map<identifier, literal>): void {
		if (!this.removed_locals[this.step]) {
			this.removed_locals[this.step] = [];
		}
		if (!this.added_locals[this.step]) {
			this.added_locals[this.step] = [];
		}
		this.removed_locals[this.step].concat([...this.current_local.entries()]);
		this.added_locals[this.step].concat([...new_locals.entries()]);
		this.current_local.clear();
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
		this.current_global.set(name, val);
		if (!this.added_globals[this.step]) {
			this.added_globals[this.step] = [];
		}
		this.added_globals[this.step].push([name, val]);
	}
	find_value(name: identifier, stack: stack): literal | undefined {
		return this.current_local.get(name) ||
			stack.find_saved_local(name) ||
			this.current_global.get(name);
	}
}
