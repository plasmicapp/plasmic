import { computeDataTokenValue } from "@/wab/commons/DataToken";
import { ProjectId } from "@/wab/shared/ApiSchema";
import {
  jsLiteral,
  makeShortProjectId,
  toVarName,
} from "@/wab/shared/codegen/util";
import { assert, uniqueName } from "@/wab/shared/common";
import * as Exprs from "@/wab/shared/core/exprs";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import {
  findRecursiveImplicitStates,
  getStateVarName,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  extractDataTokenIdentifiersFromCode,
  findMemberChainsInCode,
  isPathDataToken,
  makeDataTokenIdentifier,
  parseCode,
  parseExpr,
  renameObjectKey,
  replaceMemberExpression,
  replaceVarWithProp,
  transformDataTokensInExpr,
} from "@/wab/shared/eval/expression-parser";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
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
  QueryRef,
  Site,
  TplNode,
  isKnownCustomCode,
  isKnownFunctionExpr,
  isKnownObjectPath,
  isKnownQueryInvalidationExpr,
  isKnownVarRef,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import type * as ast from "estree";
import { get, isString } from "lodash";

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
 * The subset of `queries` that `expr` could read. Static `$queries.<name>`, plus
 * every query for dynamic access (`$queries[someVar]`) or exprs that fail to parse.
 */
function queriesPossiblyUsedInExpr(
  queries: ComponentDataQuery[],
  expr: Expr | null | undefined
): ComponentDataQuery[] {
  if (!Exprs.isRealCodeExpr(expr)) {
    return [];
  }
  assert(
    isKnownCustomCode(expr) || isKnownObjectPath(expr),
    "Real code expression must be CustomCode or ObjectPath"
  );
  try {
    const info = parseExpr(expr);
    return info.usesUnknownDollarVarKeys.$queries
      ? queries
      : queries.filter((q) =>
          info.usedDollarVarKeys.$queries.has(toVarName(q.name))
        );
  } catch {
    return queries;
  }
}

/**
 * The other legacy queries `query`'s own op reads to build its request. A migrated
 * query runs before every legacy one, so it can never read one left behind.
 */
export function findLegacyQueriesReadByOp(
  query: ComponentDataQuery,
  queries: ComponentDataQuery[]
): ComponentDataQuery[] {
  if (!query.op) {
    return [];
  }
  const others = queries.filter((q) => q !== query);
  const found = new Set<ComponentDataQuery>();
  for (const expr of Tpls.flattenExprs(query.op)) {
    for (const q of queriesPossiblyUsedInExpr(others, expr)) {
      found.add(q);
    }
  }
  return others.filter((q) => found.has(q));
}

/**
 * Returns boolean for whether `expr` references the server query (`$q.<name>`).
 */
export function isServerQueryUsedInExpr(
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
    return info.usedDollarVarKeys.$q.has(varName);
  }
  return false;
}

/**
 * Returns boolean indicating whether `expr` is referencing a data token.
 */
export function isDataTokenUsedInExpr(
  token: DataToken,
  expr: Expr | null | undefined,
  projectId: ProjectId
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
 * Returns boolean indicating whether `expr` reads the result of
 * `interaction` via `$steps.<name>`.
 */
export function isInteractionResultUsedInExpr(
  interaction: Interaction,
  expr: Expr | null | undefined
): boolean {
  if (!expr) {
    return false;
  }
  const info = parseExpr(expr);
  const varName = toVarName(interaction.interactionName);
  return info.usedDollarVarKeys.$steps.has(varName);
}

/**
 * `ObjectPath.path` stores array indices as numbers while rewrite paths are
 * dotted strings, so `data.0.name` and `["data", 0, "name"]` are the same path.
 */
function toPathSegments(dottedPath: string): (string | number)[] {
  return dottedPath.split(".").map((segment) => {
    const asNumber = Number(segment);
    return Number.isInteger(asNumber) && String(asNumber) === segment
      ? asNumber
      : segment;
  });
}

function isPathPrefix(
  prefix: (string | number)[],
  path: (string | number)[]
): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((segment, i) => String(segment) === String(path[i]))
  );
}

/**
 * Only writes back when the rename matched, so non-renamed exprs aren't dirtied.
 */
