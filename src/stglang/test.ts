import { identifier, literal, program, datatype, constructor, binding, call, builtin_op, let_expr, letrec_expr, case_expr, alternatives, algebraic_alt, default_alt, FUN, CON, THUNK } from "@/stglang/types";

let map_prg: program = new program([
	new datatype(new identifier("Number"), [new identifier("a")], [new constructor(new identifier("Num"), [new identifier("a")])]),
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

export let map = String(map_prg);


export let sum_prg: program = new program([
	new datatype(new identifier("Number"), [new identifier("a")], [new constructor(new identifier("Num"), [new identifier("a")])]),
	new datatype(new identifier("List"), [new identifier("a")], [
		new constructor(new identifier("Nil"), []),
		new constructor(new identifier("Cons"), [new identifier("a"), new constructor(new identifier("List"), [new identifier("a")])])
	]),
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
						new case_expr(new builtin_op("+#", [new identifier("i"), new identifier("j")]), new alternatives([], new default_alt(new identifier("x"), new let_expr([
							new binding(new identifier("result"), new CON(new identifier("Num"), [new identifier("x")]))
						], new identifier("result"))))))
				])))
		])))),
	new binding(new identifier("foldl"), new FUN([new identifier("f"), new identifier("acc"), new identifier("list")],
		new case_expr(new identifier("list"), new alternatives([
			new algebraic_alt(new identifier("Nil"), [], new identifier("acc")),
			new algebraic_alt(new identifier("Cons"), [new identifier("h"), new identifier("t")], new let_expr([
				new binding(new identifier("newAcc"), new THUNK(new call(new identifier("f"), [new identifier("acc"), new identifier("h")])))
			], new call(new identifier("foldl"), [new identifier("f"), new identifier("newAcc"), new identifier("t")])))
		])))),
	new binding(new identifier("sum"), new FUN([new identifier("list")], new call(new identifier("foldl"), [new identifier("plusInt"), new identifier("zero"), new identifier("list")]))),
	new binding(new identifier("list1"), new CON(new identifier("Cons"), [new identifier("one"), new identifier("nil")])),
	new binding(new identifier("list2"), new CON(new identifier("Cons"), [new identifier("two"), new identifier("list1")])),
	new binding(new identifier("list3"), new CON(new identifier("Cons"), [new identifier("three"), new identifier("list2")])),
	new binding(new identifier("main"), new THUNK(new call(new identifier("sum"), [new identifier("list3")])))
]);

export let sum = String(sum_prg);


export let map_pap_prg: program = new program([
	new datatype(new identifier("Number"), [new identifier("a")], [new constructor(new identifier("Num"), [new identifier("a")])]),
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
			])))),
	new binding(new identifier("times2"),
		new FUN([new identifier("x")],
			new case_expr(new identifier("x"), new alternatives([
				new algebraic_alt(new identifier("Num"), [new identifier("x")], new case_expr(
					new builtin_op("*#", [new identifier("x"), new literal(2)]),
					new alternatives([], new default_alt(new identifier("x"), new let_expr([
						new binding(new identifier("result"), new CON(new identifier("Num"), [new identifier("x")]))
					], new identifier("result"))))
				))
			])))),
	new binding(new identifier("times2list"), new THUNK(new call(new identifier("map"), [new identifier("times2")]))),
	new binding(new identifier("forcelist"), new FUN([new identifier("list")],
		new case_expr(new identifier("list"), new alternatives([
			new algebraic_alt(new identifier("Nil"), [], new identifier("nil")),
			new algebraic_alt(new identifier("Cons"), [new identifier("h"), new identifier("t")],
				new case_expr(new identifier("h"), new alternatives([], new default_alt(new identifier("x"),
					new case_expr(new call(new identifier("forcelist"), [new identifier("t")]), new alternatives([], new default_alt(new identifier("y"),
						new let_expr([
							new binding(new identifier("result"), new CON(new identifier("Cons"), [new identifier("x"), new identifier("y")]))
						], new identifier("result")))))))))
		])))),
	new binding(new identifier("main"), new THUNK(
		new let_expr([
			new binding(new identifier("one"), new CON(new identifier("Num"), [new literal(1)])),
			new binding(new identifier("two"), new CON(new identifier("Num"), [new literal(2)])),
			new binding(new identifier("three"), new CON(new identifier("Num"), [new literal(3)])),
			new binding(new identifier("list1"), new CON(new identifier("Cons"), [new identifier("one"), new identifier("nil")])),
			new binding(new identifier("list2"), new CON(new identifier("Cons"), [new identifier("two"), new identifier("list1")])),
			new binding(new identifier("list3"), new CON(new identifier("Cons"), [new identifier("three"), new identifier("list2")])),
			new binding(new identifier("list_x2"), new THUNK(new call(new identifier("times2list"), [new identifier("list3")]))),
			new binding(new identifier("list_x4"), new THUNK(new call(new identifier("times2list"), [new identifier("list_x2")])))
		], new call(new identifier("forcelist"), [new identifier("list_x4")]))
	))
]);

