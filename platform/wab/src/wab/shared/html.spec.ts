import {
  _testOnlyUtils,
  normalizeHtmlWhitespace,
  trimAsciiWhitespace,
} from "@/wab/shared/html";

const { mkInlineContent } = _testOnlyUtils;

describe("normalizeHtmlWhitespace", () => {
  it("collapses newlines, tabs, and repeated spaces inside text to single spaces", () => {
    expect(normalizeHtmlWhitespace(["a\n\t  b   c"])).toEqual(["a b c"]);
  });

  it("removes spaces at the start and end of the text", () => {
    expect(normalizeHtmlWhitespace(["   Go   "])).toEqual(["Go"]);
  });

  it("keeps non-breaking spaces, which render as visible characters", () => {
    expect(normalizeHtmlWhitespace(["A\u00a0\u00a0B"])).toEqual([
      "A\u00a0\u00a0B",
    ]);
    // Only the ordinary edge spaces go; the non-breaking ones stay.
    expect(normalizeHtmlWhitespace([" \u00a0Go\u00a0 "])).toEqual([
      "\u00a0Go\u00a0",
    ]);
  });

  it("keeps the single space that separates text from a nested element", () => {
    expect(
      normalizeHtmlWhitespace(["Hello ", mkInlineContent("World")])
    ).toEqual(["Hello ", mkInlineContent("World")]);
  });

  it("shows one space, not two, when both sides of a boundary have one", () => {
    // The extra space hides inside the nested element, like
    // "Hello <strong> World</strong>".
    expect(
      normalizeHtmlWhitespace(["Hello ", mkInlineContent(" World")])
    ).toEqual(["Hello ", mkInlineContent("World")]);
  });

  it("removes a trailing space even when it sits inside a trailing nested element", () => {
    expect(
      normalizeHtmlWhitespace(["Hello ", mkInlineContent("World ")])
    ).toEqual(["Hello ", mkInlineContent("World")]);
  });

  it("cleans up source formatting around a nested element", () => {
    // "<p>\n  Hello\n  <strong>World</strong>\n</p>" after reading the element's parts.
    expect(
      normalizeHtmlWhitespace(["\n  Hello\n  ", mkInlineContent("World"), "\n"])
    ).toEqual(["Hello ", mkInlineContent("World")]);
  });

  it("drops pieces that have nothing visible left", () => {
    expect(normalizeHtmlWhitespace(["a ", " ", "b"])).toEqual(["a ", "b"]);
    expect(normalizeHtmlWhitespace([mkInlineContent("  "), "x"])).toEqual([
      "x",
    ]);
  });

  it("returns an empty list for whitespace-only content", () => {
    expect(normalizeHtmlWhitespace([" ", mkInlineContent(" \n ")])).toEqual([]);
  });

  it("normalizes text nested more than one level deep", () => {
    expect(
      normalizeHtmlWhitespace([
        "Read ",
        mkInlineContent("the ", mkInlineContent(" docs ")),
      ])
    ).toEqual(["Read ", mkInlineContent("the ", mkInlineContent("docs"))]);
  });
});

describe("trimAsciiWhitespace", () => {
  it("removes edge whitespace but keeps edge non-breaking spaces", () => {
    expect(trimAsciiWhitespace("\n \u00a0Go\u00a0 \t")).toEqual(
      "\u00a0Go\u00a0"
    );
  });
});
