import {
  getTextWithScrolling,
  Matcher,
  renderStyles,
} from "@/wab/client/components/view-common";
import { cx, tuple } from "@/wab/shared/common";
import { renderToStaticMarkup } from "react-dom/server";

describe("cx", () =>
  it("should work", function () {
    expect(cx(tuple("a", "b"))).toBe("a b");
    return expect(cx({ a: false, b: true })).toBe("b");
  }));

describe("renderStyles", () => {
  it("works", () => {
    const x = renderStyles({
      boxShadow: "none",
      borderBottom: "1px solid gray !important",
    });
    expect(x).toBe("box-shadow:none;border-bottom:1px solid gray !important");
  });
});

describe("Matcher", () => {
  it.each(["Text", "New page", "undefined"])(
    "does not match a missing group label for %j",
    (query) => {
      for (const matchCode of [false, true]) {
        const matcher = new Matcher(query, { matchCode });
        expect(matcher.matches(undefined)).toBe(false);
        expect(matcher.findMatchIndex(undefined)).toBe(-1);
      }
    },
  );

  describe("getTextWithScrolling", () => {
    describe("without matcher (no search query)", () => {
      it("returns text unchanged if within max length", () => {
        const text = "short text";
        expect(getTextWithScrolling(text, 20)).toBe("short text");
      });

      it("normalizes whitespace", () => {
        const text = "  multiple   spaces  ";
        expect(getTextWithScrolling(text, 30)).toBe("multiple spaces");
      });

      it("truncates at word boundary when text is too long", () => {
        const text = "This is a very long text that needs to be truncated";
        const result = getTextWithScrolling(text, 20);
        expect(result).toBe("This is a very long...");
        expect(result.length).toBeLessThanOrEqual(23); // 20 + "..."
      });

      it("truncates at punctuation boundary when no good word boundary", () => {
        const text = "someReallyLongFunctionName.property.value";
        const result = getTextWithScrolling(text, 30);
        expect(result).toBe("someReallyLongFunctionName....");
      });

      it("handles text with no good boundaries", () => {
        const text = "verylongtextwithoutanyspacesorboundaries";
        const result = getTextWithScrolling(text, 10);
        expect(result).toBe("verylongte...");
      });
    });

    describe("with matcher search query", () => {
      it("returns full text if within max length regardless of match", () => {
        const text = "short searchable text";
        const matcher = new Matcher("search");
        expect(getTextWithScrolling(text, 30, matcher)).toBe(
          "short searchable text",
        );
      });

      it("truncates normally if match is early in text", () => {
        const text =
          "The search term is at the beginning and this is a long text";
        const matcher = new Matcher("search");
        const result = getTextWithScrolling(text, 25, matcher);
        expect(result).toBe("The search term is at the...");
      });

      it("scrolls to show match when it's later in text", () => {
        const text =
          "This is a long text where the searchterm appears later in the content";
        const matcher = new Matcher("searchterm");
        const result = getTextWithScrolling(text, 30, matcher);
        expect(result).toBe("...xt where the searchterm app...");
      });

      it("centers the match in the available window", () => {
        const text = "beginning middle searchterm middle end";
        const matcher = new Matcher("searchterm");
        const result = getTextWithScrolling(text, 20, matcher);
        expect(result).toBe("... middle searchter...");
      });

      it("handles match at the end of text", () => {
        const text =
          "This is a long text with the match at the very end searchterm";
        const matcher = new Matcher("searchterm");
        const result = getTextWithScrolling(text, 25, matcher);
        expect(result).toBe("...he very end searchterm");
      });

      it("handles no match gracefully", () => {
        const text = "This text does not contain the search query";
        const matcher = new Matcher("notfound");
        const result = getTextWithScrolling(text, 20, matcher);
        // Falls back to normal truncation
        expect(result).toBe("This text does not...");
      });

      it("handles case-insensitive matching", () => {
        const text = "The SEARCHTERM is in uppercase here";
        const matcher = new Matcher("searchterm");
        const result = getTextWithScrolling(text, 20, matcher);
        expect(result).toContain("SEARCHTERM");
      });

      it("adjusts window when match is near the end", () => {
        const text = "Short prefix then searchterm";
        const matcher = new Matcher("searchterm");
        const result = getTextWithScrolling(text, 20, matcher);
        expect(result).toBe("...ix then searchter...");
      });

      it("handles very long search terms", () => {
        const text =
          "Text with a verylongsearchtermthatexceedswindow in the middle";
        const matcher = new Matcher("verylongsearchtermthatexceedswindow");
        const result = getTextWithScrolling(text, 20, matcher);
        expect(result).toBe("... with a verylongs...");
      });

      it("preserves exact match when scrolling", () => {
        const text =
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do";
        const matcher = new Matcher("adipiscing");
        const result = getTextWithScrolling(text, 30, matcher);
        expect(result).toBe("... consectetur adipiscing eli...");
      });
    });

    describe("edge cases", () => {
      it("handles empty text", () => {
        expect(getTextWithScrolling("", 20)).toBe("");
      });

      it("handles text exactly at max length", () => {
        const text = "12345678901234567890"; // exactly 20 chars
        expect(getTextWithScrolling(text, 20)).toBe(text);
      });

      it("handles text one character over max length", () => {
        const text = "123456789012345678901"; // 21 chars
        const result = getTextWithScrolling(text, 20);
        expect(result).toBe("12345678901234567890...");
      });

      it("handles multiple consecutive spaces", () => {
        const text = "text    with     many      spaces";
        expect(getTextWithScrolling(text, 50)).toBe("text with many spaces");
      });

      it("handles newlines and tabs", () => {
        const text = "text\nwith\nnewlines\tand\ttabs";
        expect(getTextWithScrolling(text, 50)).toBe(
          "text with newlines and tabs",
        );
      });

      it("handles very small max length", () => {
        const text = "Some text here";
        const result = getTextWithScrolling(text, 5);
        expect(result).toBe("Some...");
      });

      it("handles match at position exactly at maxLength - 10", () => {
        const text = "0123456789 match here";
        const matcher = new Matcher("match");
        // Match is at index 11, maxLength is 21, so 11 === 21 - 10
        const result = getTextWithScrolling(text, 21, matcher);
        // Should not scroll since match is exactly at the threshold
        expect(result).toBe("0123456789 match here");
      });
    });
  });

  // Each string is the expected highlighted text; false means no match.
  // Brackets stand for <strong> tags. "base" explicitly disables both options;
  // the constructor's default actually enables matchMiddleOfWord.
  function expectMatcher(
    text: string,
    query: string,
    expected: {
      base: string | false;
      matchCode: string | false;
      matchMiddleOfWord: string | false;
      matchCodeAndMiddleOfWord: string | false;
    },
  ) {
    const options = {
      base: { matchCode: false, matchMiddleOfWord: false },
      matchCode: { matchCode: true, matchMiddleOfWord: false },
      matchMiddleOfWord: { matchCode: false, matchMiddleOfWord: true },
      matchCodeAndMiddleOfWord: { matchCode: true, matchMiddleOfWord: true },
    };
    for (const mode of Object.keys(options) as (keyof typeof options)[]) {
      it(`${JSON.stringify(text)} / ${JSON.stringify(query)} (${mode})`, () => {
        const matcher = new Matcher(query, options[mode]);
        expect(matcher.matches(text)).toBe(expected[mode] !== false);
        if (expected[mode] !== false) {
          const element = document.createElement("div");
          element.innerHTML = renderToStaticMarkup(
            matcher.boldSnippets(text) as React.ReactElement,
          );
          element.querySelectorAll("strong").forEach((strong) => {
            strong.replaceWith(`[${strong.textContent}]`);
          });
          expect(element.textContent).toBe(expected[mode]);
        }
        expect(new Matcher(query).matches(text)).toBe(
          expected.matchMiddleOfWord !== false,
        );
      });
    }
  }

  expectMatcher("itemsCount", "items count", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: "[items][Count]",
    matchCodeAndMiddleOfWord: "[items][Count]",
  });
  expectMatcher("items.count", "items count", {
    base: "[items].[count]",
    matchCode: "[items].[count]",
    matchMiddleOfWord: "[items].[count]",
    matchCodeAndMiddleOfWord: "[items].[count]",
  });
  // Code mode ignores formatting around symbols, but never splits identifiers.
  expectMatcher("items . count", "items.count", {
    base: false,
    matchCode: "[items . count]",
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: "[items . count]",
  });
  expectMatcher("items Count", "itemsCount", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: false,
  });
  expectMatcher("caf é", "café", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: false,
  });
  expectMatcher("café . count", "café.count", {
    base: false,
    matchCode: "[café . count]",
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: "[café . count]",
  });
  // Only code mode lets the gap between query words cross a newline.
  expectMatcher("items\ncount", "items count", {
    base: false,
    matchCode: "[items]\n[count]",
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: "[items]\n[count]",
  });
  // Query words may skip intervening text, but must occur in query order.
  expectMatcher("section.items.length", "section length", {
    base: "[section].items.[length]",
    matchCode: "[section].items.[length]",
    matchMiddleOfWord: "[section].items.[length]",
    matchCodeAndMiddleOfWord: "[section].items.[length]",
  });
  expectMatcher("section.items.length", "length section", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: false,
  });
  // A symbol at the start still obeys the existing word-boundary option.
  expectMatcher("`${ itemsCount } items`", "${itemsCount}", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: "`[${ itemsCount }] items`",
  });
  expectMatcher("items.+(count)", "items.+(count)", {
    base: "[items.+(count)]",
    matchCode: "[items.+(count)]",
    matchMiddleOfWord: "[items.+(count)]",
    matchCodeAndMiddleOfWord: "[items.+(count)]",
  });
  // Prefer the longest overlapping query word when highlighting.
  expectMatcher("items item", "item items", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: false,
  });
  expectMatcher("item items", "item items", {
    base: "[item] [items]",
    matchCode: "[item] [items]",
    matchMiddleOfWord: "[item] [items]",
    matchCodeAndMiddleOfWord: "[item] [items]",
  });
  // Suppress one-character highlights only when longer query words exist.
  expectMatcher("ab ? b : c", "ab ?", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: "[ab] ? b : c",
    matchCodeAndMiddleOfWord: "[ab] ? b : c",
  });
  expectMatcher("ab ? b : c", "? :", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: "ab [?] b [:] c",
    matchCodeAndMiddleOfWord: "ab [?] b [:] c",
  });
  expectMatcher("Items", "  ", {
    base: "Items",
    matchCode: "Items",
    matchMiddleOfWord: "Items",
    matchCodeAndMiddleOfWord: "Items",
  });
  expectMatcher("", "items", {
    base: false,
    matchCode: false,
    matchMiddleOfWord: false,
    matchCodeAndMiddleOfWord: false,
  });

  it("rejects a missing final word in repetitive code and scrolling text", () => {
    const matcher = new Matcher("a b c missing", { matchCode: true });
    const text = "a b c\n".repeat(400);
    expect(matcher.matches(text)).toBe(false);
    expect(getTextWithScrolling(text, 30, matcher)).toBe(
      getTextWithScrolling(text, 30),
    );
  });

  it("resets word searches across calls and does not reuse overlapping matches", () => {
    const matcher = new Matcher("aba ba", { matchCode: true });
    expect(matcher.findMatchIndex("aba")).toBe(-1);
    expect(matcher.findMatchIndex("xx aba ba")).toBe(3);
    expect(matcher.findMatchIndex("aba ba")).toBe(0);
    expect(matcher.matches("ba aba")).toBe(false);
  });

  it.each(["\n", "\r", "\u2028", "\u2029", "\r\n"])(
    "restarts non-code matching after a line separator %j",
    (separator) => {
      const matcher = new Matcher("items count");
      expect(matcher.matches(`items${separator}count`)).toBe(false);
      const prefix = `items${separator}count${separator}`;
      expect(matcher.findMatchIndex(prefix + "items count")).toBe(
        prefix.length,
      );
      expect(
        new Matcher("items count", { matchCode: true }).findMatchIndex(
          `items${separator}count`,
        ),
      ).toBe(0);
    },
  );

  describe("boldSnippetsWithScrolling", () => {
    const code = [
      "const itemsCount = $props.section.items.length;",
      '`${ itemsCount } ${ itemsCount === 1 ? "Item" : "Items" }`',
    ].join("\n");

    it("matches a pasted template despite formatting differences", () => {
      const query = '`${itemsCount} ${itemsCount === 1 ? "Item" : "Items"}`';
      expect(new Matcher(query, { matchCode: true }).matches(code)).toBe(true);
      expect(new Matcher(query).matches(code)).toBe(false);
    });

    it("scrolls and highlights when whitespace around symbols differs", () => {
      const matcher = new Matcher("items.count", { matchCode: true });
      const text = "const a = 1;\n".repeat(5) + "items . count";
      expect(
        renderToStaticMarkup(
          matcher.boldSnippetsWithScrolling(text, 40) as React.ReactElement,
        ),
      ).toBe(
        "<span>...nst a = 1; const a = 1; <strong>items . count</strong></span>",
      );
    });

    it("highlights each word even when the snippet cuts off the full match", () => {
      const matcher = new Matcher("itemsCount Items", { matchCode: true });
      expect(
        renderToStaticMarkup(
          matcher.boldSnippetsWithScrolling(code, 30) as React.ReactElement,
        ),
      ).toBe("<span>const <strong>itemsCount</strong> = $props....</span>");
    });

    it("truncates normally without a match", () => {
      expect(
        renderToStaticMarkup(
          new Matcher("notfound").boldSnippetsWithScrolling(
            "This is a text without the search term",
            20,
          ) as React.ReactElement,
        ),
      ).toBe("<span>This is a text...</span>");
    });
  });
});
