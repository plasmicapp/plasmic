import {
  CollectionExpr,
  Component,
  CompositeExpr,
  CustomCode,
  CustomFunctionExpr,
  DataSourceOpExpr,
  DataSourceTemplate,
  EventHandler,
  Expr,
  FunctionArg,
  FunctionExpr,
  GenericEventHandler,
  ImageAssetRef,
  Interaction,
  isKnownCompositeExpr,
  isKnownCustomCode,
  isKnownDataSourceOpExpr,
  isKnownEventHandler,
  isKnownExpr,
  isKnownFunctionArg,
  isKnownFunctionExpr,
  isKnownMapExpr,
  isKnownObjectPath,
  isKnownPageHref,
  isKnownQueryInvalidationExpr,
  isKnownRenderExpr,
  isKnownStyleExpr,
  isKnownStyleTokenRef,
  isKnownTemplatedString,
  isKnownTplNode,
  isKnownTplRef,
  isKnownVariantsRef,
  isKnownVarRef,
  MapExpr,
  ObjectPath,
  PageHref,
  QueryInvalidationExpr,
  RenderExpr,
  SelectorRuleSet,
  Site,
  StrongFunctionArg,
  StyleExpr,
  StyleTokenRef,
  TemplatedString,
  TplComponent,
  TplRef,
  TplTag,
  VariantsRef,
  VarRef,
  VirtualRenderExpr,
} from "@/wab/shared/model/classes";
/* eslint-disable
    no-this-before-super,
*/
import { mkTokenRef } from "@/wab/commons/StyleToken";
import {
  jsLiteral,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  assert,
  ensure,
  ensureArray,
  ensureInstance,
  hackyCast,
  maybe,
  mkShortId,
  only,
  sortBy,
  switchType,
  todo,
  tryCatchElse,
  unexpected,
  withoutNils,
} from "@/wab/shared/common";
import { cloneNameArg, cloneQueryRef } from "@/wab/shared/core/components";
import { jsonParse, JsonValue } from "@/wab/shared/core/lang";
import {
  extractEventArgsNameFromEventHandler,
  isGlobalAction,
  serializeActionArg,
  serializeActionFunction,
} from "@/wab/shared/core/states";
import { cloneRuleSet, makeStyleExprClassName } from "@/wab/shared/core/styles";
import { clone as cloneTpl, cloneType } from "@/wab/shared/core/tpls";
import {
  dataSourceTemplateToString,
  exprToDataSourceString,
  getTemplateFieldType,
  isJsonType,
  mkDataSourceTemplate,
} from "@/wab/shared/data-sources-meta/data-sources";
import { DevFlagsType, getProjectFlags } from "@/wab/shared/devflags";
import {
  getDynamicBindings,
  getDynamicSnippetsForExpr,
  getDynamicSnippetsForJsonExpr,
} from "@/wab/shared/dynamic-bindings";
import { tryEvalExpr } from "@/wab/shared/eval";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { maybeConvertToIife } from "@/wab/shared/parser-utils";
import { pageHrefPathToCode } from "@/wab/shared/utils/url-utils";
import L, { escapeRegExp, groupBy, isString, mapValues, set } from "lodash";

export interface ExprCtx {
  component: Component | null;
  projectFlags: DevFlagsType;
  inStudio: boolean | undefined;
}

export type FallbackableExpr = CustomCode | ObjectPath;

export const summarizeExpr = (expr: Expr, exprCtx: ExprCtx): string =>
  switchType(expr)
    .when(CustomCode, (customCode: CustomCode) => {
      return stripParens(customCode.code);
    })
    .when(DataSourceOpExpr, (opExpr) => `(${opExpr.opName})`)
    .when(RenderExpr, () => {
      return "(rendered elements)";
    })
    .when(VarRef, (varRef) => {
      return `(reference to variable "${varRef.variable.name}")`;
    })
    .when(ImageAssetRef, (assetRef) => {
      return `(reference to image "${assetRef.asset.name}")`;
    })
    .when(PageHref, (pageHref: PageHref) => {
      assert(pageHref.page.pageMeta, "PageHref is expected to contain a page");
      return `(link to "${pageHref.page.pageMeta.path}")`;
    })
    .when(VariantsRef, (variantsRef) => {
      return `(reference to variant(s) ${variantsRef.variants
        .map((v) => v.name)
        .join(", ")})`;
    })
    .when(ObjectPath, (objPath) => {
      return summarizePath(objPath);
    })
    .when(EventHandler, (_handler) => `(event handler)`)
    .when(FunctionArg, (fExpr) => `(function arg to ${fExpr.argType.argName})`)
    .when(MapExpr, (_expr) => `(map of exprs)`)
    .when(CollectionExpr, (_expr) => `(array of exprs)`)
    .when(StyleExpr, (_styleExpr) => `(css styles)`)
    .when(
      StyleTokenRef,
      (_expr) => `(reference to token "${_expr.token.name}")`
    )
    .when(
      TemplatedString,
      (templatedString) => `${asCode(templatedString, exprCtx).code}`
    )
    .when(FunctionExpr, (_expr) => summarizeExpr(_expr.bodyExpr, exprCtx))
    .when(
      TplRef,
      (_expr) =>
        `(reference to tpl ${
          ensureInstance(_expr.tpl, TplTag, TplComponent).name
        })`
    )
    .when(QueryInvalidationExpr, (_expr) => `(query invalidations)`)
    .when(CompositeExpr, (_expr) => `(composite value)`)
    .when(CustomFunctionExpr, (_expr) => `(custom function)`)
    .result();

