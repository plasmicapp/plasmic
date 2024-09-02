import { isValidJsIdentifier } from "@/wab/shared/utils/regex-js-identifier";

describe("isValidJsIdentifier", () => {
  it("should return true for a valid variable name", () => {
    expect(isValidJsIdentifier("variable")).toBe(true);
    expect(isValidJsIdentifier("_variable")).toBe(true);
    expect(isValidJsIdentifier("$variable")).toBe(true);
    expect(isValidJsIdentifier("variable1")).toBe(true);
    expect(isValidJsIdentifier("_1variable")).toBe(true);
    expect(isValidJsIdentifier("$1variable")).toBe(true);
    expect(isValidJsIdentifier("v4r1abl3")).toBe(true);
  });

  it("should return false for an invalid variable name", () => {
    expect(isValidJsIdentifier("")).toBe(false); // Empty string
    expect(isValidJsIdentifier("variable name")).toBe(false); // Contains space
    expect(isValidJsIdentifier("variable-name")).toBe(false); // Contains hyphen
    expect(isValidJsIdentifier("var!able")).toBe(false); // Contains invalid character '!'
    expect(isValidJsIdentifier("1variable")).toBe(false); // Starts with a number
    expect(isValidJsIdentifier("123")).toBe(false); // All numeric
  });

  it("should return false for reserved keywords", () => {
    expect(isValidJsIdentifier("if")).toBe(false);
    expect(isValidJsIdentifier("for")).toBe(false);
    expect(isValidJsIdentifier("return")).toBe(false);
    expect(isValidJsIdentifier("function")).toBe(false);
    expect(isValidJsIdentifier("class")).toBe(false);
  });

  it("should return true for a valid variable name with multiple underscores or dollar signs", () => {
    expect(isValidJsIdentifier("$$__valid__$$")).toBe(true);
    expect(isValidJsIdentifier("___variable")).toBe(true);
    expect(isValidJsIdentifier("variable$$")).toBe(true);
  });

  it("should true for scripts with marks a\u0300\u0308\u0304 \u092C\u093E\u0930\u0924", () => {
    expect(isValidJsIdentifier("a\u0300\u0308\u0304")).toBe(true);
    expect(isValidJsIdentifier("\u092C\u093E\u0930\u0924")).toBe(true);
  });

  it("should return false for scripts with zero-width joiners/non-joiners (because of prettier)", () => {
    // Persian
    expect(isValidJsIdentifier("\u0644\u0627")).toBe(true); // without joiner
    expect(isValidJsIdentifier("\u0644\u200C\u0627")).toBe(false);

    // Hindi
    expect(isValidJsIdentifier("\u0915\u094D\u0937")).toBe(true); // without joiner
    expect(isValidJsIdentifier("\u0915\u094D\u200C\u0937")).toBe(false);
    expect(isValidJsIdentifier("\u0915\u094D\u200D\u0937")).toBe(false);
  });

  it("should return false for basic unicode symbols \u0CA0\u005F\u0CA0", () => {
    expect(isValidJsIdentifier("symbols\u0CA0\u005F\u0CA0")).toBe(true);
  });

  it("should return false for emojis \uD83D\uDE00 \uD83D\uDE2D \uD83D\uDE4B\u200D\u2642\uFE0F", () => {
    // basic emojis
    expect(isValidJsIdentifier("emoji\uD83D\uDE00")).toBe(false);
    expect(isValidJsIdentifier("emoji\uD83D\uDE2D")).toBe(false);

    // complex emoji with zero-width joiner and variation selector
    expect(isValidJsIdentifier("emoji\uD83D\uDE4B\u200D\u2642\uFE0F")).toBe(
      false
    );
  });
});
