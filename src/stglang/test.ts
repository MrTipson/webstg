import { identifier, literal, type atom, primop, program, datatype, constructor, binding, type expression, call, builtin_op, let_expr, letrec_expr, case_expr, alternatives, algebraic_alt, default_alt, type heap_object, FUN, PAP, CON, THUNK, BLACKHOLE } from "./types"

let map_prg: program = new program([
	new datatype(new identifier("List"), [new identifier("a")], [
		new constructor(new identifier("Nil"), []),
		new constructor(new identifier("Cons"), [new identifier("a"), new constructor(new identifier("List"), [new identifier("a")])])
	]),
	new binding(new identifier("nil"), new CON(new identifier("Nil"), [])),
	new binding(new identifier("map"),
		new FUN([new identifier("f"), new identifier("xs")],
			new case_expr(new identifier("xs"), new alternatives([
				new algebraic_alt(new identifier("Nil"), [], new identifier("nil")),
				new algebraic_alt(new identifier("Cons"), [new identifier("y"), new identifier("ys")],
					new let_expr([
						new binding(new identifier("h"), new THUNK(new call(new identifier("f"), [new identifier("y")]))),
						new binding(new identifier("t"), new THUNK(new call(new identifier("map"), [new identifier("f"), new identifier("ys")]))),
						new binding(new identifier("r"), new CON(new identifier("Cons"), [new identifier("h"), new identifier("t")]))
					], new identifier("r")))
			]))))
]);

console.log(String(map_prg));
export let map = String(map_prg);


export let sum_prg: program = new program([
	new binding(new identifier("nil"), new CON(new identifier("Nil"), [])),
	new binding(new identifier("zero"), new CON(new identifier("Num"), [new literal(0)])),
	new binding(new identifier("one"), new CON(new identifier("Num"), [new literal(1)])),
	new binding(new identifier("two"), new CON(new identifier("Num"), [new literal(2)])),
	new binding(new identifier("three"), new CON(new identifier("Num"), [new literal(3)])),
	new binding(new identifier("plusInt"), new FUN([new identifier("x"), new identifier("y")],
		new case_expr(new identifier("x"), new alternatives([
			new algebraic_alt(new identifier("Num"), [new identifier("i")],
				new case_expr(new identifier("y"), new alternatives([
					new algebraic_alt(new identifier("Num"), [new identifier("j")],
						new case_expr(new builtin_op(primop.ADD, [new identifier("i"), new identifier("j")]), new alternatives([], new default_alt(new identifier("x"), new let_expr([
							new binding(new identifier("result"), new CON(new identifier("Num"), [new identifier("x")]))
						], new identifier("result"))))))
				])))
		])))),
	new binding(new identifier("foldl"), new FUN([new identifier("f"), new identifier("acc"), new identifier("list")],
		new case_expr(new identifier("list"), new alternatives([
			new algebraic_alt(new identifier("Nil"), [], new identifier("acc")),
			new algebraic_alt(new identifier("Cons"), [new identifier("h"), new identifier("t")], new let_expr([
				new binding(new identifier("newAcc"), new THUNK(new call(new identifier("f"), [new identifier("acc"), new identifier("h")])))
			], new call(new identifier("foldl"), [new identifier("f"), new identifier("newAcc"), new identifier("t")], true)))
		])))),
	new binding(new identifier("sum"), new FUN([new identifier("list")], new call(new identifier("foldl"), [new identifier("plusInt"), new identifier("zero"), new identifier("list")], true))),
	new binding(new identifier("list1"), new CON(new identifier("Cons"), [new identifier("one"), new identifier("nil")])),
	new binding(new identifier("list2"), new CON(new identifier("Cons"), [new identifier("two"), new identifier("list1")])),
	new binding(new identifier("list3"), new CON(new identifier("Cons"), [new identifier("three"), new identifier("list2")])),
	new binding(new identifier("main"), new THUNK(new call(new identifier("sum"), [new identifier("list3")], true)))
]);

console.log(String(sum_prg));
export let sum = String(sum_prg);
