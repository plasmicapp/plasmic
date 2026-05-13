import type {
  ComponentServerQuery,
  CustomCode,
  CustomFunctionExpr,
} from "@/wab/shared/model/classes";

export type ServerQueryOp = CustomFunctionExpr | CustomCode;

export type ServerQueryWithOperation = ComponentServerQuery & {
  op: ServerQueryOp;
};

export function isServerQueryWithOperation(
  query: ComponentServerQuery
): query is ServerQueryWithOperation {
  return !!query.op;
}
