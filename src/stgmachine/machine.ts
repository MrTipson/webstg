import { type Rule } from "./evaluation_rules/types";
import { rules as rs_evalapply } from "./evaluation_rules/eval-apply";
import { rules as rs_pushenter } from "./evaluation_rules/push-enter";
import { rules as rs_shared } from "./evaluation_rules/shared";
import type { heap_object } from "../stglang/types";
import { heap } from "./heap";
import { stack } from "./stack";
import { enviroment } from "./enviroment";


let step = 0;
let h = new heap();
let s = new stack();
let env = new enviroment();