/**
 * Attempts to fix common JSON formatting issues.
 * This is useful when parsing user input or AI-generated JSON that may have minor issues.
 */
export function fixJson(jsonString: string): string {
  if (!jsonString || typeof jsonString !== "string") {
    return jsonString;
  }

  let fixed = jsonString.trim();

  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

  // Add missing quotes around unquoted keys
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // Replace single quotes with double quotes (but not within strings)
  // This is a simple replacement - may not handle all edge cases
  fixed = fixed.replace(/'/g, '"');

  return fixed;
}
