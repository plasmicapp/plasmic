import { DataTokenRef } from "@/wab/commons/DataToken";
import { getSearchHits, SearchSpec } from "@/wab/shared/search";

/** Ingredients for token ranking */
interface Query {
  paramName: string;
  /** Names that help rank relevance; earlier ones weigh more. */
  ownerNames: readonly string[];
  /** What the user typed */
  searchText: string;
}

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

const DATA_TOKEN_SEARCH: SearchSpec<DataTokenRef> = {
  name: (ref) => ref.token.name,
  also: [
    {
      key: "value",
      get: (ref) => displayTokenValue(ref.token.value),
      compareAs: "literal",
    },
  ],
};

/**
 * Ranks data tokens for a param being edited.
 */
export function getDataTokenSuggestions(
  tokens: readonly DataTokenRef[],
  query: Query,
): DataTokenRef[] {
  const searchText = query.searchText.trim();
  const context = [query.paramName, ...query.ownerNames];
  if (searchText === "" && query.paramName.trim() === "") {
    return [];
  }
  const hits =
    searchText !== ""
      ? getSearchHits(tokens, DATA_TOKEN_SEARCH, {
          terms: searchText.split(/\s+/),
          context,
        })
      : getSearchHits(tokens, DATA_TOKEN_SEARCH, {
          terms: [query.paramName],
          tokenizeTerms: true,
          in: ["name"],
          matchWholeWords: true,
          context,
        });

  return hits.map((hit) => hit.item);
}
