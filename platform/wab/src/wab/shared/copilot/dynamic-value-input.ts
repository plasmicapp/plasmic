import { toVarName } from "@/wab/shared/codegen/util";
import { maybe, switchType } from "@/wab/shared/common";
import {
  TemplatedStringPropEditorValue,
  codeLit,
  customCode,
  deserCompositeExpr,
  isRealCodeExprEnsuringType,
  serCompositeExprMaybe,
  simplifyTemplatedString,
  stripParens,
  stripParensAndMaybeConvertToIife,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { JsonValue, jsonParse } from "@/wab/shared/core/lang";
import {
  getDynamicStringSegments,
  isDynamicValue,
} from "@/wab/shared/dynamic-bindings";
import {
  EvaluationError,
  pathToString,
  tryParseAsObjectPath,
} from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  Expr,
  ExprText,
  ObjectPath,
  PageHref,
  RawText,
  RichText,
  TemplatedString,
  VarRef,
  isKnownCompositeExpr,
  isKnownExpr,
  isKnownObjectPath,
} from "@/wab/shared/model/classes";
import { parseJsCode } from "@/wab/shared/parser-utils";
import { renderPageHrefUrl } from "@/wab/shared/utils/url-utils";
import { mapValues } from "lodash";
import { z } from "zod";

/**
 * Description of copilot's dynamic-value input format, `{{ jsExpr }}` interpolation.
 * Content is static by default and a `{{ }}`-wrapped JS expression makes it dynamic.
 * `read` serializes exprs back in the same form (`exprToInterpolatedString`).
 */
export const interpolatedStringFormatDescription = `Values are static by default (plain text is NOT quoted). Wrap JS in {{ }} to bind it to runtime data (e.g. "{{ currentItem.name }}") or to pass a non-string literal (e.g. "{{ 5 }}").`;

/**
 * Converts `{{ jsExpr }}` interpolated string to `Expr`. A string with no `{{ }}`,
 * or one that simplifies to static text, becomes a static `codeLit`, otherwise
 * `ObjectPath` / `CustomCode` / `TemplatedString`.
 */
export function interpolatedStringToExpr(str: string): Expr {
  const simplified = parseInterpolatedString(str);
  return typeof simplified === "string" ? codeLit(simplified) : simplified;
}

/**
 * Like `interpolatedStringToExpr`, but requires a code expression (ObjectPath/CustomCode),
 * for repeat / visibility conditions. Throws EvaluationError otherwise.
 */
export function interpolatedStringToCodeExpr(
  str: string
): ObjectPath | CustomCode {
  const expr = interpolatedStringToExpr(str.trim());
  if (isRealCodeExprEnsuringType(expr)) {
    return expr;
  }
  const badStr = JSON.stringify(str);
  throw new EvaluationError(
    `Expected a JS expression (e.g. {{ $q.myQuery.data }}), not static text. Got: ${badStr}`
  );
}

/**
 * Like `interpolatedStringToExpr`, but produces a `RichText`: `RawText` for
 * static text, `ExprText` for dynamic values.
 */
export function interpolatedStringToRichText(str: string): RichText {
  const simplified = parseInterpolatedString(str);
  return typeof simplified === "string"
    ? new RawText({ markers: [], text: simplified })
    : new ExprText({ expr: simplified, html: false });
}

/**
 * Parses an interpolated string. Plain text stays a string, a lone `{{ }}` becomes
 * `ObjectPath`/`CustomCode`, and mixed content a `TemplatedString`.
 * Throws `EvaluationError` on a malformed `{{ }}` body.
 */
export function parseInterpolatedString(
  str: string
): TemplatedStringPropEditorValue {
  return simplifyTemplatedString(interpolatedStringToTemplatedString(str));
}

/**
 * Classifies a JS expression string as an ObjectPath or CustomCode.
 */
