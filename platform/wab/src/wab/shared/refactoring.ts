import { computeDataTokenValue } from "@/wab/commons/DataToken";
import { customFunctionId } from "@/wab/shared/code-components/code-components";
import {
  jsLiteral,
  makeShortProjectId,
  toVarName,
} from "@/wab/shared/codegen/util";
import { assert, isPrefixArray, uniqueName } from "@/wab/shared/common";
import * as Exprs from "@/wab/shared/core/exprs";
import {
  findRecursiveImplicitStates,
  getStateVarName,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  extractDataTokenIdentifiersFromCode,
  isPathDataToken,
  makeDataTokenIdentifier,
  parseCode,
  parseExpr,
  renameObjectKey,
  replaceMemberExpression,
  replaceVarWithProp,
  transformDataTokensInExpr,
} from "@/wab/shared/eval/expression-parser";
import {
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  CustomCode,
  CustomFunction,
  DataToken,
  Expr,
  Interaction,
  ObjectPath,
  Param,
  Site,
  TplNode,
  isKnownCustomCode,
  isKnownFunctionExpr,
  isKnownObjectPath,
  isKnownVarRef,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import type * as ast from "estree";
import { get } from "lodash";

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
 * Returns boolean indicating whether `expr` is referencing a data token.
 */
export function isDataTokenUsedInExpr(
  token: DataToken,
  expr: Expr | null | undefined,
  projectId: string
): expr is CustomCode | ObjectPath {
  if (!expr || !Exprs.isRealCodeExprEnsuringType(expr)) {
    return false;
  }
  const tokenVarName = toVarName(token.name);

  if (isKnownObjectPath(expr)) {
    const path = expr.path;
    if (!isPathDataToken(path)) {
      return false;
    }
    const shortId = makeShortProjectId(projectId);
    const expectedIdentifier = makeDataTokenIdentifier(shortId, tokenVarName);
    return path[0] === expectedIdentifier;
  } else {
    const identifiers = extractDataTokenIdentifiersFromCode(expr.code);
    const shortId = makeShortProjectId(projectId);
    const expectedIdentifier = makeDataTokenIdentifier(shortId, tokenVarName);
    return identifiers.includes(expectedIdentifier);
  }
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
    [
      ...component.serverQueries.filter((q) => q !== query).map((q) => q.name),
      ...component.dataQueries.map((q) => q.name),
    ],
    wantedNewName,
    {
      normalize: toVarName,
    }
  );
  const newVarName = toVarName(query.name);
  const refs = Tpls.findExprsInComponent(component);
  for (const { expr } of refs) {
    renameObjectInExpr(expr, "$q", "$q", oldVarName, newVarName);
  }
}

export function renameDollarFunctions(
  expr: Expr,
  remappedFunctions: Map<CustomFunction, CustomFunction>
) {
  for (const [oldFunction, newFunction] of remappedFunctions.entries()) {
    const oldName = customFunctionId(oldFunction);
    const newName = customFunctionId(newFunction);
    renameObjectInExpr(expr, "$$", "$$", oldName, newName);
  }
}

export function renameDataTokenInExpr(
  expr: Expr,
  oldIdentifier: string,
  newIdentifier: string
) {
  if (isKnownObjectPath(expr)) {
    if (expr.path[0] === oldIdentifier) {
      expr.path[0] = newIdentifier;
    }
  } else if (isKnownCustomCode(expr)) {
    transformDataTokensInExpr(expr, (node, token, nestedProps) => {
      if (token.identifier !== oldIdentifier) {
        return;
      }
      if (node.type === "MemberExpression") {
        // $dataTokens_projId_name.a.b
        replaceMemberExpression(node, [newIdentifier, ...nestedProps]);
      } else if (node.type === "Identifier") {
        // $dataTokens_projId_name
        node.name = newIdentifier;
      }
    });
  }
}

/**
 * Renames a data token and updates all expressions that reference it.
 */
export function renameDataTokenAndFixExprs(
  projectId: string,
  site: Site,
  dataToken: DataToken,
  newName: string
) {
  const oldVarName = toVarName(dataToken.name);
  const newVarName = toVarName(newName);
  const shortId = makeShortProjectId(projectId);
  const oldIdentifier = makeDataTokenIdentifier(shortId, oldVarName);
  const newIdentifier = makeDataTokenIdentifier(shortId, newVarName);

  for (const component of site.components) {
    const refs = Tpls.findExprsInComponent(component);
    for (const { expr } of refs) {
      renameDataTokenInExpr(expr, oldIdentifier, newIdentifier);
    }
  }
}

function createAstNodeFromValue(value: any): ast.Expression {
  const literalCode = JSON.stringify(value);
  const parsed = parseCode(`(${literalCode})`);
  if (
    parsed.body.length === 1 &&
    parsed.body[0].type === "ExpressionStatement"
  ) {
    return parsed.body[0].expression;
  }
  return { type: "Literal", value: value, raw: literalCode };
}

/**
 * Flattens a data token usage by replacing the data token reference with its literal value.
 * Similar to changeTokenUsage for style tokens, but for data tokens in expressions.
 */
export function flattenDataTokenUsage(
  token: DataToken,
  exprRef: Tpls.ExprReference,
  projectId: string,
  component?: Component
) {
  const { expr } = exprRef;
  const tokenValue = computeDataTokenValue(token);
  const tokenVarName = toVarName(token.name);
  const shortId = makeShortProjectId(projectId);
  const identifier = makeDataTokenIdentifier(shortId, tokenVarName);

  if (isKnownObjectPath(expr)) {
    if (expr.path[0] === identifier) {
      const propertyPath = expr.path.slice(1);
      let resolvedValue = tokenValue;
      if (propertyPath.length > 0) {
        resolvedValue = get(tokenValue, propertyPath);
      }
      const newExpr = Exprs.customCode(jsLiteral(resolvedValue), expr.fallback);

      if (exprRef.node) {
        Tpls.replaceExprInNode(exprRef.node, expr, newExpr);
      } else if (component) {
        Tpls.replaceExprInComponent(component, expr, newExpr);
      }
    }
  } else if (isKnownCustomCode(expr)) {
    transformDataTokensInExpr(expr, (node, parsedToken) => {
      if (parsedToken.identifier === identifier) {
        const astNode = createAstNodeFromValue(tokenValue);
        if (node.type === "MemberExpression") {
          node.object = astNode;
        } else {
          Object.assign(node, astNode);
        }
      }
    });
  }
}