// Deep copy is necessary, since with shallow copies, the user could potentially
// make a deep change to a sub-sub-expression (in an expr editor), which would
// be shared/leaked across all the clones.
export function clone<T extends Expr>(_expr: T): T;
export function clone(_expr: Expr): Expr {
  return switchType(_expr)
    .when(
      CustomCode,
      (expr: /*TWZ*/ CustomCode) =>
        new CustomCode({
          code: expr.code,
          fallback: expr.fallback ? clone(expr.fallback) : undefined,
        })
    )
    .when(
      VirtualRenderExpr,
      (expr) =>
        new VirtualRenderExpr({ tpl: expr.tpl.map((tpl) => cloneTpl(tpl)) })
    )
    .whenUnsafe(
      RenderExpr,
      (expr) => new RenderExpr({ tpl: expr.tpl.map((tpl) => cloneTpl(tpl)) })
    )
    .when(VarRef, (expr) => new VarRef({ variable: expr.variable }))
    .when(StyleTokenRef, (expr) => new StyleTokenRef({ token: expr.token }))
    .when(ImageAssetRef, (expr) => new ImageAssetRef({ asset: expr.asset }))
    .when(
      PageHref,
      (expr) =>
        new PageHref({
          page: expr.page,
          params: Object.fromEntries(
            Object.entries(expr.params).map(([k, v]) => [k, clone(v)])
          ),
          query: Object.fromEntries(
            Object.entries(expr.query).map(([k, v]) => [k, clone(v)])
          ),
          fragment: expr.fragment && clone(expr.fragment),
        })
    )
    .when(
      DataSourceOpExpr,
      (expr) =>
        new DataSourceOpExpr({
          parent: expr.parent,
          sourceId: expr.sourceId,
          opId: expr.opId,
          opName: expr.opName,
          templates: mapValues(expr.templates, (value) =>
            cloneDataSourceTemplate(value)
          ),
          cacheKey: expr.cacheKey ? clone(expr.cacheKey) : undefined,
          queryInvalidation: expr.queryInvalidation
            ? clone(expr.queryInvalidation)
            : undefined,
          roleId: expr.roleId,
        })
    )
    .when(
      VariantsRef,
      (expr) => new VariantsRef({ variants: [...expr.variants] })
    )
    .when(
      ObjectPath,
      (expr) =>
        new ObjectPath({
          path: expr.path,
          fallback: expr.fallback ? clone(expr.fallback) : undefined,
        })
    )
    .when(GenericEventHandler, (expr) => {
      const newExpr = new GenericEventHandler({
        interactions: expr.interactions.map((iexpr) => cloneInteraction(iexpr)),
        handlerType: cloneType(expr.handlerType),
      });
      newExpr.interactions.forEach(
        (interaction) => (interaction.parent = newExpr)
      );
      return newExpr;
    })
    .when(EventHandler, (expr) => {
      const newExpr = new EventHandler({
        interactions: expr.interactions.map((iexpr) => cloneInteraction(iexpr)),
      });
      newExpr.interactions.forEach(
        (interaction) => (interaction.parent = newExpr)
      );
      return newExpr;
    })
    .when(
      CollectionExpr,
      (collectionExpr) =>
        new CollectionExpr({
          exprs: collectionExpr.exprs.map((expr) =>
            expr ? clone(expr) : expr
          ),
        })
    )
    .when(
      MapExpr,
      (expr) =>
        new MapExpr({
          mapExpr: Object.fromEntries(
            Object.entries(expr.mapExpr).map(([name, expr2]) => [
              name,
              clone(expr2),
            ])
          ),
        })
    )
    .when(
      StrongFunctionArg,
      (arg) =>
        new StrongFunctionArg({
          uuid: mkShortId(),
          argType: cloneType(arg.argType),
          expr: clone(arg.expr),
        })
    )
    .when(
      FunctionArg,
      (functionArg) =>
        new FunctionArg({
          uuid: mkShortId(),
          argType: functionArg.argType,
          expr: clone(functionArg.expr),
        })
    )
    .when(
      StyleExpr,
      (expr) =>
        new StyleExpr({
          uuid: mkShortId(),
          styles: expr.styles.map(
            (sty) =>
              new SelectorRuleSet({
                selector: sty.selector,
                rs: cloneRuleSet(sty.rs),
              })
          ),
        })
    )
    .when(
      TemplatedString,
      (expr) =>
        new TemplatedString({
          text: expr.text.map((t) => (isString(t) ? t : clone(t))),
        })
    )
    .when(
      FunctionExpr,
      (expr) =>
        new FunctionExpr({
          argNames: expr.argNames.slice(),
          bodyExpr: clone(expr.bodyExpr),
        })
    )
    .when(TplRef, (expr) => new TplRef({ tpl: expr.tpl }))
    .when(
      QueryInvalidationExpr,
      (expr) =>
        new QueryInvalidationExpr({
          invalidationQueries: expr.invalidationQueries.map((v) =>
            typeof v === "string" ? v : cloneQueryRef(v)
          ),
          invalidationKeys: expr.invalidationKeys
            ? clone(expr.invalidationKeys)
            : expr.invalidationKeys,
        })
    )
    .when(
      CompositeExpr,
      (expr) =>
        new CompositeExpr({
          hostLiteral: expr.hostLiteral,
          substitutions: mapValues(expr.substitutions, (subexpr) =>
            clone(subexpr)
          ),
        })
    )
    .when(
      CustomFunctionExpr,
      (expr) =>
        new CustomFunctionExpr({
          func: expr.func,
          args: expr.args.map((arg) => clone(arg)),
        })
    )
    .result();
}

