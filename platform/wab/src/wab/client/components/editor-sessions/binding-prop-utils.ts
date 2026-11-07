import {
  StudioPropType,
  isPlainObjectPropType,
} from "@/wab/shared/code-components/code-components";
import { leftZip } from "@/wab/shared/common";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import {
  Expr,
  FunctionExpr,
  isKnownFunctionExpr,
} from "@/wab/shared/model/classes";
import { ControlExtras } from "@plasmicapp/host";
export function getExtraEnvFromPropType(
  propType: StudioPropType<any>,
  componentPropValues: Record<string, any>,
  ccContextData: any,
  controlExtras: ControlExtras = { path: [] },
) {
  if (!isPlainObjectPropType(propType)) {
    return {};
  }
  if (propType.type === "function" && "argValues" in propType) {
    const argValues =
      getContextDependentValue(
        propType.argValues,
        componentPropValues,
        ccContextData,
        controlExtras,
      ) ?? [];
    return Object.fromEntries(
      leftZip(propType.argNames, argValues).map(([argName, argValue]) => [
        argName,
        argValue,
      ]),
    );
  } else if (propType.type === "exprEditor") {
    return (
      getContextDependentValue(
        propType.data,
        componentPropValues,
        ccContextData,
        controlExtras,
      ) ?? {}
    );
  } else {
    return {};
  }
}

type MaybeWrapExpr = (x: Expr | undefined | null) => Expr | undefined;
export type MaybeUnwrapExpr = (x: Expr | undefined | null) => Expr | undefined;

export function getExprTransformationBasedOnPropType(
  propType: StudioPropType<any>,
): {
  maybeWrapExpr: MaybeWrapExpr;
  maybeUnwrapExpr: MaybeUnwrapExpr;
} {
  if (isPlainObjectPropType(propType) && propType.type === "function") {
    const argNames =
      "argTypes" in propType
        ? propType.argTypes.map(({ name }) => name)
        : propType.argNames;
    return {
      maybeWrapExpr: (x: Expr | undefined | null) => {
        if (x == null) {
          return undefined;
        }
        return new FunctionExpr({
          bodyExpr: x,
          argNames,
        });
      },
      maybeUnwrapExpr: (x: Expr | undefined | null) => {
        if (x == null) {
          return undefined;
        }
        return isKnownFunctionExpr(x) ? x.bodyExpr : undefined;
      },
    };
  }
  return {
    maybeWrapExpr: (x: Expr | undefined | null) => (x == null ? undefined : x),
    maybeUnwrapExpr: (x: Expr | undefined | null) =>
      x == null ? undefined : x,
  };
}
