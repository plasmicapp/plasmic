import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  isPlainObjectPropType,
  StudioPropType,
} from "@/wab/shared/code-components/code-components";
import { inferPropTypeFromParam } from "@/wab/shared/component-props";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import { asCode, ExprCtx } from "@/wab/shared/core/exprs";
import { isTplComponent } from "@/wab/shared/core/tpls";
import { ComponentEvalContext } from "@/wab/shared/core/val-nodes";
import { tryEvalExpr } from "@/wab/shared/eval";
import { ChoicePropValuesLintIssue } from "@/wab/shared/linting/lint-types";
import { lintIssuesEquals } from "@/wab/shared/linting/lint-utils";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Component,
  isKnownExpr,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";
import { ChoiceObject, ChoiceOptions } from "@plasmicapp/host";
import { isNumber, isObject, isString } from "lodash";

const TYPE = "choice-prop-values";

export const lintChoicePropValues = maybeComputedFn(
  function lintChoicePropValues(site: Site, studioCtx: StudioCtx) {
    const issues: ChoicePropValuesLintIssue[] = [];

    for (const comp of site.components) {
      issues.push(...lintComponent(studioCtx, comp));
    }
    return issues;
  },

  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintChoicePropValues",
  }
);

export const valueInOptions = (
  options: ChoiceOptions | undefined,
  value: any
): boolean => {
  if (!options) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((val) => valueInOptions(options, val));
  }
  return !!options?.some((option) =>
    isString(option) || isNumber(option)
      ? option === value
      : isObject(option) && "value" in option
      ? option.value === value
      : isObject(option) && "values" in option
      ? (option.values as ChoiceObject[]).some((v) => v.value === value)
      : false
  );
};

// Retrieves options if propType is a Choice prop
export const getChoicePropOptions = (
  evalContext: Omit<ComponentEvalContext, "invalidArgs">,
  propType: StudioPropType<any>
): ChoiceOptions | undefined => {
  if (isPlainObjectPropType(propType) && propType.type === "choice") {
    const { componentPropValues, ccContextData } = evalContext;
    return getContextDependentValue(
      propType.options,
      componentPropValues,
      ccContextData,
      { path: [] }
    );
  }
  return undefined;
};

const lintComponent = maybeComputedFn(
  function lintComponent(studioCtx: StudioCtx, component: Component) {
    const issues: ChoicePropValuesLintIssue[] = [];
    const exprCtx: ExprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component: null,
      inStudio: true,
    };
    const viewCtx = studioCtx.focusedViewCtx();
    if (!viewCtx) {
      return [];
    }

    for (const tpl of flattenComponent(component)) {
      if (!isTplComponent(tpl)) {
        continue;
      }
      for (const vs of tpl.vsettings) {
        for (const arg of vs.args) {
          if (arg.param.type.name !== "choice") {
            continue;
          }
          const propType = inferPropTypeFromParam(
            studioCtx,
            viewCtx,
            tpl,
            arg.param
          );
          exprCtx.component = tpl.component;
          const expr = arg.expr;

          const evalContext = viewCtx.getComponentEvalContext(tpl, arg.param);
          const options = getChoicePropOptions(evalContext, propType);
          if (options && isKnownExpr(expr)) {
            const { val } = tryEvalExpr(asCode(expr, exprCtx).code, {});

            if (val && !valueInOptions(options, val)) {
              issues.push({
                key: makeIssueKey(tpl.component, tpl),
                type: TYPE,
                tpl,
                component,
                propName: arg.param.variable.name,
              });
              // Only show one issue per variant, since there's a
              // UI indicator next to each invalid prop
              break;
            }
          }
        }
      }
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintChoicePropValuesComponent",
  }
);

function makeIssueKey(component: Component, tpl: TplNode) {
  return `${TYPE}-${component.uuid}-${tpl.uuid}`;
}