export enum InteractionConditionalMode {
  Always = "always",
  Never = "never",
  Expression = "expression",
}

function cloneInteraction(interaction: Interaction) {
  return new Interaction({
    interactionName: interaction.interactionName,
    actionName: interaction.actionName,
    condExpr: interaction.condExpr ? clone(interaction.condExpr) : null,
    conditionalMode: interaction.conditionalMode,
    args: interaction.args.map((arg) => cloneNameArg(arg)),
    parent: interaction.parent,
    uuid: mkShortId(),
  });
}

function cloneDataSourceTemplate(template: DataSourceTemplate) {
  return mkDataSourceTemplate({
    fieldType: getTemplateFieldType(template),
    value: isKnownTemplatedString(template.value)
      ? clone(template.value)
      : template.value,
    bindings: template.bindings
      ? Object.fromEntries(
          Object.entries(template.bindings).map(([k, v]) => [k, clone(v)])
        )
      : null,
  });
}

export const jsonLit = (val: any) =>
  new CustomCode({
    code: val === undefined ? "null" : jsLiteral(val),
    fallback: undefined,
  });

export function codeLit(val: JsonValue | undefined) {
  return code(val === undefined ? "undefined" : jsLiteral(val));
}

export const isCodeLitVal = (
  expr: Expr,
  val: boolean | number | string | null | undefined
) => {
  return isKnownCustomCode(expr) && expr.code === codeLit(val).code;
};

/**
 * Returns true if expr is a CustomCode with a real code (not JSON blob)
 * that should be evaluated on canvas or if it's an ObjectPath.
 */
export const isRealCodeExpr = (expr: any) =>
  (isKnownCustomCode(expr) && expr.code.startsWith("(")) ||
  isKnownObjectPath(expr);

/**
 * Same as `isRealCodeExpr` but also acts as a type guard.
 * These functions can't be combined because `isRealCodeExpr`
 * may return false for some `KnownCustomCode` instances.
 */
export const isRealCodeExprEnsuringType = (
  expr: any
): expr is CustomCode | ObjectPath => isRealCodeExpr(expr);

export const code = (_code: string, _fallback?: Expr | null) =>
  new CustomCode({ code: _code, fallback: _fallback });
export const customCode = (_code: string, _fallback?: Expr | null) =>
  new CustomCode({ code: "(" + _code + ")", fallback: _fallback });
export const renderable = (tpls) => new RenderExpr({ tpl: ensureArray(tpls) });

export function asCode(expr: Expr, exprCtx: ExprCtx) {
  return _asCode(expr, exprCtx);
}

