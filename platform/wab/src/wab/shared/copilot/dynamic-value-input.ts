import { customCode, simplifyTemplatedString } from "@/wab/shared/core/exprs";
import {
  getDynamicBindings,
  isDynamicValue,
} from "@/wab/shared/dynamic-bindings";
import {
  EvaluationError,
  tryParseAsObjectPath,
} from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
} from "@/wab/shared/model/classes";
import { parseJsCode, writeJs } from "@/wab/shared/parser-utils";
import type * as ast from "estree";
import { z } from "zod";

/**
 * Input for copilot dynamic value tool params. A single string whose form is
 * disambiguated by its outermost JS expression:
 *
 * - **Quoted static string** — "My title" or 'My title'. Parsed as a JS string literal.
 * - **Backtick-wrapped templated string** — e.g. `Hello ${$ctx.params.slug}`.  `${...}` is a
 *   JS expression. A pure-static backtick template (`Hi`) is equivalent to a quoted string.
 * - **Bare JS expression** — e.g. $props.title ?? 'None'. Input parsed as one JS expression.
 *
 * Equivalent dynamic values can be expressed two ways: `` `${$ctx.foo}` `` and
 * `$ctx.foo` both yield an `ObjectPath`.
 */
export const dynamicStringSchema = z
  .string()
  .describe(
    `Either a quoted static string (e.g. "My title"), a backtick-wrapped JS interpolated string (e.g. \`Hi \${$ctx.params.slug}\`), or a JS expression (e.g. $props.title ?? "None"). Plain text MUST be wrapped in double quotes.`
  );

export type DynamicStringInput = z.infer<typeof dynamicStringSchema>;

// Result type matching `TemplatedStringPropEditorValue`
export type DynamicStringValue =
  | string
  | TemplatedString
  | ObjectPath
  | CustomCode;

/**
 * Converts copilot string input to Plasmic representation. Input is parsed as a JS expression
 * and the outer AST node decides the interpretation:
 *
 * - String literal       -> plain string.
 * - Template literal     -> TemplatedString or simplified to ObjectPath/CustomCode
 * - Any other expression -> raw ObjectPath/CustomCode.
 *
 * Throws `EvaluationError` on invalid input.
 */
export function parseDynamicStringInput(
  input: DynamicStringInput
): DynamicStringValue {
  let expr: ast.Expression;
  try {
    const program = parseJsCode(input);
    const stmt = program.body[0];
    if (
      program.body.length !== 1 ||
      !stmt ||
      stmt.type !== "ExpressionStatement"
    ) {
      throw new Error("not a single expression");
    }
    expr = stmt.expression;
  } catch {
    throw new EvaluationError(invalidInputMessage(input));
  }
  if (expr.type === "Literal" && typeof expr.value === "string") {
    return expr.value;
  }
  if (expr.type === "TemplateLiteral") {
    return templateLiteralToValue(expr);
  }

  // Anything else: treat as a bare JS expression.
  return buildDynamicExprFromJsSnippet(input);
}

function templateLiteralToValue(
  literal: ast.TemplateLiteral
): DynamicStringValue {
  const text: Array<string | ObjectPath | CustomCode> = [];
  literal.quasis.forEach((q, i) => {
    text.push(q.value.cooked ?? q.value.raw);
    if (i < literal.expressions.length) {
      const exprNode = literal.expressions[i];
      const code = generateExprCode(exprNode).trim();
      if (!code) {
        throw new EvaluationError(
          "Empty ${} interpolation in template string."
        );
      }
      text.push(buildDynamicExprFromJsSnippet(code));
    }
  });
  return simplifyTemplatedString(new TemplatedString({ text }));
}

function invalidInputMessage(input: string): string {
  return `Invalid input ${JSON.stringify(
    input
  )}: expected a quoted string (e.g. "My title"), a backtick-wrapped templated string (e.g. \`Hello \${$ctx.foo}\`), or a bare JS expression (e.g. $props.title ?? "None"). Plain text must be quoted.`;
}

/**
 * Classifies a JS snippet as an ObjectPath or CustomCode.
 */
export function buildDynamicExprFromJsSnippet(
  code: string
): ObjectPath | CustomCode {
  const path = tryParseAsObjectPath(code);
  if (path) {
    return new ObjectPath({ path, fallback: null });
  }
  try {
    parseJsCode(`(${code})`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new EvaluationError(
      `Invalid interpolation: ${msg}. Snippet was: ${JSON.stringify(code)}`
    );
  }
  return customCode(code);
}

/**
 * Converts a `{{...}}` interpolated string (from SQL template editor) to TemplatedString.
 * Dynamic segments with simple member-access become ObjectPath instead of CustomCode.
 */
export function interpolatedStringToTemplatedString(
  str: string
): TemplatedString {
  const { jsSnippets, stringSegments } = getDynamicBindings(str);
  return new TemplatedString({
    text: stringSegments.map((seg, i) =>
      isDynamicValue(seg) ? buildDynamicExprFromJsSnippet(jsSnippets[i]) : seg
    ),
  });
}

function generateExprCode(node: ast.Expression): string {
  // Wrap expression node in a Program to keep things straightforward and reuse the
  // writeJs settings used elsewhere in the codebase.
  const program: ast.Program = {
    type: "Program",
    sourceType: "script",
    body: [{ type: "ExpressionStatement", expression: node }],
  };
  const out = writeJs(program, { semicolons: false });
  return out.endsWith(";") ? out.slice(0, -1) : out;
}
