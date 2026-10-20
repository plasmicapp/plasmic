import { ensureArray } from "@/wab/shared/common";
import { naturalSort } from "@/wab/shared/sort";
import { words } from "lodash";

/** How a search term matched a text, best first. */
type MatchLevel = "exact" | "prefix" | "wordPrefix" | "substring";

const MATCH_LEVELS: readonly MatchLevel[] = [
  "exact",
  "prefix",
  "wordPrefix",
  "substring",
];

/** Text of an item, besides its name, that the search reads. */
export interface SearchField<T> {
  /** The field's name in {@link SearchQuery.in} and in each hit's match. */
  key: string;
  get: (item: T) => string | string[] | undefined;
  /**
   * "words" (default) ignores case, spaces, punctuation and camelCase.
   * "literal" only ignores case, for values.
   */
  compareAs?: "words" | "literal";
}

/** What a search reads of one kind of item. */
export interface SearchSpec<T> {
  /** Searched first, scored against the context, and used to sort ties. */
  name: (item: T) => string;
  /** Searched after the name, in order. Earlier fields rank higher. */
  also?: readonly SearchField<T>[];
}

export interface SearchQuery {
  /**
   * What to look for, such as typed words or a model's keywords. A term's
   * words must appear together and in order, unless `tokenizeTerms` is set.
   * With no terms, every item matches.
   */
  terms: readonly string[];
  /** "all" (default) requires every term to match, and "any" requires one. */
  require?: "all" | "any";
  /** Searches only the fields with these keys. The name's key is "name". */
  in?: readonly string[];
  /**
   * Terms must cover whole words, so "host" matches "strapiHost" but not
   * "hostname" or "ghostText". Applies to fields compared as words.
   */
  matchWholeWords?: boolean;
  /**
   * Matches each word of a term on its own, in any order, so "apiKey" finds
   * "keyApi" and "apiProdKey".
   */
  tokenizeTerms?: boolean;
  /**
   * Names of where the result is used, most specific first, such as the
   * param being edited, then its element and component. Items sharing words
   * with an earlier name rank higher.
   */
  context?: readonly string[];
}

/** The field an item matched in, and that field's text. */
interface SearchMatch {
  field: string;
  text: string;
}

interface SearchHit<T> {
  item: T;
  /** The item's best match. Absent when the query has no terms. */
  match?: SearchMatch;
}

/**
 * The items matching `query`, best first: items matching more terms, then
 * matches on an earlier field, then names sharing more context words, then
 * stronger matches, then natural name order.
 */
export function getSearchHits<T>(
  items: readonly T[],
  spec: SearchSpec<T>,
  query: SearchQuery,
): SearchHit<T>[] {
  const fields = [{ key: "name", get: spec.name }, ...(spec.also ?? [])]
    .map((field, fieldIndex) => ({ ...field, fieldIndex }))
    .filter((field) => !query.in || query.in.includes(field.key));

  const terms = query.terms
    .map((term) => term.trim())
    .filter((term) => term !== "")
    .flatMap((term) => {
      const termWords = splitWords(term);
      // A term without words, such as "_", stays whole and matches no name.
      return query.tokenizeTerms && termWords.length > 0 ? termWords : [term];
    })
    .map((term) => ({
      compact: splitWords(term).join(""),
      literal: term.toLowerCase(),
    }));

  const getContextScore = getContextScorer(query.context ?? []);

  const ranked = items.flatMap((item) => {
    const texts = fields.flatMap((field) =>
      ensureArray(field.get(item)).map((text) => ({
        field,
        text,
        getLevel:
          field.compareAs === "literal"
            ? getLiteralMatcher(text)
            : getWordsMatcher(text, query.matchWholeWords ?? false),
      })),
    );

    let best: RankedMatch | undefined;
    let termsMatched = 0;
    for (const term of terms) {
      let termBest: RankedMatch | undefined;
      for (const { field, text, getLevel } of texts) {
        const level = getLevel(term);
        if (level === undefined) {
          continue;
        }

        const match = {
          field: field.key,
          text,
          level,
          fieldIndex: field.fieldIndex,
        };
        if (!termBest || compareMatches(match, termBest) < 0) {
          termBest = match;
        }
      }

      if (!termBest) {
        if (query.require !== "any") {
          return [];
        }
        continue;
      }
      termsMatched++;
      if (!best || compareMatches(termBest, best) < 0) {
        best = termBest;
      }
    }

    if (terms.length > 0 && !best) {
      return [];
    }

    const name = spec.name(item);
    return [
      { item, name, best, termsMatched, contextScore: getContextScore(name) },
    ];
  });

  // Ties keep their natural name order, since the sort is stable.
  const sorted = naturalSort(ranked, (entry) => entry.name);
  sorted.sort(
    (a, b) =>
      b.termsMatched - a.termsMatched ||
      (a.best?.fieldIndex ?? 0) - (b.best?.fieldIndex ?? 0) ||
      b.contextScore - a.contextScore ||
      getLevelRank(a.best) - getLevelRank(b.best),
  );
  return sorted.map(({ item, best }) =>
    best
      ? {
          item,
          match: { field: best.field, text: best.text },
        }
      : { item },
  );
}