const _asCode = maybeComputedFn(
  (_expr: Expr, exprCtx: ExprCtx): CustomCode =>
    switchType(_expr)
      .when(CustomCode, (expr) => expr)
      .when(ImageAssetRef, (expr) =>
        code(JSON.stringify(expr.asset.dataUri || ""))
      )
      .when(PageHref, (expr) => {
        return code(pageHrefPathToCode({ expr, exprCtx }));
      })
      .when(ObjectPath, (expr) =>
        code(`(${pathToString(expr.path)})`, expr.fallback)
      )
      .when(DataSourceOpExpr, (expr) =>
        code(`{
      sourceId: ${JSON.stringify(expr.sourceId)},
      opId: ${JSON.stringify(expr.opId)},
      userArgs: {
        ${Object.entries(expr.templates)
          .map(
            ([key, val]) =>
              [
                key,
                isJsonType(getTemplateFieldType(val))
                  ? getDynamicSnippetsForJsonExpr(
                      dataSourceTemplateToString(val, exprCtx)
                    )
                  : getDynamicSnippetsForExpr(
                      dataSourceTemplateToString(val, exprCtx)
                    ),
              ] as [string, string[]]
          )
          .filter(([_key, snippets]) => snippets.length > 0)
          .map(
            ([key, snippets]) =>
              `${key}: [${snippets
                .map((snippet) => `(${snippet})`)
                .join(", ")}]`
          )
          .join(", ")}
      },
      cacheKey: ${
        expr.cacheKey || expr.parent
          ? `\`${withoutNils([
              // There are different ways of invalidating a query by its key,
              // and so we build them all into the swr key. Note the context
              // here - we are inside a `` in serialized code, so string we
              // output must be valid strings between ``
              "plasmic",

              // If there's an explicit cache key specified, then embed it.
              // We wrap the expression in ${} so that it gets evaluated.
              expr.cacheKey
                ? "${" + getKeyCodeExpression(expr.cacheKey, exprCtx) + "}"
                : undefined,

              // For query from DataFetcher TplComponent, add its uuid
              expr.parent && isKnownTplNode(expr.parent.ref)
                ? expr.parent.ref.uuid
                : undefined,

              // For everything else, can be invalidated by its opId
              expr.opId,
            ]).join(".$.")}.$.\``
          : null
      },
      invalidatedKeys: ${
        expr.queryInvalidation
          ? asCode(expr.queryInvalidation, exprCtx).code
          : null
      },
      roleId: ${JSON.stringify(expr.roleId)},
    }`)
      )
      .when(VarRef, (expr) => {
        return code(`$props["${toVarName(expr.variable.name)}"]`);
      })
      .when(StyleTokenRef, (expr) => {
        return codeLit(mkTokenRef(expr.token));
      })
      .when(TemplatedString, (expr) => {
        const parts = expr.text.filter((x) => !!x && x !== "");
        if (parts.length === 1) {
          const part = parts[0];
          if (isString(part)) {
            return codeLit(part);
          } else {
            // If TemplatedString contains only a single code chip and nothing
            // else, then let TemplatedString evaluate to whatever the code chip
            // evaluates to, instead of always coercing to string
            return asCode(part, exprCtx);
          }
        } else {
          return code(
            `\`${expr.text
              .map((t) =>
                isString(t)
                  ? t
                  : `\${ ${stripParensAndMaybeConvertToIife(
                      asCode(t, exprCtx).code
                    )} }`
              )
              .join("")}\``
          );
        }
      })
      .when(VariantsRef, (expr) =>
        code(
          JSON.stringify(
            expr.variants.length === 1
              ? toVarName(expr.variants[0].name)
              : expr.variants.map((v) => toVarName(v.name))
          )
        )
      )
      .when(FunctionArg, (functionArg) => asCode(functionArg.expr, exprCtx))
      .when(CollectionExpr, (collectionExpr) =>
        code(
          `[${collectionExpr.exprs
            .map((expr) => (expr ? getRawCode(expr, exprCtx) : "undefined"))
            .join(", ")}]`
        )
      )
      .when(MapExpr, (expr) =>
        code(
          `({ ${Object.entries(expr.mapExpr)
            .map(([name, expr2]) => `${name}: ${getRawCode(expr2, exprCtx)}`)
            .join(", ")}})`
        )
      )
      .when(RenderExpr, () => todo("RenderExpr"))
      .when(EventHandler, (expr) => {
        const serializedArgs = extractEventArgsNameFromEventHandler(
          expr,
          exprCtx
        ).join(", ");

        function getInteractionCodeSnippets(interaction: Interaction) {
          const interactionLoc: InteractionLoc = {
            type: "InteractionLoc",
            actionName: interaction.actionName,
            interactionUuid: interaction.uuid,
            componentUuid: exprCtx.component?.uuid,
          };
          const mkArgLoc = (argName: string): InteractionArgLoc => ({
            ...interactionLoc,
            type: "InteractionArgLoc",
            argName,
          });
          const actionArgs = interaction.args.map(({ name, expr: argExpr }) => {
            let argCode = getRawCode(
              serializeActionArg(
                ensure(
                  exprCtx.component,
                  `Cannot serialize interaction without component`
                ),
                interaction.actionName,
                name,
                argExpr
              ),
              exprCtx
            );
            if (exprCtx.inStudio) {
              argCode = wrapInteractionArgExpr(mkArgLoc(name), argCode);
            }
            return `${toJsIdentifier(name)}: ${argCode}`;
          });
          const condExpr =
            interaction.condExpr &&
            interaction.conditionalMode ===
              InteractionConditionalMode.Expression
              ? getRawCode(interaction.condExpr, exprCtx)
              : interaction.conditionalMode === InteractionConditionalMode.Never
              ? `false`
              : `true`;
          // We take care to wrap each of the arguments separately from wrapping the main body function,
          // or else we'll have nested wrapping.

          let performActionCode = `(${serializeActionFunction(
            interaction
          )})?.apply(null, [${
            !isGlobalAction(interaction) ? "actionArgs" : "...actionArgs.args"
          }])`;
          if (exprCtx.inStudio) {
            performActionCode = wrapInteractionBodyExpr(
              interactionLoc,
              performActionCode,
              `actionArgs`
            );
          }

          const bodyCode = `(() => {
          const actionArgs = {${actionArgs}};
          return ${performActionCode};
        })()`;
          return { interactionLoc, condExpr, bodyCode };
        }

        return code(`async (${serializedArgs}) => {
        ${
          exprCtx.inStudio
            ? `globalThis.__PLASMIC_CACHE_EVENT_ARGS(${expr.uid}, ${serializedArgs})`
            : ""
        }
        const $steps = {};
        ${expr.interactions
          .map((interaction) => {
            const { interactionLoc, condExpr, bodyCode } =
              getInteractionCodeSnippets(interaction);
            const interactionName = toVarName(interaction.interactionName);
            let awaitableCode = `($steps["${interactionName}"])`;
            if (exprCtx.inStudio) {
              awaitableCode = wrapInteractionBodyPromise(
                interactionLoc,
                awaitableCode
              );
            }
            return `
            ${exprCtx.inStudio ? `// step-begin: ${interaction.uuid}` : ""}
            $steps["${interactionName}"] = ${condExpr} ? ${bodyCode} : undefined;
            if (
              $steps["${interactionName}"] != null &&
              typeof $steps["${interactionName}"] === "object" &&
              typeof $steps["${interactionName}"].then === "function"
            ) {
              $steps["${interactionName}"] = await ${awaitableCode};
            }
            ${
              exprCtx.inStudio
                ? `globalThis.__PLASMIC_CACHE_$STEP_VALUE("${interactionLoc.interactionUuid}", $steps["${interactionName}"])`
                : ""
            }
            ${exprCtx.inStudio ? `// step-end: ${interaction.uuid}` : ""}
            `;
          })
          .join("\n")}
      }`);
      })
      .when(StyleExpr, (expr) =>
        code(JSON.stringify(makeStyleExprClassName(expr)))
      )
      .when(FunctionExpr, (expr) => {
        // Put bodyExpr in a separated line to avoid the case where the last line of the bodyExpr is a comment
        // which would make the closing curly brace part of the comment and functionCode invalid even though
        // bodyExpr is valid
        const functionCode = `(${expr.argNames.join(", ")}) => {
          return (
            ${stripParensAndMaybeConvertToIife(
              asCode(expr.bodyExpr, exprCtx).code
            )}
          );
      }`;
        return code(functionCode);
      })
      .when(TplRef, () => unexpected(`Cannot convert TplRef to code`))
      .when(QueryInvalidationExpr, (expr) =>
        code(
          `[${withoutNils(
            expr.invalidationQueries.map((query) =>
              // explicit query cache key
              isString(query)
                ? jsLiteral(query)
                : // DataFetcher TplComponent invalidated by uuid
                isKnownTplNode(query.ref)
                ? jsLiteral(query.ref.uuid)
                : // Else invalidated by query op id
                query.ref.op
                ? jsLiteral(query.ref.op.opId)
                : undefined
            )
          ).join(",")}]${
            expr.invalidationKeys
              ? `.concat(${getCodeExpressionWithFallback(
                  expr.invalidationKeys,
                  exprCtx
                )})`
              : ""
          }`
        )
      )
      .when(CompositeExpr, (expr) => {
        // We hope there are no collisions with the symbol "__composite"!
        return code(
          `
((() => {
  const __composite = (${expr.hostLiteral});
  ${Object.entries(expr.substitutions)
    .map(
      ([path, subexpr]) =>
        `__composite${path
          .split(".")
          .map((key) => `[${JSON.stringify(key)}]`)
          .join("")} = (${asCode(subexpr, exprCtx).code});`
    )
    .join("\n")}
  return __composite;
})())
  `.trim()
        );
      })
      .when(CustomFunctionExpr, (expr) => {
        const { func, args } = expr;
        const argsMap = groupBy(args, (arg) => arg.argType.argName);
        const orderedArgs =
          func.params.map((param) => {
            if (argsMap[param.argName]) {
              return getRawCode(argsMap[param.argName][0].expr, exprCtx);
            }
            return undefined;
          }) ?? [];
        return code(
          `$$${expr.func.namespace ? `.${expr.func.namespace}` : ""}.${
            expr.func.importName
          }(${orderedArgs.join(",")})`
        );
      })
      .result()
);

