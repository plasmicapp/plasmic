import { ensure } from "@/wab/common";
import { OperationCtx } from "@/wab/shared/site-operation/OperationCtx";

export type Operation<CtxType, ArgsType, ReturnType = void> = {
  (ctx: CtxType, args: ArgsType): ReturnType;
};

export function mkOperation<ArgsType, ReturnType = void>(
  fn: Operation<OperationCtx, ArgsType, ReturnType>
): Operation<OperationCtx, ArgsType, ReturnType> {
  ensure(fn.name, "operations must be named");
  return fn;
}
