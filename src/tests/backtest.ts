import { stg_machine } from "@/stgmachine/machine";
import { fib_prg, sum_prg } from "@/stglang/test";

export let status: boolean = true;
export let reason: String = "OK";

let prg = fib_prg;
let a = new stg_machine(prg, false, true);
let b = new stg_machine(prg, false, true);

try {
	while (a.step()) {
		b.step();
		if (b.step()) b.step_back();
		//console.log(`======${a.step_number}=${b.step_number}==${a.h.step}=${b.h.step}======`);
		//console.log(a.h);
		//console.log(b.h);
		for (let [k, av] of a.env.current_global) {
			let bv = b.env.current_global.get(k);
			if (String(av) != String(bv)) {
				status = false;
				reason = `${a.step_number} ${b.env.step} ENV G[${k}]: ${av} != ${bv}`;
			}
		}
		if (!status) break;
		for (let [k, av] of a.env.current_local) {
			let bv = b.env.current_local.get(k);
			if (String(av) != String(bv)) {
				status = false;
				reason = `${a.step_number} ${b.env.step} ENV L[${k}]: ${av} != ${bv}`;
			}
		}
		if (!status) break;
		for (let i = 0; i < a.h.i; i++) {
			if (String(a.h.current[i]) != String(b.h.current[i])) {
				status = false;
				reason = `${a.step_number} ${b.h.step} HEAP [${i.toString(16)}] ${a.h.current[i]} != ${b.h.current[i]}`;
			}
		}
		if (!status) break;
		for (let i = 0; i < a.s.current.length; i++) {
			if (String(a.s.current[i]) != String(b.s.current[i])) {
				status = false;
				reason = `${a.step_number} ${b.s.step} STACK [${i}] ${a.s.current[i]} != ${b.s.current[i]}`;
			}
		}
		if (!status) break;
	}
} catch (e) {
	status = false;
	reason = `ERROR: ${String(e)}`
}
