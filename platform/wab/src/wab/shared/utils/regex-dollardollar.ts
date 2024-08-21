import { validJsIdentifierChars } from "@/wab/shared/utils/regex-js-identifier";

/**
 * Given JS code, returns property access on the `$$` object.
 * Up to two property accesses are captured.
 *
 * Examples:
 * - `$$.abc` -> `abc`
 * - `$$.a.b` -> `a.b`
 * - `$$.a.b.c` -> `a.b`
 * - `$$\n\t.lodash\n\t .remove` -> `lodash.remove`
 */
export function parse$$PropertyAccesses(code: string): string[] {
  const validVariableChars = validJsIdentifierChars({
    allowUnderscore: true,
    allowDollarSign: true,
  });
  const usedFunctionIdRegExp = new RegExp(
    [
      "\\$\\$\\s*\\.\\s*(",
      "[",
      ...validVariableChars,
      "]+",
      "(?:\\s*\\.\\s*[",
      ...validVariableChars,
      "]+)?",
      ")",
    ].join(""),
    "g"
  );
  return [...code.matchAll(usedFunctionIdRegExp)].map((m) =>
    m[1].replace(/\s/g, "")
  );
}

/**
 * Given JS code, returns true if unexpected `$$` usage is detected.
 *
 * TODO: Is this the negation of `parse$$PropertyAccesses`?
 */
export function hasUnexpected$$Usage(code: string): boolean {
  const validVariableChars = validJsIdentifierChars({
    allowUnderscore: true,
    allowDollarSign: true,
  });
  const unexpectedLibUsageRegExp = new RegExp(
    [
      "(^|((?![",
      ...validVariableChars,
      "])[\\s\\S]))",
      "\\$\\$",
      "(?!\\s*\\.\\s*",
      "[",
      ...validVariableChars,
      "]+",
      ")",
      "($|((?![",
      ...validVariableChars,
      "])[\\s\\S]))",
    ].join(""),
    "g"
  );
  return !!code.match(unexpectedLibUsageRegExp);
}