export const isFallbackSet = (expr: Expr): expr is CustomCode | ObjectPath =>
  (isKnownCustomCode(expr) || isKnownObjectPath(expr)) && expr.fallback != null;

/**
 * Exactly the same as tryExtractJson. Probably should remove this after
 * checking the intentions of the call sites.
 *
 * @deprecated
 */
export const tryExtractLit = (expr: Expr) => tryExtractJson(expr);

export function tryExtractJson(_expr: Expr): JsonValue | undefined {
  return switchType(_expr)
    .when(CustomCode, (expr): JsonValue | undefined =>
      tryCatchElse({
        try: () => jsonParse(expr.code),
        catch: () => undefined,
      })
    )
    .when(TemplatedString, (expr): string | undefined =>
      expr.text.length === 1 && isString(expr.text[0])
        ? expr.text[0]
        : undefined
    )
    .elseUnsafe(() => undefined);
}

export function isDynamicExpr(expr: Expr) {
  return switchType(expr)
    .when(CustomCode, (code_) => code_.code.startsWith("("))
    .when(ObjectPath, () => true)
    .when(TemplatedString, (templatedString) =>
      hasDynamicParts(templatedString)
    )
    .elseUnsafe(() => false);
}

export function hasDynamicParts(text: TemplatedString) {
  return !text.text.every((part) => typeof part === "string");
}

/**
 * Returns numbers and strings as strings, undefined for everything else.
 */
export function tryExtractString(expr: Expr): string | undefined {
  return maybe(tryExtractJson(expr), (v) =>
    L.isString(v) ? v : L.isNumber(v) ? "" + v : undefined
  );
}

export function tryCoerceString(expr: Expr | string): string | undefined {
  return isString(expr) ? expr : tryExtractString(expr);
}

/** Returns booleans, undefined for everything else. */
export function tryExtractBoolean(expr: Expr): boolean | undefined {
  return maybe(tryExtractJson(expr), (v) => (L.isBoolean(v) ? v : undefined));
}

export function stripParens(text: string) {
  return text.replace(/^\((([\S\s])*)\)$/g, "$1");
}

export function stripParensAndMaybeConvertToIife(
  text: string,
  opts?: { addParens?: boolean }
): string {
  if (!text.startsWith("(")) {
    return text;
  }
  const result = maybeConvertToIife(stripParens(text));
  return opts?.addParens ? `(${result})` : result;
}

