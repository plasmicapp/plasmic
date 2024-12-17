import { toVarName } from "@/wab/shared/codegen/util";
import { assert, isPrefixArray, uniqueName } from "@/wab/shared/common";
import * as Exprs from "@/wab/shared/core/exprs";
import {
  findRecursiveImplicitStates,
  getStateVarName,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  parseExpr,
  renameObjectKey,
  replaceVarWithProp,
} from "@/wab/shared/eval/expression-parser";
import {
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  Expr,
  Interaction,
  isKnownCustomCode,
  isKnownFunctionExpr,
  isKnownObjectPath,
  isKnownVariantsRef,
  isKnownVarRef,
  Param,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";

/**
 * Returns boolean indicating whether `expr` is referencing `param`.
 */
export function isParamUsedInExpr(
  param: Param,
  expr: Expr | null | undefined
): boolean {
  if (Exprs.isRealCodeExpr(expr)) {
    assert(
      isKnownCustomCode(expr) || isKnownObjectPath(expr),
      "Real code expression must be CustomCode or ObjectPath"
    );
    const info = parseExpr(expr);
    const varName = toVarName(param.variable.name);
    return info.usedDollarVarKeys.$props.has(varName);
  } else if (isKnownVarRef(expr)) {
    return expr.variable === param.variable;
  } else if (isKnownVariantsRef(expr)) {
    return expr.variants.some((v) => v.parent?.param === param);
  }

  return false;
}

/**
 * Returns boolean indicating whether `expr` is referencing `query`.
 */
export function isQueryUsedInExpr(
  queryName: string,
  expr: Expr | null | undefined
) {
  if (Exprs.isRealCodeExpr(expr)) {
    assert(
      isKnownCustomCode(expr) || isKnownObjectPath(expr),
      "Real code expression must be CustomCode or ObjectPath"
    );
    const info = parseExpr(expr);
    const varName = toVarName(queryName);
    return info.usedDollarVarKeys.$queries.has(varName);
  }
  return false;
}

/**
 * Updates `expr` replacing `oldObject`.`oldVarName` with
 * `newObject`.`newVarName`.
 */
export function renameObjectInExpr(
  expr: Expr,
  oldObject: string,
  newObject: string,
  oldVarName: string,
  newVarName: string
) {
  if (isKnownCustomCode(expr) && Exprs.isRealCodeExpr(expr)) {
    expr.code = `(${renameObjectKey(
      expr.code.slice(1, -1),
      oldObject,
      newObject,
      oldVarName,
      newVarName
    )})`;
  } else if (isKnownObjectPath(expr)) {
    const oldPath = [oldObject, ...oldVarName.split(".")];
    if (isPrefixArray(oldPath, expr.path)) {
      expr.path = [
        newObject,
        ...newVarName.split("."),
        ...expr.path.slice(oldPath.length),
      ];
    }
  } else if (isKnownFunctionExpr(expr) && Exprs.isRealCodeExpr(expr.bodyExpr)) {
    if (isKnownCustomCode(expr.bodyExpr)) {
      expr.bodyExpr.code = `(${renameObjectKey(
        expr.bodyExpr.code.slice(1, -1),
        oldObject,
        newObject,
        oldVarName,
        newVarName
      )})`;
    } else if (isKnownObjectPath(expr.bodyExpr)) {
      renameObjectInExpr(
        expr.bodyExpr,
        oldObject,
        newObject,
        oldVarName,
        newVarName
      );
    }
  }
}

/**
 * Iterate over tpl tree renaming `varName` to `$props.propName` in
 * all custom code expressions.
 */
export function replaceVarWithPropInCodeExprs(
  tree: TplNode,
  varName: string,
  propName: string
) {
  Tpls.flattenTpls(tree).forEach((node) => {
    for (const { expr } of Tpls.findExprsInNode(node)) {
      if (isKnownCustomCode(expr) && Exprs.isRealCodeExpr(expr)) {
        const newCode = replaceVarWithProp(
          expr.code.slice(1, -1),
          varName,
          propName
        );
        expr.code = `(${newCode})`;
      } else if (isKnownObjectPath(expr)) {
        if (expr.path[0] === varName) {
          expr.path = ["$props", propName, ...expr.path.slice(1)];
        }
      }
    }
  });
}

/**
 * Iterate over tpl tree renaming `$queries.queryVarName` to
 * `$props.propVarName` in all custom code expressions.
 */
export function replaceQueryWithPropInCodeExprs(
  tree: TplNode,
  queryVarName: string,
  propVarName: string
) {
  Tpls.flattenTpls(tree).forEach((node) => {
    for (const { expr } of Tpls.findExprsInNode(node)) {
      renameObjectInExpr(expr, "$queries", "$props", queryVarName, propVarName);
    }
  });
}

/**
 * Iterate over tpl tree renaming `$state.varName` to
 * `$props.propVarName` in all custom code expressions.
 */
export function replaceStateWithPropInCodeExprs(
  tree: TplNode,
  stateVarName: string,
  propVarName: string
) {
  Tpls.flattenTpls(tree).forEach((node) => {
    for (const { expr } of Tpls.findExprsInNode(node)) {
      renameObjectInExpr(expr, "$state", "$props", stateVarName, propVarName);
    }
  });
}

/**
 * If `tplTreeToFixExprs` is given, only exprs in the given tpl tree will
 * be fixed.
 */
export function renameTplAndFixExprs(
  site: Site,
  tpl: Tpls.TplNamable,
  newName: string | null | undefined,
  tplTreeToFixExprs?: TplNode
) {
  const component = Tpls.tryGetTplOwnerComponent(tpl);
  const states = (component?.states || []).filter((s) => s.tplNode === tpl);

  const oldName = tpl.name;
  if (oldName === newName) {
    return;
  }

  if (!newName || !component || !states.length) {
    tpl.name = newName;
    return;
  }

  if (oldName) {
    for (const state of states) {
      const pairs = [
        { component, state },
        ...findRecursiveImplicitStates(site, state),
      ];
      for (const { state: st, component: comp } of pairs) {
        const oldStateVarName = getStateVarName(st);
        tpl.name = newName;
        const newStateVarName = getStateVarName(st);
        tpl.name = oldName;

        const stateRefs = tplTreeToFixExprs
          ? Tpls.findExprsInTree(tplTreeToFixExprs)
          : Tpls.findExprsInComponent(comp).filter(({ expr }) =>
              isStateUsedInExpr(st, expr)
            );
        for (const { expr } of stateRefs) {
          renameObjectInExpr(
            expr,
            "$state",
            "$state",
            oldStateVarName,
            newStateVarName
          );
        }
      }
    }
  }

  tpl.name = newName;
}

export function renameParamAndFixExprs(
  site: Site,
  component: Component,
  param: Param,
  newName: string
) {
  const oldName = param.variable.name;
  const oldVarName = toVarName(oldName);
  const newVarName = toVarName(newName);

  const paramRefs = Tpls.findExprsInComponent(component).filter(({ expr }) =>
    isParamUsedInExpr(param, expr)
  );
  for (const { expr } of paramRefs) {
    renameObjectInExpr(expr, "$props", "$props", oldVarName, newVarName);
  }

  const state = component.states.find(
    (s) => !s.implicitState && s.param === param
  );
  if (state) {
    const pairs = [
      { component, state },
      ...findRecursiveImplicitStates(site, state),
    ];
    for (const { state: st, component: comp } of pairs) {
      const oldStateVarName = getStateVarName(st);
      param.variable.name = newName;
      const newStateVarName = getStateVarName(st);
      param.variable.name = oldName;

      const stateRefs = Tpls.findExprsInComponent(comp).filter(({ expr }) =>
        isStateUsedInExpr(st, expr)
      );
      for (const { expr } of stateRefs) {
        renameObjectInExpr(
          expr,
          "$state",
          "$state",
          oldStateVarName,
          newStateVarName
        );
      }
    }
  }

  param.variable.name = newName;
}

export function renameInteractionAndFixExprs(
  interaction: Interaction,
  newName: string
) {
  const newUniqueName = uniqueName(
    interaction.parent.interactions
      .filter((it) => it !== interaction)
      .map((it) => it.interactionName),
    newName
  );

  const eventHandler = interaction.parent;
  const oldVarName = toVarName(interaction.interactionName);
  const newVarName = toVarName(newUniqueName);

  if (oldVarName !== newVarName) {
    const exprsInInteractions: Expr[] = [];
    eventHandler.interactions.forEach((other) => {
      exprsInInteractions.push(...Tpls.findExprsInInteraction(other));
    });
    for (const expr of exprsInInteractions) {
      renameObjectInExpr(expr, "$steps", "$steps", oldVarName, newVarName);
    }
  }
  interaction.interactionName = newUniqueName;
}

export function renameQueryAndFixExprs(
  component: Component,
  query: ComponentDataQuery,
  wantedNewName: string
) {
  const oldVarName = toVarName(query.name);
  query.name = uniqueName(
    component.dataQueries.filter((q) => q !== query).map((q) => q.name),
    wantedNewName,
    {
      normalize: toVarName,
    }
  );
  const newVarName = toVarName(query.name);
  const refs = Tpls.findExprsInComponent(component);
  for (const { expr } of refs) {
    renameObjectInExpr(expr, "$queries", "$queries", oldVarName, newVarName);
  }
}

export function renameServerQueryAndFixExprs(
  component: Component,
  query: ComponentServerQuery,
  wantedNewName: string
) {
  const oldVarName = toVarName(query.name);
  query.name = uniqueName(
    component.serverQueries.filter((q) => q !== query).map((q) => q.name),
    wantedNewName,
    {
      normalize: toVarName,
    }
  );
  const newVarName = toVarName(query.name);
  const refs = Tpls.findExprsInComponent(component);
  for (const { expr } of refs) {
    renameObjectInExpr(expr, "$queries", "$queries", oldVarName, newVarName);
  }
}
