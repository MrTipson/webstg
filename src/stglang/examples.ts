// Looking for better options to do this
export default [
	{
		name: "Fibonacci zipWith",
		code: `data Number a = Num a
data Boolean = True | False
data List a = Nil | Cons a (List a)
nil = CON Nil
plusInt = FUN(x y -> 
	case x of {
	Num i -> case y of {
			Num j -> case  i +# j of {
						x -> let result = CON(Num x)
							in result;
					};
			};
	}
)
zipWith = FUN(f x y -> 
	case x of {
	Nil  -> nil;
	Cons hx tx -> case y of {
				Nil  -> nil;
				Cons hy ty -> let fxy = THUNK(f hx hy)
									fxys = THUNK(zipWith f tx ty)
									zippedList = CON(Cons fxy fxys)
								in zippedList;
				};
	}
)
forcen = FUN(n list -> 
	case  n ># 0 of {
	False  -> nil;
	True  -> case list of {
			Nil  -> nil;
			Cons h t -> case h of {
						x -> case  n -# 1 of {
							n -> case forcen n t of {
								y -> let result = CON(Cons x y)
									in result;
								};
							};
						};
			};
	}
)
zero = CON(Num 0)
fib = THUNK(letrec	fib0 = CON(Cons zero fib1)
					fib1 = THUNK(let one = CON(Num 1)
									tmp = CON(Cons one fib2)
								in tmp)
					fib2 = THUNK(zipWith plusInt fib0 fib1)
			in fib2)
main = THUNK(forcen 10 fib)`
	},
	{
		name: "Partial application",
		code: `data Number a = Num a
data List a = Nil | Cons a (List a)
nil = CON Nil
map = FUN(f xs ->
	case xs of {
		Nil  -> nil;
		Cons y ys -> let h = THUNK(f y)
						t = THUNK(map f ys)
						r = CON(Cons h t)
					in r;
	}
)
times2 = FUN(x -> 
	case x of {
		Num x -> case  x *# 2 of {
					x -> let result = CON(Num x)
						in result;
				};
	}
)
times2list = THUNK(map times2)
forcelist = FUN(list ->
	case list of {
		Nil  -> nil;
		Cons h t -> case h of {
					x -> case forcelist t of {
							y -> let result = CON(Cons x y)
								in result;
							};
					};
	}
)
main = THUNK(let one = CON(Num 1)
	two = CON(Num 2)
	three = CON(Num 3)
	list1 = CON(Cons one nil)
	list2 = CON(Cons two list1)
	list3 = CON(Cons three list2)
	list_x2 = THUNK(times2list list3)
	list_x4 = THUNK(times2list list_x2)
in forcelist list_x4)`
	},
	{
		name: "Sum foldl",
		code: `data Number a = Num a
data List a = Nil | Cons a (List a)
nil = CON Nil
zero = CON(Num 0)
one = CON(Num 1)
two = CON(Num 2)
three = CON(Num 3)
plusInt = FUN(x y ->
	case x of {
	Num i -> case y of {
			Num j -> case  i +# j of {
					x -> let result = CON(Num x)
							in result;
					};
			};
	}
)
foldl = FUN(f acc list -> 
	case list of {
		Nil  -> acc;
		Cons h t -> let newAcc = THUNK(f acc h)
					in foldl f newAcc t;
	}
)
sum = FUN(list -> foldl plusInt zero list)
list1 = CON(Cons one nil)
list2 = CON(Cons two list1)
list3 = CON(Cons three list2)
main = THUNK(sum list3)`
	},
	{
		name: "Too many args",
		code: `data Number a = Num a
plusN = FUN(n -> let f = FUN(a ->
	case a of {
		x -> case x +# n of {
						y -> let result = CON(Num y)
							in result;
					};
		}) in f)
main = THUNK(plusN 1 2)`
	},
	{
		name: "Primitive operator",
		code: `data Number a = Num a
main = THUNK(case 2 +# 3 of {
	x -> let result = CON(Num x)
			in result;
})`
	},
	{
		name: "Not so simple map",
		code: `data Number a = Num a
data List a = Nil | Cons a (List a)
nil = CON Nil
one = CON(Num 1)
two = CON(Num 2)
three = CON(Num 3)
plusOne = FUN(x ->
	case x of {
	Num i -> case  i +# 1 of {
					y -> let result = CON(Num y)
							in result;
					};
	}
)
list1 = CON(Cons one nil)
list2 = CON(Cons two list1)
list3 = CON(Cons three list2)
map = FUN(f xs ->
	case xs of {
			Nil -> nil;
			Cons h t -> let fh = THUNK(f h)
							ft = THUNK(map f t)
							result = CON(Cons fh ft)
						in result;
		})
last = FUN(xs ->
	case xs of {
		Cons h t -> case t of {
				Nil -> h;
				Cons h2 t2 -> last t;
		};
	})
mapped = THUNK(map plusOne list3)
main = THUNK(last mapped)`
	}
];