export function extractReferencedParam(component: Component, expr: Expr) {
  if (!isKnownVarRef(expr)) {
    return undefined;
  }
  for (const param of component.params) {
    if (param.variable === expr.variable) {
      return param;
    }
  }
  return undefined;
}

/**
 * Returns the string that represents the custom code expression with
 *  a conditional operator generated from the fallback value.
 */
export function getCodeExpressionWithFallback(
  expr: CustomCode | ObjectPath,
  exprCtx: ExprCtx,
  opts?: { fallbackSerializer?: (fallback: Expr) => string }
): string {
  let codeExpr = isKnownCustomCode(expr) ? expr.code : pathToString(expr.path);
  codeExpr = isEmptyCodeExpr(codeExpr) ? "(undefined)" : codeExpr;
  if (!isRealCodeExpr(expr)) {
    return codeExpr;
  } else if (L.isNil(expr.fallback)) {
    return `(
      ${stripParensAndMaybeConvertToIife(codeExpr)}
    )`;
  } else {
    const fallbackCode = opts?.fallbackSerializer
      ? opts.fallbackSerializer(expr.fallback)
      : asCode(expr.fallback, exprCtx).code;
    return getCodeExpressionWithFallbackExpr(codeExpr, fallbackCode, exprCtx);
  }
}

export function getRawCode(
  expr: Expr,
  exprCtx: ExprCtx,
  opts?: { fallbackSerializer?: (fallback: Expr) => string }
) {
  return getCodeExpressionWithFallback(
    toFallbackableExpr(expr, exprCtx),
    exprCtx,
    opts
  );
}

export function isFallbackableExpr(expr: Expr): expr is FallbackableExpr {
  return isKnownCustomCode(expr) || isKnownObjectPath(expr);
}

function toFallbackableExpr(expr: Expr, exprCtx: ExprCtx) {
  if (isFallbackableExpr(expr)) {
    return expr;
  } else {
    return asCode(expr, exprCtx);
  }
}

export interface InteractionLoc {
  type: "InteractionLoc";
  actionName: string;
  interactionUuid: string;
  componentUuid?: string;
}

export interface InteractionArgLoc extends Omit<InteractionLoc, "type"> {
  type: "InteractionArgLoc";
  argName: string;
}

export function isInteractionLoc(
  loc: InteractionLoc | InteractionArgLoc
): loc is InteractionLoc {
  return loc.type === "InteractionLoc";
}

function wrapInteractionArgExpr(argLoc: InteractionArgLoc, expr: string) {
  return `__wrapUserFunction(${JSON.stringify(argLoc)}, () => (${expr}))`;
}

function wrapInteractionBodyExpr(
  interactionLoc: InteractionLoc,
  fn: string,
  serializedArgs: string
) {
  return `__wrapUserFunction(${JSON.stringify(
    interactionLoc
  )}, () => (${fn}), ${serializedArgs})`;
}

function wrapInteractionBodyPromise(
  interactionLoc: InteractionLoc,
  promise: string
) {
  return `__wrapUserPromise(${JSON.stringify(interactionLoc)}, (${promise}))`;
}

export function getCodeExpressionWithFallbackExpr(
  codeExpr: string,
  fallbackExpr: string,
  exprCtx: ExprCtx
): string {
  codeExpr = isEmptyCodeExpr(codeExpr) ? "(undefined)" : codeExpr;
  // Make sure codeExpr is on its own separate line, in case it
  // includes things like a line comment "//"
  return `(() => {
      try {
        return (
          ${stripParensAndMaybeConvertToIife(codeExpr)}
        );
      } catch (e) {
        if(e instanceof TypeError${
          exprCtx.projectFlags.useLoadingState
            ? ""
            : `|| e?.plasmicType === "PlasmicUndefinedDataError"`
        }) {
          return (
            ${stripParensAndMaybeConvertToIife(fallbackExpr)}
          );
        }
        throw e;
      }
    })()`;
}

/**
 * Examples of empty `codeExprs`:
 * - ""
 * - "()"
 * - "\n\t(\n )\n"
 */
export function isEmptyCodeExpr(codeExpr: string): boolean {
  let sanitized = codeExpr.trim();
  while (sanitized.startsWith("(") && sanitized.endsWith(")")) {
    sanitized = sanitized.slice(1, -1).trim();
  }
  return sanitized === "";
}

export function isPageHref(expr: any): expr is PageHref {
  return isKnownPageHref(expr);
}

export function extractValueSavedFromDataPicker(
  value: Expr | undefined | null | string | (string | number)[],
  exprCtx: ExprCtx
) {
  if (isKnownFunctionExpr(value)) {
    value = value.bodyExpr;
  }
  return isKnownObjectPath(value)
    ? value.path
    : isKnownCustomCode(value)
    ? value.code.slice(1, -1)
    : isKnownExpr(value)
    ? asCode(value, exprCtx).code
    : value;
}

