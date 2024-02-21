import { type heap_object, literal } from "@/stglang/types";

export class heap {
	step: number = 0;
	i: number = 0;
	// Current state of the heap
	current: (heap_object | undefined)[] = [];
	// Changes for each simulated step
	added: [number, heap_object][][] = [];
	removed: [number, heap_object][][] = [];
	public alloc(obj: heap_object): literal {
		let addr = this.i++;
		this.current[addr] = obj;
		if (!this.added[this.step]) {
			this.added[this.step] = [];
		}
		this.added[this.step].push([addr, obj]);
		return new literal(addr, true);
	}
	public get(addr: literal): heap_object | undefined {
		if (!addr.isAddr) return undefined;
		if (this.current[addr.val]) {
			return this.current[addr.val];
		} else {
			return undefined;
		}
	}
	public set(addr: literal, obj: heap_object): void {
		if (!addr.isAddr) return;
		if (this.current[addr.val]) {
			if (!this.removed[this.step]) {
				this.removed[this.step] = [];
			}
			if (!this.added[this.step]) {
				this.added[this.step] = [];
			}
			this.removed[this.step].push([addr.val, this.current[addr.val] as heap_object]);
			this.added[this.step].push([addr.val, obj]);
		}
		this.current[addr.val] = obj;
	}
	public free(addr: literal): void {
		let obj = this.current[addr.val];
		if (!obj || !addr.isAddr) {
			throw `Free: Invalid heap address ${addr}`;
		}
		if (!this.removed[this.step]) {
			this.removed[this.step] = [];
		}
		this.removed[this.step].push([addr.val, obj]);
		this.current[addr.val] = undefined;
	}
	public back(): void {
		if (this.step <= 0) return;
		this.step--;
		//console.log("Before", this.current);
		if (this.added[this.step]) {
			for (let i = this.added[this.step].length - 1; i >= 0; i--) {
				let [addr, obj] = this.added[this.step][i];
				this.current[addr] = undefined;

				// either undefined or false is falsey
				let was_replaced = this.removed[this.step]
					?.map(([a, o]) => a)
					.includes(addr);
				if (!was_replaced && (addr === this.i - 1)) {
					this.i--;
				}
			}
			this.added[this.step] = [];
		}
		if (this.removed[this.step]) {
			for (let [addr, obj] of this.removed[this.step]) {
				this.current[addr] = obj;
			}
			this.removed[this.step] = [];
		}
	}
	public toString() {
		return this.current
			.map((x, i) => x ? `0x${i.toString(16)}: ${x}` : undefined)
			.filter(x => x)
			.join("\n");
	}
}