export function codeToDynExpr(code: string): ObjectPath | CustomCode {
  code = code.trim();
  const path = tryParseAsObjectPath(code);
  if (path) {
    return new ObjectPath({ path, fallback: null });
  }
  try {
    parseJsCode(`(${code})`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new EvaluationError(
      `Invalid interpolation: ${msg}. Code was: ${JSON.stringify(code)}`
    );
  }
  return customCode(code);
}

/**
 * Converts an object/array arg (e.g. fetch's `opts`) to Expr. A static literal
 * becomes `codeLit`, and one with dynamic leaves a `CompositeExpr`.
 *
 * `input` must be JSON with each dynamic leaf as a quoted `{{ jsExpr }}` string,
 * e.g. `{ "url": "{{ $ctx.params.api }}", "method": "GET" }`, anything else throws
 * `EvaluationError`. Returns `undefined` when `input` isn't an object/array.
 */
export function objectLiteralToExpr(input: string): Expr | undefined {
  if (!isObjectOrArrayLiteralInput(input)) {
    return undefined;
  }
  const trimmed = stripParens(input.trim()).trim();
  let json: JsonValue;
  try {
    json = jsonParse(trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new EvaluationError(
      `Object/array arg values must be valid JSON with each dynamic leaf as a quoted {{ }} string, ` +
        `e.g. { "url": "{{ $ctx.params.api }}", "method": "GET" }. Parse error: ${msg}`
    );
  }
  return serCompositeExprMaybe(jsonToValueOrExpr(json));
}

/**
 * True when `input` looks like a JSON object/array literal (as opposed to
 * plain text or `{{ }}` interpolation).
 */
export function isObjectOrArrayLiteralInput(input: string): boolean {
  const trimmed = stripParens(input.trim()).trim();
  return (
    trimmed.startsWith("[") ||
    (trimmed.startsWith("{") && !trimmed.startsWith("{{"))
  );
}

/** A JSON tree whose leaves may also be dynamic `Expr`s. */
type ValueOrExpr =
  | JsonValue
  | Expr
  | ValueOrExpr[]
  | { [key: string]: ValueOrExpr };

/** Replaces `{{ }}` string leaves in a JSON tree with dynamic `Expr`s. */
function jsonToValueOrExpr(value: JsonValue): ValueOrExpr {
  if (typeof value === "string" && isDynamicValue(value)) {
    return interpolatedStringToExpr(value);
  }
  if (Array.isArray(value)) {
    return value.map(jsonToValueOrExpr);
  }
  if (value !== null && typeof value === "object") {
    return mapValues(value, jsonToValueOrExpr);
  }
  return value;
}

/**
 * Converts a `{{...}}` interpolated string (from SQL template editor) to TemplatedString.
 * Dynamic segments with simple member-access become ObjectPath instead of CustomCode.
 */
export function interpolatedStringToTemplatedString(
  str: string
): TemplatedString {
  // Preserves leading/trailing whitespace in static content.
  // Only the `{{ }}` expression body is trimmed.
  const segments = getDynamicStringSegments(str);
  return new TemplatedString({
    text: segments.map((seg) =>
      isDynamicValue(seg)
        ? codeToDynExpr(seg.substring(2, seg.length - 2))
        : seg
    ),
  });
}

/**
 * Renders a dynamic expression as one `{{ jsExpr }}` interpolation, the
 * inverse of `codeToDynExpr` on a `{{ }}` segment.
 *
 * Fallbacks are dropped, they apply when evaluating the expression throws.
 */
function exprToInterpolation(expr: ObjectPath | CustomCode): string {
  const code = isKnownObjectPath(expr)
    ? pathToString(expr.path)
    : stripParensAndMaybeConvertToIife(expr.code);
  return `{{ ${code} }}`;
}

/**
 * Inverse of `interpolatedStringToTemplatedString` / `interpolatedStringToExpr`:
 * serialize an `Expr` back to inline `{{ jsExpr }}`.
 *
 * - Static string value -> raw string.
 * - `ObjectPath` / `CustomCode` -> `{{ jsExpr }}`.
 * - `TemplatedString` -> static parts as-is, dynamic parts as `{{ jsExpr }}`.
 * - `VarRef` -> `{{ $props.varName }}` (its canvas evaluation form).
 * - `PageHref` -> the page URL with dynamic params/query/fragment as `{{ }}`.
 *
 * Returns `undefined` for other exprs, which callers must skip:
 * - `RenderExpr` (slot content) shows in read as `<slot>` children.
 * - `EventHandler` shows in read as the component's `interactions`.
 *
 * Data tokens are emitted as raw `$dataTokens_*` (no display-name transform).
 */
export function exprToInterpolatedString(expr: Expr): string | undefined {
  return switchType(expr)
    .when(TemplatedString, (templatedString) =>
      templatedString.text
        .map((seg) =>
          typeof seg === "string" ? seg : exprToInterpolation(seg)
        )
        .join("")
    )
    .when([CustomCode, ObjectPath], (dynExpr) => {
      const json = tryExtractJson(dynExpr);
      return typeof json === "string" ? json : exprToInterpolation(dynExpr);
    })
    .when(VarRef, (varRef) =>
      varRef.variable
        ? `{{ $props.${toVarName(varRef.variable.name)} }}`
        : undefined
    )
    .when(PageHref, (pageHref) => pageHrefToInterpolatedString(pageHref))
    .elseUnsafe(() => undefined);
}

/**
 * Renders a `PageHref` as its URL with dynamic params/query/fragment inlined as
 * `{{ }}`, e.g. `/products/{{ $state.slug }}?ref={{ $props.ref }}`. The
 * interpolated counterpart of `pageHrefPathToCode`, so it round-trips through
 * the write path (as an equivalent static string or TemplatedString).
 */
function pageHrefToInterpolatedString(pageHref: PageHref): string | undefined {
  // Parts are all renderable, only a dangling VarRef reads as an empty segment.
  return renderPageHrefUrl(
    pageHref,
    (value) => exprToInterpolatedString(value) ?? ""
  );
}

export function dataQueryArgSchema() {
  return z.discriminatedUnion("__type", [
    z.object({
      __type: z.literal("InterpolatedString"),
      name: z.string().describe("Parameter name."),
      value: z.string().describe("Static text or `{{ }}` dynamic expression."),
    }),
    z.object({
      __type: z.literal("CompositeExpr"),
      name: z.string().describe("Parameter name."),
      value: z
        .string()
        .describe(
          "Object/array value: a JSON literal whose dynamic leaves are inline `{{ }}` strings."
        ),
    }),
  ]);
}
export type DataQueryArgJson = z.infer<ReturnType<typeof dataQueryArgSchema>>;

/**
 * Serializes a function arg `Expr` back to the tagged form with `value` accepted by
 * `createDataQuery`. `CompositeExpr` for object/array, otherwise `InterpolatedString`.
 * Returns `undefined` for exprs with no inline form, which callers must skip.
 */
export function exprToDataQueryArg(
  name: string,
  expr: Expr
): DataQueryArgJson | undefined {
  if (isKnownCompositeExpr(expr)) {
    return {
      __type: "CompositeExpr",
      name,
      value: JSON.stringify(
        exprLeavesToInterpolations(deserCompositeExpr(expr))
      ),
    };
  }
  const json = tryExtractJson(expr);
  if (json !== undefined && typeof json === "object" && json !== null) {
    return { __type: "CompositeExpr", name, value: JSON.stringify(json) };
  }
  return maybe(exprToInterpolatedString(expr), (value) => ({
    __type: "InterpolatedString",
    name,
    value,
  }));
}

/** Recursively replaces `Expr` leaves of a deserialized object with `{{ }}`. */
function exprLeavesToInterpolations(value: ValueOrExpr): JsonValue {
  if (isKnownExpr(value)) {
    return exprToInterpolatedString(value) ?? null;
  }
  if (Array.isArray(value)) {
    return value.map(exprLeavesToInterpolations);
  }
  if (value !== null && typeof value === "object") {
    return mapValues(value, exprLeavesToInterpolations);
  }
  return value;
}