export let map_pap = String(map_pap_prg);

export let fib_prg: program = new program([
	new datatype(new identifier("Number"), [new identifier("a")], [new constructor(new identifier("Num"), [new identifier("a")])]),
	new datatype(new identifier("List"), [new identifier("a")], [
		new constructor(new identifier("Nil"), []),
		new constructor(new identifier("Cons"), [new identifier("a"), new constructor(new identifier("List"), [new identifier("a")])])
	]),
	new binding(new identifier("nil"), new CON(new identifier("Nil"), [])),
	new binding(new identifier("plusInt"), new FUN([new identifier("x"), new identifier("y")],
		new case_expr(new identifier("x"), new alternatives([
			new algebraic_alt(new identifier("Num"), [new identifier("i")],
				new case_expr(new identifier("y"), new alternatives([
					new algebraic_alt(new identifier("Num"), [new identifier("j")],
						new case_expr(new builtin_op("+#", [new identifier("i"), new identifier("j")]), new alternatives([], new default_alt(new identifier("x"), new let_expr([
							new binding(new identifier("result"), new CON(new identifier("Num"), [new identifier("x")]))
						], new identifier("result"))))))
				])))
		])))),
	new binding(new identifier("zipWith"), new FUN([new identifier("f"), new identifier("x"), new identifier("y")],
		new case_expr(new identifier("x"), new alternatives([
			new algebraic_alt(new identifier("Nil"), [], new identifier("nil")),
			new algebraic_alt(new identifier("Cons"), [new identifier("hx"), new identifier("tx")],
				new case_expr(new identifier("y"), new alternatives([
					new algebraic_alt(new identifier("Nil"), [], new identifier("nil")),
					new algebraic_alt(new identifier("Cons"), [new identifier("hy"), new identifier("ty")],
						new let_expr([
							new binding(new identifier("fxy"), new THUNK(new call(new identifier("f"), [new identifier("hx"), new identifier("hy")]))),
							new binding(new identifier("fxys"), new THUNK(new call(new identifier("zipWith"), [new identifier("f"), new identifier("tx"), new identifier("ty")]))),
							new binding(new identifier("zippedList"), new CON(new identifier("Cons"), [new identifier("fxy"), new identifier("fxys")]))
						], new identifier("zippedList")))
				]))
			)
		])))),
	new binding(new identifier("take"), new FUN([new identifier("n"), new identifier("list")],
		new case_expr(new builtin_op(">#", [new identifier("n"), new literal(0)]), new alternatives([
			new algebraic_alt(new identifier("False"), [], new identifier("nil")),
			new algebraic_alt(new identifier("True"), [], new case_expr(new identifier("list"), new alternatives([
				new algebraic_alt(new identifier("Nil"), [], new identifier("nil")),
				new algebraic_alt(new identifier("Cons"), [new identifier("h"), new identifier("t")],
					new case_expr(new identifier("h"), new alternatives([], new default_alt(new identifier("x"),
						new case_expr(new builtin_op("-#", [new identifier("n"), new literal(1)]), new alternatives([], new default_alt(new identifier("n"),
							new case_expr(new call(new identifier("take"), [new identifier("n"), new identifier("t")]), new alternatives([], new default_alt(new identifier("y"),
								new let_expr([
									new binding(new identifier("result"), new CON(new identifier("Cons"), [new identifier("x"), new identifier("y")]))
								], new identifier("result")))))
						)))))
					))
			])))
		])))),
	new binding(new identifier("zero"), new CON(new identifier("Num"), [new literal(0)])),
	new binding(new identifier("fib"), new THUNK(new letrec_expr([
		new binding(new identifier("fib0"), new CON(new identifier("Cons"), [new identifier("zero"), new identifier("fib1")])),
		new binding(new identifier("fib1"), new THUNK(new let_expr([
			new binding(new identifier("one"), new CON(new identifier("Num"), [new literal(1)])),
			new binding(new identifier("tmp"), new CON(new identifier("Cons"), [new identifier("one"), new identifier("fib2")]))
		], new identifier("tmp")))),
		new binding(new identifier("fib2"), new THUNK(new call(new identifier("zipWith"), [new identifier("plusInt"), new identifier("fib0"), new identifier("fib1")])))
	], new identifier("fib2")))),
	new binding(new identifier("main"), new THUNK(new call(new identifier("take"), [new literal(10), new identifier("fib")])))
]);

export let fib = String(fib_prg);
