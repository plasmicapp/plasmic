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
    expect(isValidJsIdentifier("variable-name")).toBe(true); // BUG Contains hyphen
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
});
