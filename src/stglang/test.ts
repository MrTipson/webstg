import { type identifier, type literal, type atom, type primop, type program, type bindings, binding, lambda_form, type expression, let_expr, letrec_expr, case_expr, application, constructor, type builtin_op, alternatives, algebraic_alt, type primitive_alt, type default_alt } from "./types"

let map_prg: program = [
	new binding("map",
		new lambda_form([], false, ["f", "xs"],
			new case_expr("xs",
				new alternatives([
					new algebraic_alt("Nil", [], new constructor("Nil", [])),
					new algebraic_alt("Cons", ["y", "ys"],
						new let_expr([
							new binding("fy",
								new lambda_form(["f", "y"], true, [], new application("f", ["y"]))),
							new binding("mfy",
								new lambda_form(["f", "ys"], true, [], new application("map", ["f", "ys"])))
						], new constructor("Cons", ["fy", "mfy"])))
				])
			)
		)
	)
];

console.log(String(map_prg));
export let map = String(map_prg);


let map1_prg: program = [
	new binding("map1",
		new lambda_form([], false, ["f"],
			new letrec_expr([
				new binding("mf",
					new lambda_form(["f", "mf"], false, ["xs"],
						new case_expr("xs",
							new alternatives([
								new algebraic_alt("Nil", [], new constructor("Nil", [])),
								new algebraic_alt("Cons", ["y", "ys"],
									new let_expr([
										new binding("fy",
											new lambda_form(["f", "y"], true, [], new application("f", ["y"]))),

										new binding("mfy",
											new lambda_form(["mf", "ys"], true, [], new application("mf", ["ys"])))
									], new constructor("Cons", ["fy", "mfy"])))
							]))
					))
			], "mf")
		)
	)
];

console.log(String(map1_prg));
export let map1 = String(map1_prg);