type RankedMatch = SearchMatch & { level: MatchLevel; fieldIndex: number };

interface PreparedTerm {
  /** Normalized words joined, so "Arrow Right" becomes "arrowright". */
  compact: string;
  literal: string;
}

function compareMatches(a: RankedMatch, b: RankedMatch) {
  return a.fieldIndex - b.fieldIndex || getLevelRank(a) - getLevelRank(b);
}

function getLevelRank(match: RankedMatch | undefined) {
  return match ? MATCH_LEVELS.indexOf(match.level) : 0;
}

function getLiteralMatcher(text: string) {
  const lower = text.trim().toLowerCase();
  return ({ literal }: PreparedTerm): MatchLevel | undefined =>
    lower === literal
      ? "exact"
      : lower.startsWith(literal)
        ? "prefix"
        : lower.includes(literal)
          ? "substring"
          : undefined;
}

function getWordsMatcher(text: string, matchWholeWords: boolean) {
  const textWords = splitWords(text);
  const compact = textWords.join("");

  // Where each word starts and ends in the compact text.
  const bounds = new Set([0]);
  let end = 0;
  for (const word of textWords) {
    bounds.add((end += word.length));
  }

  return ({ compact: term }: PreparedTerm): MatchLevel | undefined => {
    const starts = getIndexes(compact, term).filter(
      (start) =>
        !matchWholeWords ||
        (bounds.has(start) && bounds.has(start + term.length)),
    );
    if (starts.includes(0)) {
      return term.length === compact.length ? "exact" : "prefix";
    }
    if (starts.some((start) => bounds.has(start))) {
      return "wordPrefix";
    }
    return starts.length > 0 ? "substring" : undefined;
  };
}

/** The indexes of `term` in `text`, overlapping ones included. */
function getIndexes(text: string, term: string): number[] {
  const indexes: number[] = [];
  if (term === "") {
    return indexes;
  }
  for (let i = text.indexOf(term); i !== -1; i = text.indexOf(term, i + 1)) {
    indexes.push(i);
  }
  return indexes;
}

/** Only breaks ties between names that share the same context words. */
const ECHO_BONUS = 1;

/**
 * Scores a name by the context words it shares. A word of an earlier context
 * name is worth more than all the words of the later names combined. A name
 * that is exactly the first context name gets {@link ECHO_BONUS}.
 */
function getContextScorer(context: readonly string[]) {
  if (context.length === 0) {
    return () => 0;
  }
  const wordsPerName = context.map(splitWords);
  const weights = new Map<string, number>();

  // Last name first, accumulating the most the names after it can score.
  let below = ECHO_BONUS;
  for (let i = wordsPerName.length - 1; i >= 0; i--) {
    const weight = below + 1;
    for (const word of wordsPerName[i]) {
      weights.set(word, weight);
    }
    below += wordsPerName[i].length * weight;
  }

  const echo = wordsPerName[0].join("");
  return (name: string) => {
    const nameWords = splitWords(name);
    let score = 0;
    for (const word of new Set(nameWords)) {
      score += weights.get(word) ?? 0;
    }
    return echo && nameWords.join("") === echo ? score + ECHO_BONUS : score;
  };
}

/** Scripts written without spaces, which `lodash.words` can't split. */
const UNSPACED_SCRIPTS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Khmer}\p{Script=Lao}\p{Script=Myanmar}]/u;

/** Undefined on Firefox before version 125. */
const wordSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : undefined;

/**
 * `lodash.words` splits on case changes, spaces and punctuation, so unspaced
 * scripts come back as one word; those runs go to ICU's dictionary instead.
 * Both names compared go through this, so odd segmentation still matches.
 */
function splitWords(text: string): string[] {
  return words(text)
    .flatMap((word) =>
      wordSegmenter && UNSPACED_SCRIPTS.test(word)
        ? [...wordSegmenter.segment(word)]
            .filter((seg) => seg.isWordLike)
            .map((seg) => seg.segment)
        : [word],
    )
    .map((word) => word.toLowerCase());
}
