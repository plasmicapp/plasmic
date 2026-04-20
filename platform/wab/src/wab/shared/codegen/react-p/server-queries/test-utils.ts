import { ServerQueryOp } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ComponentServerQuery,
  CustomCode,
  CustomFunction,
  CustomFunctionExpr,
  FunctionArg,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

export function mkServerQuery(name: string, op: ServerQueryOp | null) {
  return new ComponentServerQuery({
    uuid: mkShortId(),
    name,
    op,
  });
}

export function mkCustomCodeOp(codeStr: string) {
  return new CustomCode({ code: codeStr, fallback: undefined });
}

export function mkCustomFunctionExpr(
  name: string,
  params: string[] = [],
  args: Array<{ name: string; code: string }> = []
) {
  return new CustomFunctionExpr({
    func: new CustomFunction({
      namespace: "",
      importName: name,
      importPath: "",
      displayName: null,
      defaultExport: false,
      params: params.map((p) => typeFactory.arg(p, typeFactory.text())),
      isQuery: true,
      isMutation: false,
    }),
    args: args.map(
      (arg) =>
        new FunctionArg({
          uuid: mkShortId(),
          argType: typeFactory.arg(arg.name, typeFactory.text()),
          expr: customCode(arg.code),
        })
    ),
  });
}

export function mkComponentWithQueries(
  ...queries: ReturnType<typeof mkServerQuery>[]
) {
  const component = mkComponent({
    name: "TestComponent",
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
  });
  component.serverQueries = queries;
  return component;
}
