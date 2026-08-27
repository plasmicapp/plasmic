import { Matcher } from "@/wab/client/components/view-common";
import { DataTokenRef } from "@/wab/commons/DataToken";
import { naturalSort } from "@/wab/shared/sort";
import { words } from "lodash";

/** Ingredients for token ranking */
interface Query {
  paramName: string;
  /** Names that help rank relevance; earlier ones weigh more. */
  ownerNames: readonly string[];
  /** What the user typed */
  searchText: string;
}

/** Only breaks ties between tokens that scored the same on owner names. */
const EXACT_PARAM_BONUS = 1;

/** The token value as shown to the user (e.g. an unquoted string). */
export function displayTokenValue(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") {
      return parsed;
    }
  } catch {
    // not JSON (a code expression) — show as-is
  }
  return raw;
}

/** Scripts written without spaces, which `lodash.words` can't split. */
const UNSPACED_SCRIPTS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Khmer}\p{Script=Lao}\p{Script=Myanmar}]/u;

/** Undefined on Firefox < 125. */
const wordSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : undefined;

/**
 * `lodash.words` splits on case changes, spaces and punctuation, so unspaced
 * scripts come back as one word; those runs go to ICU's dictionary instead.
 * Both names compared go through this, so odd segmentation still matches.
 */
function splitWords(name: string): string[] {
  return words(name)
    .flatMap((word) =>
      wordSegmenter && UNSPACED_SCRIPTS.test(word)
        ? [...wordSegmenter.segment(word)]
            .filter((seg) => seg.isWordLike)
            .map((seg) => seg.segment)
        : [word]
    )
    .map((w) => w.toLowerCase());
}

function containsAllWords(
  tokenWords: string[],
  requiredWords: string[]
): boolean {
  return requiredWords.every((word) => tokenWords.includes(word));
}

function sameWords(name1: string[], name2: string[]): boolean {
  return containsAllWords(name1, name2) && containsAllWords(name2, name1);
}

/**
 * What each owner word is worth, taken from the earliest name containing it.
 *
 * Weights are derived from the names rather than fixed, so one word of an
 * earlier name always beats every word of the later ones put together
 */
function ownerWordWeights(ownerNames: readonly string[]): Map<string, number> {
  const wordsPerName = ownerNames.map(splitWords);
  const weights = new Map<string, number>();
  // Last name first, accumulating the most the names after it can score.
  let below = EXACT_PARAM_BONUS;
  for (let i = wordsPerName.length - 1; i >= 0; i--) {
    const weight = below + 1;
    for (const word of wordsPerName[i]) {
      weights.set(word, weight);
    }
    below += wordsPerName[i].length * weight;
  }
  return weights;
}

/**
 * Builds a scorer against a query
 */
function mkTokenScorer(query: Query) {
  const paramWords = splitWords(query.paramName);
  const ownerWeights = ownerWordWeights(query.ownerNames);

  /**
   * How well a token name matches the param being edited (higher is better),
   * or `null` if it isn't a match at all.
   */
  return function score(tokenName: string): number | null {
    const tokenWords = splitWords(tokenName);
    if (paramWords.length === 0 || !containsAllWords(tokenWords, paramWords)) {
      return null;
    }
    let total = 0;
    for (const word of new Set(tokenWords)) {
      total += ownerWeights.get(word) ?? 0;
    }
    return total + (sameWords(tokenWords, paramWords) ? EXACT_PARAM_BONUS : 0);
  };
}

/**
 * Ranks data tokens for a param being edited.
 */
export function getDataTokenSuggestions(
  tokens: readonly DataTokenRef[],
  query: Query
): DataTokenRef[] {
  const score = mkTokenScorer(query);
  const matcher = new Matcher(query.searchText);
  const isEmptyQuery = query.searchText === "";
  const isSearch = !isEmptyQuery;

  const scored = tokens
    .map((ref) => ({
      ref,
      score: score(ref.token.name),
      nameMatches: matcher.matches(ref.token.name),
      valueMatches: matcher.matches(ref.token.value),
    }))
    .filter((x) =>
      isSearch ? x.nameMatches || x.valueMatches : x.score !== null
    );

  const sorted = naturalSort(scored, (x) => x.ref.token.name);
  sorted.sort((a, b) => {
    const useHeuristic =
      isEmptyQuery ||
      // Both matched the query the same way, so let the heuristic decide.
      a.nameMatches === b.nameMatches;
    if (useHeuristic) {
      return (b.score ?? -1) - (a.score ?? -1);
    }
    // Otherwise a name match outranks a value-only match.
    return a.nameMatches ? -1 : 1;
  });
  return sorted.map((x) => x.ref);
}