export function createExprForDataPickerValue(
  value: string | (string | number)[],
  fallback?: Expr | null,
  isBodyFunction?: false,
  functionArgNames?: string[]
): ObjectPath | CustomCode;
export function createExprForDataPickerValue(
  value: string | (string | number)[],
  fallback: Expr | null | undefined,
  isBodyFunction: true,
  functionArgNames?: string[]
): FunctionExpr;
export function createExprForDataPickerValue(
  value: string | (string | number)[],
  fallback?: Expr | null,
  isBodyFunction?: boolean,
  functionArgNames?: string[]
): ObjectPath | CustomCode | FunctionExpr;
export function createExprForDataPickerValue(
  value: string | (string | number)[],
  fallback?: Expr | null,
  isBodyFunction?: boolean,
  functionArgNames?: string[]
) {
  const newExpr =
    typeof value === "object"
      ? new ObjectPath({
          path: value,
          fallback: fallback ?? null,
        })
      : new CustomCode({
          code: `(${value})`,
          fallback: fallback ?? null,
        });
  if (!isBodyFunction) {
    return newExpr;
  } else {
    return new FunctionExpr({
      bodyExpr: newExpr,
      argNames: functionArgNames ?? [],
    });
  }
}

function getKeyCodeExpression(
  templatedStringKey: TemplatedString,
  exprCtx: ExprCtx
) {
  const key = exprToDataSourceString(templatedStringKey, exprCtx);
  const keyBindings = getDynamicBindings(key);
  return getCodeExpressionWithFallbackExpr(
    keyBindings.stringSegments
      .map((value, index) => {
        if (keyBindings.jsSnippets[index].length === 0) {
          return JSON.stringify(value);
        }
        return keyBindings.jsSnippets[index];
      })
      .join(` + `),
    `""`,
    exprCtx
  );
}

export function summarizePath(variablePath: ObjectPath) {
  return summarizePathParts(variablePath.path);
}

export const flattenedKeys = new Set(["$ctx", "$props", "$state", "$queries"]);
export const omittedKeysIfEmpty = new Set(["$ctx.params", "$ctx.query"]);
export const alwaysOmitKeys = new Set([
  "$state.registerInitFunc",
  "$state.eagerInitializeStates",
  "$refs",
  "dataSourcesCtx",
  "$globalActions",
]);

// Need to try matching longer strings first or else $ctx.params won't get replaced only $ctx will.
const filteredPrefixes = new RegExp(
  `^(${sortBy(
    [...flattenedKeys, ...omittedKeysIfEmpty, ...alwaysOmitKeys],
    (x) => -x.length
  )
    .map((x) => escapeRegExp(x + "."))
    .join("|")})\\b`
);

export function summarizePathParts(parts: (number | string)[]) {
  return parts.join(".").replace(filteredPrefixes, "").split(".").join(" ▸ ");
}

function getSnippetsWithoutSafeCurrentUserUsage(
  expr: DataSourceOpExpr,
  exprCtx: ExprCtx
) {
  const exprSnippets = Object.entries(expr.templates)
    .map(
      ([key, val]) =>
        [
          key,
          isJsonType(getTemplateFieldType(val))
            ? // Safe currentUser binding should be removed by the next functions
              getDynamicSnippetsForJsonExpr(
                dataSourceTemplateToString(val, exprCtx)
              )
            : getDynamicSnippetsForExpr(
                dataSourceTemplateToString(val, exprCtx)
              ),
        ] as [string, string[]]
    )
    .filter(([_key, snippets]) => snippets.length > 0);
  return exprSnippets;
}

export function hasUnsafeCurrentUserBinding(
  expr: DataSourceOpExpr,
  exprCtx: ExprCtx
) {
  const exprSnippets = getSnippetsWithoutSafeCurrentUserUsage(expr, exprCtx);
  return exprSnippets.some(([_key, snippets]) =>
    snippets.some((snippet) => snippet.includes("currentUser"))
  );
}

export function isValidCurrentUserPropsExpr(
  expr: DataSourceOpExpr,
  exprCtx: ExprCtx
) {
  // A valid expression should be composed of only safe currentUser bindings
  // and no other bindings.
  const exprSnippets = getSnippetsWithoutSafeCurrentUserUsage(expr, exprCtx);
  return exprSnippets.length === 0;
}

export function serCompositeExprMaybe(value: any) {
  const hoistedSerExprs: Record<string, Expr> = {};

  function hoist(path: string, x: Expr) {
    hoistedSerExprs[path] = x;
    return null;
  }

  function hoistExprs(x: any, path: (string | number)[]): any {
    return isKnownExpr(x)
      ? hoist(path.join("."), x)
      : Array.isArray(x)
      ? x.map((e, i) => hoistExprs(e, [...path, i]))
      : typeof x === "object"
      ? mapValues(x, (v, k) => hoistExprs(v, [...path, k]))
      : x;
  }

  const withNulls = hoistExprs(value, []);
  return Object.keys(hoistedSerExprs).length === 0
    ? codeLit(value)
    : new CompositeExpr({
        hostLiteral: JSON.stringify(withNulls),
        substitutions: hoistedSerExprs,
      });
}

export function deserCompositeExprMaybe(fieldsExpr: any) {
  if (!isKnownCompositeExpr(fieldsExpr)) {
    return fieldsExpr;
  }
  const fields = JSON.parse(fieldsExpr.hostLiteral);
  for (const [path, serExpr] of Object.entries(fieldsExpr.substitutions)) {
    set(fields, path, serExpr);
  }
  return fields;
}

