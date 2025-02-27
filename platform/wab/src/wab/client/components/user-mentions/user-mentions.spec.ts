import { _testOnlyUserMentionsUtils } from "@/wab/client/components/user-mentions/useUserMentions";

const { getTokenStartIndex, findMentionText, completeMention } =
  _testOnlyUserMentionsUtils;

describe("getTokenStartIndex", () => {
  it("should return the current index when at the start of a string", () => {
    expect(getTokenStartIndex("", 0)).toBe(0);
    expect(getTokenStartIndex("Hello", 0)).toBe(0);
  });

  it("should find the start of a token when caret is at the end of a token", () => {
    expect(getTokenStartIndex("Hello", 5)).toBe(0);
    expect(getTokenStartIndex("Hello world", 5)).toBe(0);
  });

  it("should handle multiple words correctly", () => {
    expect(getTokenStartIndex("Hello world", 11)).toBe(6);
    expect(getTokenStartIndex("Hello world friends", 11)).toBe(6);
  });

  it("should work with mentions", () => {
    expect(getTokenStartIndex("Hello @John", 11)).toBe(6);
    expect(getTokenStartIndex("@John", 5)).toBe(0);
  });

  it("should work with newlines", () => {
    expect(getTokenStartIndex("Hello\n@John", 11)).toBe(6);
    expect(getTokenStartIndex("\n\n@John", 5)).toBe(2);
  });

  it("should handle caret in the middle of a token", () => {
    expect(getTokenStartIndex("Hello world", 8)).toBe(6);
    expect(getTokenStartIndex("Hello @Jo", 9)).toBe(6);
  });

  it("should handle multiple spaces correctly", () => {
    expect(getTokenStartIndex("Hello  world", 7)).toBe(7);
    expect(getTokenStartIndex("Hello   @John", 9)).toBe(8);
    expect(getTokenStartIndex(" Hello", 3)).toBe(1);
  });
});

describe("findMentionText", () => {
  it("should return empty string when caret is at the start of a string", () => {
    expect(findMentionText("", 0)).toBe("");
    expect(findMentionText("@Hello", 0)).toBe("");
  });

  it("should return empty string when no @ is found", () => {
    expect(findMentionText("Hello", 5)).toBe("");
    expect(findMentionText("Hello world", 11)).toBe("");
  });

  it("should find mention text when caret is at the end of a mention", () => {
    expect(findMentionText("Hello @John", 11)).toBe("@John");
    expect(findMentionText("@John", 5)).toBe("@John");
  });

  it("should find partial mention text when caret is in the middle of a mention", () => {
    expect(findMentionText("Hello @Jo", 9)).toBe("@Jo");
    expect(findMentionText("Hello @John", 9)).toBe("@Jo");
    expect(findMentionText("@J", 2)).toBe("@J");
  });

  it("should handle multiple mentions correctly", () => {
    expect(findMentionText("Hello @John and @Jane", 11)).toBe("@John");
    expect(findMentionText("Hello @John and @Jane", 21)).toBe("@Jane");
  });

  it("should handle @ character without following text", () => {
    expect(findMentionText("Hello @", 7)).toBe("@");
  });

  it("should not handle @ character in the middle of text without any space", () => {
    expect(findMentionText("Hello@John", 10)).toBe("");
  });

  it("should handle mentions with special characters", () => {
    expect(findMentionText("Hello @John.Doe", 15)).toBe("@John.Doe");
    expect(findMentionText("Hello @John_Doe", 15)).toBe("@John_Doe");
  });
});

describe("completeMention", () => {
  it("should replace mention text with email and maintain cursor position", () => {
    // Basic case: replace @John with @john@example.com
    const result1 = completeMention("Hello @John", 11, "john@example.com");
    expect(result1.newValue).toBe("Hello @john@example.com ");
    expect(result1.newCaretPosition).toBe(24);

    // When mention is at the start of the string
    const result2 = completeMention("@Jane there", 5, "jane@example.com");
    expect(result2.newValue).toBe("@jane@example.com  there");
    expect(result2.newCaretPosition).toBe(18);
  });

  it("should correctly handle partial mentions", () => {
    // Partial mention: @Jo -> @john@example.com
    const result = completeMention("Hello @Jo", 9, "john@example.com");
    expect(result.newValue).toBe("Hello @john@example.com ");
    expect(result.newCaretPosition).toBe(24);
  });

  it("should handle text after the mention", () => {
    // Text after mention: "Hello @John there" -> "Hello @john@example.com there"
    const result = completeMention("Hello @John there", 11, "john@example.com");
    expect(result.newValue).toBe("Hello @john@example.com  there");
    expect(result.newCaretPosition).toBe(24);
  });

  it("should handle mentions in the middle of text", () => {
    // Mention in the middle: "Start @John end" -> "Start @john@example.com end"
    const result = completeMention("Start @John end", 11, "john@example.com");
    expect(result.newValue).toBe("Start @john@example.com  end");
    expect(result.newCaretPosition).toBe(24);

    // Complete an existing mention by keeping the caret in the middle of it.
    const result2 = completeMention(
      "Start @john@example.com end",
      9,
      "john@example.com"
    );
    expect(result2.newValue).toBe("Start @john@example.com hn@example.com end");
  });

  it("should handle just the @ symbol correctly", () => {
    // Just @ symbol: "Hello @" -> "Hello @john@example.com "
    const result = completeMention("Hello @", 7, "john@example.com");
    expect(result.newValue).toBe("Hello @john@example.com ");
    expect(result.newCaretPosition).toBe(24);
  });
});
