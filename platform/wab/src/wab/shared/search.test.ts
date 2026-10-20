import { getSearchHits, SearchQuery, SearchSpec } from "@/wab/shared/search";

interface Item {
  name: string;
  value?: string;
}

const SPEC: SearchSpec<Item> = {
  name: (item) => item.name,
  also: [{ key: "value", get: (item) => item.value, compareAs: "literal" }],
};

/** Names of the items `query` finds, best first. */
function search(items: (string | Item)[], query: SearchQuery): string[] {
  return getSearchHits(
    items.map((item) => (typeof item === "string" ? { name: item } : item)),
    SPEC,
    query,
  ).map((hit) => hit.item.name);
}

describe("getSearchHits", () => {
  it("ranks exact, then prefix, then word prefix, then substring matches", () => {
    expect(
      search(["ghostText", "strapiHost", "hostname", "host"], {
        terms: ["host"],
      }),
    ).toEqual(["host", "hostname", "strapiHost", "ghostText"]);
  });

  it("ignores case, spaces, punctuation and camelCase in names", () => {
    const found = search(
      ["ArrowRight", "arrow-right", "arrow_right", "arrow"],
      {
        terms: ["Arrow Right"],
      },
    );
    expect(found).toHaveLength(3);
    expect(found).toEqual(
      expect.arrayContaining(["ArrowRight", "arrow-right", "arrow_right"]),
    );
  });

  it("keeps a term with spaces as one phrase, in its word order", () => {
    expect(
      search(["arrow-right", "right-arrow"], { terms: ["arrow right"] }),
    ).toEqual(["arrow-right"]);
  });

  it("matches each word of a term on its own with tokenizeTerms", () => {
    expect(
      search(["apiProdKey", "keyApi", "apiSecret"], {
        terms: ["apiKey"],
        tokenizeTerms: true,
      }),
    ).toEqual(["apiProdKey", "keyApi"]);
  });

  it("requires every term unless asked for any", () => {
    const items = ["arrow-right", "right-arrow", "chevron-right"];
    expect(search(items, { terms: ["arrow", "right"] })).toEqual([
      "arrow-right",
      "right-arrow",
    ]);
    // Items matching more terms come first.
    expect(
      search(items, { terms: ["arrow", "right"], require: "any" }),
    ).toEqual(["arrow-right", "right-arrow", "chevron-right"]);
  });

  it("matches literal values with their punctuation", () => {
    const tokens = [
      { name: "overlay", value: "rgba(0, 0, 0, 0.5)" },
      { name: "gutter", value: "105px" },
      { name: "half", value: "0.5" },
    ];
    expect(search(tokens, { terms: ["0.5"] })).toEqual(["half", "overlay"]);
  });

  it("ranks name matches above value matches, saying which field matched", () => {
    const hits = getSearchHits(
      [
        { name: "brand", value: "blue" },
        { name: "blueish", value: "#3B82F6" },
      ],
      SPEC,
      { terms: ["blue"] },
    );
    expect(hits.map((hit) => [hit.item.name, hit.match])).toEqual([
      ["blueish", { field: "name", text: "blueish" }],
      ["brand", { field: "value", text: "blue" }],
    ]);
  });

  it("searches only the fields listed in `in`", () => {
    expect(
      search([{ name: "brand", value: "blue" }, "blueish"], {
        terms: ["blue"],
        in: ["name"],
      }),
    ).toEqual(["blueish"]);
  });

  it("matches only whole words with matchWholeWords", () => {
    expect(
      search(["ghostText", "strapiHost", "hostname", "host"], {
        terms: ["host"],
        matchWholeWords: true,
      }),
    ).toEqual(["host", "strapiHost"]);
  });

  it("ranks names echoing earlier context names first, keeping the others", () => {
    expect(
      search(["apiHost", "footer", "host", "strapiHost", "strapiQueryHost"], {
        terms: [],
        context: ["host", "Strapi Query"],
      }),
    ).toEqual(["strapiQueryHost", "strapiHost", "host", "apiHost", "footer"]);
  });

  it("returns every item in natural name order when there are no terms", () => {
    expect(search(["item10", "item2", "item1"], { terms: [" "] })).toEqual([
      "item1",
      "item2",
      "item10",
    ]);
  });
});