export function isAllowedDefaultExpr(expr: Expr) {
  if (
    isKnownEventHandler(expr) ||
    isKnownRenderExpr(expr) ||
    isKnownDataSourceOpExpr(expr) ||
    isKnownVarRef(expr) ||
    isKnownTplRef(expr) ||
    isKnownStyleTokenRef(expr) ||
    isKnownVariantsRef(expr) ||
    isKnownFunctionArg(expr) ||
    isKnownStyleExpr(expr) ||
    isKnownQueryInvalidationExpr(expr)
  ) {
    return false;
  }
  return true;
}

/**
 * Tries to remove fallback from the DataSourceOpExpr.
 */
export function removeFallbackFromDataSourceOp(op: DataSourceOpExpr) {
  const hasFallback = (e: Expr) => {
    if (isFallbackableExpr(e) && !!e.fallback) {
      return true;
    } else if (isKnownTemplatedString(e)) {
      return e.text.some((x) => isKnownExpr(x) && hasFallback(x));
    } else if (isKnownDataSourceOpExpr(e)) {
      return Object.values(e.templates).some(
        (t) =>
          t.bindings && Object.values(t.bindings).some((x) => hasFallback(x))
      );
    } else {
      return false;
    }
  };

  const withoutFallback = (expr: Expr) => {
    // Not comprehensive; currently only dealing with exprs that
    // can be encountered in DataSourceOpExpr
    if (!hasFallback(expr)) {
      return expr;
    }

    if (isKnownCustomCode(expr)) {
      return new CustomCode({ code: expr.code, fallback: null });
    }

    if (isKnownObjectPath(expr)) {
      return new ObjectPath({ path: expr.path, fallback: null });
    }

    if (isKnownTemplatedString(expr)) {
      return new TemplatedString({
        text: expr.text.map((x) => (isKnownExpr(x) ? withoutFallback(x) : x)),
      });
    }

    if (isKnownDataSourceOpExpr(expr)) {
      return new DataSourceOpExpr({
        ...expr,
        templates: mapValues(
          expr.templates,
          (t) =>
            new DataSourceTemplate({
              ...t,
              bindings: mapValues(t.bindings, (b) => withoutFallback(b)),
            })
        ),
      });
    }
    return expr;
  };

  return withoutFallback(op);
}

export function mkTemplatedStringOfOneDynExpr(expr: CustomCode | ObjectPath) {
  return new TemplatedString({
    text: ["", expr, ""],
  });
}

export function getSingleDynExprFromTemplatedString(expr: TemplatedString) {
  const single = only(expr.text.filter((x) => x !== ""));
  const typed = ensureInstance(single, CustomCode, ObjectPath);
  return typed;
}

export function convertHrefExprToCodeExpr(
  site: Site,
  owner: Component,
  expr: PageHref
) {
  const page = expr.page;
  if (!page.pageMeta) {
    return null;
  }
  if (Object.keys(expr.params).length === 0) {
    return codeLit(page.pageMeta.path);
  }

  let urlCode = "`" + page.pageMeta.path + "`";
  for (const [param, value] of Object.entries(expr.params)) {
    urlCode = urlCode.replace(
      `[${param}]`,
      "${" +
        asCode(value, {
          component: owner,
          inStudio: false,
          projectFlags: getProjectFlags(site),
        }).code +
        "}"
    );
  }
  return customCode(urlCode);
}

/**
 * The userMinimalValue is used as a source of truth for the prop value and
 * it's mainly used for arrays connected to data source.
 * (See more information in the registerComponent file).
 * The userMinimalValue function receives the value set in the array prop and performs
 * some transformation on it.
 * We need to reconcile the value saved in the model with the updated value.
 * This involves two steps:
 *   - first: we reorder the array expr to match the elements in the same position based on the key func.
 *   - second: we merge the array expr with the updated value.
 *             If the array item has common fields, we choose the field from the expr
 */
export function mergeUserMinimalValueWithCompositeExpr(
  userMinimalValue: any,
  value: Expr | any,
  exprCtx: ExprCtx,
  env: Record<string, any>,
  keyFn: (item: any, index: number) => any = (x, i) => i
) {
  const deseredValue = deserCompositeExprMaybe(value);
  const evaluated = isKnownExpr(value)
    ? tryEvalExpr(getRawCode(value, exprCtx), env).val
    : value;
  const itemPositionByKey = new Map<any, number>(
    (evaluated ?? []).map((x, i) => [keyFn(x, i) ?? i, i])
  );
  return (userMinimalValue ?? []).map((userItem, i) => {
    const mappedItemExprIndex = itemPositionByKey.get(keyFn(userItem, i) ?? i);
    if (mappedItemExprIndex === undefined) {
      return userItem;
    } else {
      const maybeExprItem = deseredValue[mappedItemExprIndex];
      if (isKnownMapExpr(maybeExprItem)) {
        return {
          ...userItem,
          ...Object.fromEntries(Object.entries(maybeExprItem.mapExpr)),
        };
      } else if (isKnownCompositeExpr(maybeExprItem)) {
        const deseredValueItem = deserCompositeExprMaybe(maybeExprItem);
        return {
          ...userItem,
          ...deseredValueItem,
        };
      } else {
        assert(!isKnownExpr(maybeExprItem), "unexpected expr for array type");
        return {
          ...userItem,
          ...Object.fromEntries(
            Object.entries(maybeExprItem ?? {}).filter(([_k, v]) =>
              isKnownExpr(hackyCast(v))
            )
          ),
        };
      }
    }
  });
}
