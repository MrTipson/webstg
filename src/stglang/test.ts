import { type identifier, type literal, type atom, primop, program, datatype, constructor, binding, type expression, call, builtin_op, let_expr, letrec_expr, case_expr, alternatives, algebraic_alt, default_alt, type heap_object, FUN, PAP, CON, THUNK, BLACKHOLE } from "./types"

let map_prg: program = new program([
	new datatype("List", ["a"], [
		new constructor("Nil", []),
		new constructor("Cons", ["a", new constructor("List", ["a"])])
	]),
	new binding("nil", new CON("Nil", [])),
	new binding("map",
		new FUN(["f", "xs"],
			new case_expr("xs", new alternatives([
				new algebraic_alt("Nil", [], "nil"),
				new algebraic_alt("Cons", ["y", "ys"],
					new let_expr([
						new binding("h", new THUNK(new call("f", ["y"]))),
						new binding("t", new THUNK(new call("map", ["f", "ys"]))),
						new binding("r", new CON("Cons", ["h", "t"]))
					], "r"))
			]))))
]);

console.log(String(map_prg));
export let map = String(map_prg);


let sum_prg: program = new program([
	new binding("nil", new CON("Nil", [])),
	new binding("zero", new CON("Num", [0])),
	new binding("one", new CON("Num", [1])),
	new binding("two", new CON("Num", [2])),
	new binding("three", new CON("Num", [3])),
	new binding("plusInt", new FUN(["x", "y"],
		new case_expr("x", new alternatives([
			new algebraic_alt("Num", ["i"],
				new case_expr("y", new alternatives([
					new algebraic_alt("Num", ["j"],
						new case_expr(new builtin_op(primop.ADD, ["i", "j"]), new alternatives([], new default_alt("x", new let_expr([
							new binding("result", new CON("Num", ["x"]))
						], "result")))))
				])))
		])))),
	new binding("foldl", new FUN(["f", "acc", "list"],
		new case_expr("list", new alternatives([
			new algebraic_alt("Nil", [], "acc"),
			new algebraic_alt("Cons", ["h", "t"], new let_expr([
				new binding("newAcc", new THUNK(new call("f", ["acc", "h"])))
			], new call("foldl", ["f", "newAcc", "t"])))
		])))),
	new binding("sum", new FUN(["list"], new call("foldl", ["plusInt", "zero", "list"]))),
	new binding("list1", new CON("Cons", ["one", "nil"])),
	new binding("list2", new CON("Cons", ["two", "list1"])),
	new binding("list3", new CON("Cons", ["three", "list2"])),
	new binding("main", new THUNK(new call("sum", ["list3"])))
]);

console.log(String(sum_prg));
export let sum = String(sum_prg);