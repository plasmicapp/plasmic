import { pattern, regex } from "regex";
import type { Tagged } from "type-fest";

/** A validated JavaScript identifier. */
export type JsIdentifier = Tagged<string, "JsIdentifier">;

// Technically, \u200C (zero-width non-joiner) and \u200D (zero-width joiner)
// should be allowed as a JS identifier. However, we often run our code through
// Prettier, which does not accept these characters.
const rawJsIdentifierChars = String.raw`$\p{ID_Continue}`;
/** Matches a valid identifier character. May not be valid at the start. */
export const pJsIdentifierChar = pattern`(?!.*[\u200C\u200D])[${rawJsIdentifierChars}]`;
export const pNotJsIdentifierChar = pattern`[^${rawJsIdentifierChars}]|[\u200C\u200D]`;

/**
 * Matches an entire valid identifier.
 *
 * Regular expression for a valid identifier, according to MDN (with `u` flag)
 * [$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 *
 * Note we currently don't support some characters due to limitations in
 * downstream code processing. See comments in this file for more details.
 */
export const pJsIdentifier = pattern`[$_\p{ID_Start}]${pJsIdentifierChar}*`;

const reJsIdentifierExact = regex`^${pJsIdentifier}$`;

/** Returns true if the name can be used as a JavaScript identifier. */
export function isValidJsIdentifier(name: string): name is JsIdentifier {
  return reJsIdentifierExact.test(name) && !reservedKeywords.has(name);
}

/**
 * List of reserved keywords
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#keywords
 */
const reservedKeywords = new Set([
  "arguments", // not a keyword, but cannot be declared as identifier in strict mode
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval", // not a keyword, but cannot be declared as identifier in strict mode
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);
