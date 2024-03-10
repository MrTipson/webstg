import { CON, FUN, PAP, THUNK, literal, type expression, call, case_eval, INDIRECTION } from "@/stglang/types";
import type { enviroment } from "@/stgmachine/enviroment";
import type { heap } from "@/stgmachine/heap";
import { case_cont, pending_arg, thunk_update, type stack, apply_args } from "@/stgmachine/stack";

export function rungc(expr: expression, env: enviroment, s: stack, h: heap) {
	let roots = [...env.current_local.values(), ...env.current_global.values()];
	let flags: boolean[] = [];

	// Some rules return expressions which should still be considered 'live'
	// Other expressions should be covered by the local/global enviroment
	if (expr instanceof literal) {
		roots.push(expr);
	} else if (expr instanceof call) {
		if (expr.f instanceof literal) {
			roots.push(expr.f);
		}
		expr.atoms
			.filter(x => x instanceof literal)
			.forEach(x => roots.push(x as literal));
	} else if (expr instanceof case_eval) {
		if (expr.val instanceof literal) roots.push(expr.val);
	}

	let stack_objs = s.peekn(s.current.length);
	for (let obj of stack_objs) {
		if (obj instanceof case_cont) {
			[...obj.locals.values()]
				.filter(x => !flags[x.val])
				.forEach(x => roots.push(x));
		} else if (obj instanceof pending_arg) {
			if (!flags[obj.value.val]) {
				roots.push(obj.value);
			}
		} else if (obj instanceof thunk_update) {
			if (!flags[obj.addr.val]) {
				roots.push(obj.addr);
			}
		} else if (obj instanceof apply_args) {
			obj.values
				.filter(x => !flags[x.val])
				.forEach(x => roots.push(x));
		}
	}

	let ref: literal | undefined;
	while (ref = roots.pop()) {
		let obj = h.get(ref);
		if (!obj) continue;
		flags[ref.val] = true;
		if (obj instanceof THUNK) {
			[...obj.env.values()]
				.filter(x => !flags[x.val])
				.forEach(x => roots.push(x));
		} else if (obj instanceof CON) {
			obj.atoms
				.filter(x => x instanceof literal && !flags[x.val])
				.forEach(x => roots.push(x as literal));
		} else if (obj instanceof PAP) {
			obj.atoms
				.filter(x => x instanceof literal && !flags[x.val])
				.forEach(x => roots.push(x as literal));
			if (!flags[obj.f.val]) roots.push(obj.f);
		} else if (obj instanceof FUN) {
			if (obj.env) {
				[...obj.env.values()]
					.filter(x => !flags[x.val])
					.forEach(x => roots.push(x));
			}
		} else if (obj instanceof INDIRECTION) {
			if (!flags[obj.addr.val]) {
				roots.push(obj.addr);
			}
		}
	}

	for (let i = 0; i < flags.length; i++) {
		if (!flags[i]) {
			let addr = new literal(i, true);
			if (h.get(addr)) {
				h.free(addr);
			}
		}
	}
}
