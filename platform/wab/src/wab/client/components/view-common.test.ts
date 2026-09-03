import {
  getTextWithScrolling,
  Matcher,
  renderStyles,
} from "@/wab/client/components/view-common";
import { cx, tuple } from "@/wab/shared/common";

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
          "short searchable text"
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
          "text with newlines and tabs"
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

  describe("boldSnippetsWithScrolling", () => {
    it("should combine scrolling and bold highlighting", () => {
      const matcher = new Matcher("needs");
      const result = matcher.boldSnippetsWithScrolling(
        "This is a very long text that needs truncation for display",
        30
      );

      console.log("R1", result);
      // Result should be a React element
      expect(result).toBeTruthy();
    });

    it("should handle text without matches", () => {
      const matcher = new Matcher("notfound");
      const result = matcher.boldSnippetsWithScrolling(
        "This is a text without the search term",
        20
      );
      expect(result).toBeTruthy();
    });
  });
});
