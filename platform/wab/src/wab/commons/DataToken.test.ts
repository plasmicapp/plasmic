import { getDataTokenType } from "@/wab/commons/DataToken";

describe("getDataTokenType", () => {
  test("should return 'number' type for valid JSON numeric values", () => {
    expect(getDataTokenType("42")).toBe("number");
    expect(getDataTokenType("3.14")).toBe("number");
    expect(getDataTokenType("-10")).toBe("number");
    expect(getDataTokenType("0")).toBe("number");
    expect(getDataTokenType(" 123 ")).toBe("number");
  });

  test("should return 'string' type for valid JSON string values", () => {
    expect(getDataTokenType('"hello"')).toBe("string");
    expect(getDataTokenType('"hello world"')).toBe("string");
    expect(getDataTokenType('""')).toBe("string");
  });

  test("should return 'code' type for complex JSON types (objects, arrays, booleans, null)", () => {
    expect(getDataTokenType("true")).toBe("code");
    expect(getDataTokenType("false")).toBe("code");
    expect(getDataTokenType("null")).toBe("code");
    expect(getDataTokenType('{"key": "value"}')).toBe("code");
    expect(getDataTokenType("[1, 2, 3]")).toBe("code");
    expect(getDataTokenType('{"nested": {"key": 123}}')).toBe("code");
  });

  test("should return 'code' type for code expressions, plain text and invalid JSON inputs", () => {
    expect(getDataTokenType("2+3")).toBe("code");
    expect(getDataTokenType("hello")).toBe("code");
    expect(getDataTokenType("hello world")).toBe("code");
    expect(getDataTokenType("123A")).toBe("code");
    expect(getDataTokenType("")).toBe("code");
    expect(getDataTokenType("NaN")).toBe("code");
    expect(getDataTokenType("undefined")).toBe("code");
    expect(getDataTokenType("Infinity")).toBe("code");
  });
});
