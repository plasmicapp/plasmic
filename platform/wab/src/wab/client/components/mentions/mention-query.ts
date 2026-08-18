/**
 * Pure helpers for locating and scoring the `@`-mention query the caret sits in.
 */

/**
 * Index of the `@` that opens the mention the caret is inside, or -1 if the
 * caret isn't in a mention.
 */
export function getMentionStartIndex(
  value: string,
  caretIndex: number
): number {
  for (let i = caretIndex - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === ">" || ch === "\n") {
      return -1;
    }
    if (ch === "@") {
      // The `@` must start the input or follow whitespace, so an email like
      // `a@b` isn't treated as a mention.
      return i === 0 || /\s/.test(value[i - 1]) ? i : -1;
    }
  }
  return -1;
}

/**
 * The `@`-mention query the caret sits inside, or undefined if it isn't in one.
 * Scans backward, so text after the caret is ignored.
 */
export function findMentionText(
  value: string,
  caretIndex: number
): string | undefined {
  const start = getMentionStartIndex(value, caretIndex);
  if (start < 0) {
    return undefined;
  }
  // Spaces are part of the query, so typing one keeps the suggestions open.
  return value.slice(start, caretIndex).replace(/^@<?/, "");
}

/** Score how well `searchableStrings` match `query` (higher is better, undefined is no match) */
export function matchScore(
  searchableStrings: string[],
  query: string
): number | undefined {
  if (query === "") {
    return 0;
  }
  const q = query.toLowerCase();
  let best: number | undefined;
  searchableStrings.forEach((str, i) => {
    const s = str.toLowerCase();
    // Prefix-match ranks above substring-match;
    const matchRank = s.startsWith(q) ? 2 : s.includes(q) ? 1 : 0;
    if (matchRank === 0) {
      return;
    }
    // Tiebreak by field position: earlier fields (smaller i) score higher.
    const score = matchRank + 1 / (i + 1);
    if (best === undefined || score > best) {
      best = score;
    }
  });
  return best;
}