function renameObjectInCode(
  expr: CustomCode,
  oldObject: string,
  newObject: string,
  oldVarName: string,
  newVarName: string
) {
  const oldCode = expr.code.slice(1, -1);
  const newCode = renameObjectKey(
    oldCode,
    oldObject,
    newObject,
    oldVarName,
    newVarName
  );
  if (newCode !== oldCode) {
    expr.code = `(${newCode})`;
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
    renameObjectInCode(expr, oldObject, newObject, oldVarName, newVarName);
  } else if (isKnownObjectPath(expr)) {
    const oldPath = [oldObject, ...toPathSegments(oldVarName)];
    if (isPathPrefix(oldPath, expr.path)) {
      expr.path = [
        newObject,
        ...toPathSegments(newVarName),
        ...expr.path.slice(oldPath.length),
      ];
    }
  } else if (isKnownFunctionExpr(expr) && Exprs.isRealCodeExpr(expr.bodyExpr)) {
    if (isKnownCustomCode(expr.bodyExpr)) {
      renameObjectInCode(
        expr.bodyExpr,
        oldObject,
        newObject,
        oldVarName,
        newVarName
      );
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
 * Iterate over tpl tree renaming `<varType>.<varName>` (e.g.
 * `$state.<varName>`, `$queries.<varName>`, or `$q.<varName>`) to
 * `$props.<propVarName>` in all custom code expressions.
 */
export function replaceDollarVarWithPropInCodeExprs(
  tree: TplNode,
  varType: "$state" | "$queries" | "$q",
  varName: string,
  propVarName: string
) {
  Tpls.flattenTpls(tree).forEach((node) => {
    for (const { expr } of Tpls.findExprsInNode(node)) {
      renameObjectInExpr(expr, varType, "$props", varName, propVarName);
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
    newName,
    // $steps results are keyed by toVarName(interactionName)
    { normalize: toVarName }
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
    { normalize: toVarName }
  );
  const newVarName = toVarName(query.name);
  const refs = Tpls.findExprsInComponent(component);
  for (const { expr } of refs) {
    renameObjectInExpr(expr, "$q", "$q", oldVarName, newVarName);
  }
}

/**
 * Rewrite of sub-path when replacing a legacy query reference, e.g.
 * `{ from: "data.response", to: "data.body" }`.
 */
export interface QuerySubPathRewrite {
  from: string;
  to: string;
}

export interface MigrateQueryReferencesResult {
  /** References to `$queries.<old>` the rewrite left, incl. query invalidations. */
  remainingReferences: number;
}

/**
 * Every query-invalidation expr in the site. Mutation in one component can point at a
 * query owned by another, so we walk the whole site.
 */
function findQueryInvalidationExprs(site: Site) {
  return site.components.flatMap((comp) =>
    Tpls.findExprsInComponent(comp)
      .map(({ expr }) => expr)
      .filter(isKnownQueryInvalidationExpr)
  );
}

export const findQueryInvalidationRefs = maybeComputedFn(
  function findQueryInvalidationRefs(site: Site): QueryRef[] {
    return findQueryInvalidationExprs(site).flatMap((expr) =>
      expr.invalidationQueries.filter(
        (queryRef): queryRef is QueryRef => !isString(queryRef)
      )
    );
  }
);

/**
 * Number of references that may read the legacy `query`. `$queries.<name>` in its
 * own component, dynamic access which counts towards all queries, and `invalidationRefs`.
 */
export function countQueryReferences(
  component: Component,
  queries: ComponentDataQuery[],
  invalidationRefs: QueryRef[]
): Map<ComponentDataQuery, number> {
  const counts = new Map(queries.map((q) => [q, 0]));
  for (const { expr } of Tpls.findExprsInComponent(component)) {
    for (const query of queriesPossiblyUsedInExpr(queries, expr)) {
      counts.set(query, counts.get(query)! + 1);
    }
  }
  for (const query of queries) {
    counts.set(
      query,
      counts.get(query)! +
        invalidationRefs.filter(({ ref }) => ref === query).length
    );
  }
  return counts;
}

/**
 * Updates references from `legacyQuery` (`$queries.<name>`) to (`$q.<name>`) and
 * reports whatever it could not rewrite. Query invalidations are counted as
 * remaining references, since all plasmic.fetch queries share one refresh key.
 *
 * `subPathRewrites` maps differing sub-paths of the two queries' results; the
 * most specific rewrite wins, and anything not covered keeps its sub-path.
 */
export function migrateQueryReferences(
  site: Site,
  component: Component,
  legacyQuery: ComponentDataQuery,
  serverQuery: ComponentServerQuery,
  subPathRewrites: QuerySubPathRewrite[] = []
): MigrateQueryReferencesResult {
  const oldVarName = toVarName(legacyQuery.name);
  const newVarName = toVarName(serverQuery.name);

  // Longest source path first: rewriting `foo` before `foo.data.response`
  // would leave the latter unmatched.
  const rewrites = [...subPathRewrites]
    .sort((a, b) => b.from.length - a.from.length)
    .map(({ from, to }) => ({
      from: `${oldVarName}.${from}`,
      to: `${newVarName}.${to}`,
    }));
  // The bare reference catches every sub-path no rewrite claimed.
  rewrites.push({ from: oldVarName, to: newVarName });

  const fromPaths = subPathRewrites.map(({ from }) => toPathSegments(from));

  // A reference that stops partway into a rewritten `from` path (alias, whole result
  // binding, or dynamic access) hides reads whose sub-path would need rewriting. Renaming it
  // could silently break those reads, so it's skipped and reported for manual migration.
  const hidesRewrittenSubPath = (expr: Expr): boolean => {
    // An ObjectPath here matched isQueryUsedInExpr, so it's rooted at the query.
    const subPaths = isKnownObjectPath(expr)
      ? [expr.path.slice(2)]
      : isKnownCustomCode(expr)
      ? findMemberChainsInCode(expr.code.slice(1, -1), "$queries", oldVarName)
      : [];
    return subPaths.some((subPath) =>
      fromPaths.some(
        (from) => subPath.length < from.length && isPathPrefix(subPath, from)
      )
    );
  };

  // `$queries` only resolves within its own component, so nothing else can read it.
  const legacyRefs = Tpls.findExprsInComponent(component).filter(({ expr }) => {
    try {
      return isQueryUsedInExpr(legacyQuery.name, expr);
    } catch {
      // Unparseable; the remaining-reference count below reports it.
      return false;
    }
  });
  for (const { expr } of legacyRefs) {
    if (hidesRewrittenSubPath(expr)) {
      continue;
    }
    for (const { from, to } of rewrites) {
      renameObjectInExpr(expr, "$queries", "$q", from, to);
    }
  }

  return {
    remainingReferences: countQueryReferences(
      component,
      [legacyQuery],
      findQueryInvalidationRefs(site)
    ).get(legacyQuery)!,
  };
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
  projectId: ProjectId,
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
  projectId: ProjectId,
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
