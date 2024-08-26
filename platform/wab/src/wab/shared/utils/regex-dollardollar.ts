import {
  pJsIdentifier,
  pNotJsIdentifierChar,
} from "@/wab/shared/utils/regex-js-identifier";
import { pattern, regex } from "regex";

const pDot = pattern`\s*\.\s*`;

const p$$PropertyAccesses = regex("g")`
  (^|${pNotJsIdentifierChar})  # start a with non-identifier (e.g. start, space)
  \$\$                         # $$
  ${pDot}                      # .
  (?<result>                   # capture "first.second" as "result"
    ${pJsIdentifier}           # first property access
    (${pDot}${pJsIdentifier})? # second property access (optional)
  )
`;

/**
 * Given JS code, returns property access on the `$$` object.
 * Up to two property accesses are captured.
 *
 * Examples:
 * - "$$.abc" -> ["abc"]
 * - "$$.a.b" -> ["a.b"]
 * - "$$.a.b.c" -> ["a.b"]
 * - "$$.a + $$.b" -> ["a", "b"]
 * - "$$\n\t.lodash\n\t .remove" -> ["lodash.remove"]
 */
export function parse$$PropertyAccesses(code: string): string[] {
  return [...code.matchAll(p$$PropertyAccesses)].map((m) =>
    m!.groups!.result.replace(/\s/g, "")
  );
}

const reUnexpected$$Usages = regex`
  (^|${pNotJsIdentifierChar}) # start with a non-identifier (e.g. start, space)
  \$\$                        # $$
  (?!${pDot}${pJsIdentifier}) # should not match property access
  ($|${pNotJsIdentifierChar}) # end with a non-identifier (e.g. end, space)
`;

/**
 * Given JS code, returns true if unexpected `$$` usage is detected.
 *
 * TODO: Is this the negation of `parse$$PropertyAccesses`?
 */
export function hasUnexpected$$Usage(code: string): boolean {
  return reUnexpected$$Usages.test(code);
}
