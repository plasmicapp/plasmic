import {
  _testOnlyMentionUtils,
  matchScore,
} from "@/wab/client/components/mentions/useMentions";

const { getMentionStartIndex, findMentionText } = _testOnlyMentionUtils;

const better = (a: number | undefined, b: number | undefined) =>
  (a ?? -Infinity) > (b ?? -Infinity);

describe("getMentionStartIndex", () => {
  it("returns -1 when the caret isn't in a mention", () => {
    expect(getMentionStartIndex("", 0)).toBe(-1);
    expect(getMentionStartIndex("Hello world", 11)).toBe(-1);
  });

  it("finds the `@` that opens the mention", () => {
    expect(getMentionStartIndex("@John", 5)).toBe(0);
    expect(getMentionStartIndex("Hello @John", 11)).toBe(6);
    expect(getMentionStartIndex("Hello @Jo", 9)).toBe(6);
  });

  it("requires the `@` to start the input or follow whitespace", () => {
    expect(getMentionStartIndex("email a@b.com", 13)).toBe(-1);
    expect(getMentionStartIndex("Hello\n@John", 11)).toBe(6);
    expect(getMentionStartIndex("Hello   @John", 9)).toBe(8);
  });

  it("allows spaces within the mention", () => {
    expect(getMentionStartIndex("Hello @Home Pa", 14)).toBe(6);
  });

  it("ends the mention at `>` or a newline", () => {
    expect(getMentionStartIndex("@<page:Home>", 12)).toBe(-1);
    expect(getMentionStartIndex("@John\nmore", 10)).toBe(-1);
  });
});

describe("findMentionText", () => {
  it("should return undefined when caret is at the start of a string", () => {
    expect(findMentionText("", 0)).toBe(undefined);
    expect(findMentionText("@<Hello>", 0)).toBe(undefined);
  });

  it("should return undefined when no @ is found", () => {
    expect(findMentionText("Hello", 5)).toBe(undefined);
    expect(findMentionText("Hello world", 11)).toBe(undefined);
  });

  it("should find mention text when caret is at the end of a mention", () => {
    expect(findMentionText("Hello @John", 11)).toBe("John");
    expect(findMentionText("Hello @<John", 12)).toBe("John");
  });

  it("should find partial mention text when caret is in the middle of a mention", () => {
    expect(findMentionText("Hello @Jo", 9)).toBe("Jo");
    expect(findMentionText("Hello @<Jo", 10)).toBe("Jo");
  });

  it("should handle multiple mentions correctly", () => {
    expect(findMentionText("Hello @John and @Jane", 11)).toBe("John");
    expect(findMentionText("Hello @John and @<Jane", 22)).toBe("Jane");
  });

  it("should handle @ character without following text", () => {
    expect(findMentionText("Hello @", 7)).toBe("");
    expect(findMentionText("Hello @<", 8)).toBe("");
  });

  it("should not handle @ character in the middle of text without any space", () => {
    expect(findMentionText("Hello@John", 10)).toBe(undefined);
  });

  it("includes spaces in a multi-word mention", () => {
    expect(findMentionText("Hello @Home Pa", 14)).toBe("Home Pa");
    expect(findMentionText("Hello @Home Page and", 16)).toBe("Home Page");
  });

  it("should handle mentions with special characters", () => {
    expect(findMentionText("Hello @John.Doe", 15)).toBe("John.Doe");
    expect(findMentionText("Hello @John_Doe", 15)).toBe("John_Doe");
    expect(findMentionText("Hello @<John_Doe", 16)).toBe("John_Doe");
  });

  it("should handle mentions with ending angle brackets properly", () => {
    expect(findMentionText("Hello @<John_Doe>", 15)).toBe("John_Do");
    expect(findMentionText("Hello @<John_Doe>", 16)).toBe("John_Doe");
    expect(findMentionText("Hello @<John_Doe>", 17)).toBe(undefined);
    expect(findMentionText("Hello @<John_Doe>.Hi", 20)).toBe(undefined);
  });
});

describe("matchScore", () => {
  it("returns undefined when nothing matches", () => {
    expect(matchScore(["Homepage"], "zzz")).toBeUndefined();
  });

  it("matches equally on an empty query", () => {
    expect(matchScore(["anything"], "")).toBe(0);
  });

  it("matches a punctuated query against the whole string", () => {
    // The email is one searchable string, so "john.doe" prefixes it directly.
    expect(
      matchScore(["John", "Doe", "john.doe@x.com"], "john.doe")
    ).not.toBeUndefined();
    expect(matchScore(["John", "Smith"], "john.doe")).toBeUndefined();
  });

  it("scores a prefix match above a substring match", () => {
    expect(
      better(matchScore(["hello"], "hel"), matchScore(["hello"], "ell"))
    ).toBe(true);
  });

  it("prefers an earlier field (earlier array entry)", () => {
    // Query matches the last name; the same query matching the first name wins.
    expect(
      better(
        matchScore(["Jo", "Smith"], "jo"),
        matchScore(["Jo", "Smith"], "smith")
      )
    ).toBe(true);
  });
});
