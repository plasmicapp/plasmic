import {
  StudioPropType,
  getPropTypeType,
} from "@/wab/shared/code-components/code-components";
import {
  clone,
  code,
  codeLit,
  createExprForDataPickerValue,
  isDynamicExpr,
  simplifyTemplatedString,
} from "@/wab/shared/core/exprs";
import { DataPickerSupportedVariableType } from "@/wab/shared/data-picker/data-picker-types";
import {
  CustomCode,
  Expr,
  ObjectPath,
  RichText,
  TemplatedString,
  isKnownCustomCode,
  isKnownExprText,
  isKnownObjectPath,
  isKnownRawText,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";

export const SCALAR_DATA_TYPES: readonly DataPickerSupportedVariableType[] = [
  "string",
  "number",
  "boolean",
  "null",
  "undefined",
];

const SCALAR_TYPES = new Set(SCALAR_DATA_TYPES);

const STRING_PROP_TYPES = new Set([
  "string",
  "richText",
  "href",
  "color",
  "dateString",
  "imageUrl",
  "cardPicker",
  "code",
]);

/**
 * Conservatively checks whether a value dragged from the data picker can be assigned to a prop. The
 * runtime validators remain the final safety net.
 */
export function canDropDataOnPropType(
  varType: DataPickerSupportedVariableType,
  propType: StudioPropType<any>,
): true | string {
  const propTypeType = getPropTypeType(propType);

  if (varType === "function") {
    return "Functions cannot be used as dynamic prop values";
  }

  if (varType === "array") {
    return propTypeType === "array" ||
      propTypeType === "object" ||
      propTypeType === "dataSourceOpData"
      ? true
      : "This field does not accept arrays";
  }

  if (varType === "object") {
    return propTypeType === "object"
      ? true
      : "This field does not accept objects";
  }

  if (!SCALAR_TYPES.has(varType)) {
    return "This data type is not supported here";
  }

  // The target switch stores strings such as "_blank", not booleans.
  if (propTypeType === "target") {
    return varType === "string" || varType === "null" || varType === "undefined"
      ? true
      : "This field only accepts link target strings such as _blank";
  }

  if (STRING_PROP_TYPES.has(propTypeType ?? "")) {
    return true;
  }
  if (propTypeType === "choice") {
    return true;
  }
  if (propTypeType === "number") {
    return varType === "number" || varType === "null" || varType === "undefined"
      ? true
      : "This field only accepts numbers";
  }
  if (propTypeType === "boolean") {
    return varType === "boolean" ||
      varType === "null" ||
      varType === "undefined"
      ? true
      : "This field only accepts booleans";
  }

  return "This field does not accept this data type";
}

/**
 * Computes an expr to replace the current value when data drops on an input. A static value becomes
 * fallback, a lone dynamic expr is replaced (keeping its fallback). Returns undefined for templated
 * strings that mix text and dynamic parts, which instead inserts into the editor.
 */
export function computeDropReplacementExpr(
  current: Expr | string | null | undefined,
  path: (string | number)[],
): ObjectPath | CustomCode | undefined {
  const simplified = isKnownTemplatedString(current)
    ? simplifyTemplatedString(current)
    : current;
  if (isKnownTemplatedString(simplified)) {
    return undefined;
  }
  const fallback = !simplified
    ? undefined
    : typeof simplified === "string"
      ? codeLit(simplified)
      : isDynamicExpr(simplified) &&
          (isKnownCustomCode(simplified) || isKnownObjectPath(simplified))
        ? simplified.fallback
          ? clone(simplified.fallback)
          : undefined
        : clone(simplified);
  return createExprForDataPickerValue(path, fallback);
}

/**
 * computeDropReplacementExpr for text content. Rich-text sub-nodes hold a TemplatedString, which has
 * no fallback, so their static text stays inline as with "use dynamic value".
 */
export function computeDropTextExpr(
  text: RichText | null | undefined,
  path: (string | number)[],
  isSubNode: boolean,
): ObjectPath | CustomCode | TemplatedString | undefined {
  if (isSubNode && !isKnownExprText(text)) {
    const staticText =
      isKnownRawText(text) && text.text !== "Enter some text" ? text.text : "";
    return new TemplatedString({
      text: [staticText, createExprForDataPickerValue(path, undefined), ""],
    });
  }
  const replacement = computeDropReplacementExpr(
    isKnownExprText(text)
      ? text.expr
      : isKnownRawText(text) &&
          text.markers.length === 0 &&
          text.text !== "Enter some text"
        ? text.text
        : undefined,
    path,
  );
  return replacement && isSubNode
    ? new TemplatedString({ text: ["", replacement, ""] })
    : replacement;
}

/** computeDropReplacementExpr for a repeat collection, which falls back to an empty list. */
export function computeDropCollectionExpr(
  current: Expr | null | undefined,
  path: (string | number)[],
): ObjectPath | CustomCode {
  const expr = computeDropReplacementExpr(current, path)!;
  expr.fallback ??= code("([])");
  return expr;
}
