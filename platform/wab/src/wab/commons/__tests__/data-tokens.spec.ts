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

  test("should return 'any' type for complex JSON types (objects, arrays, booleans, null)", () => {
    expect(getDataTokenType("true")).toBe("any");
    expect(getDataTokenType("false")).toBe("any");
    expect(getDataTokenType("null")).toBe("any");
    expect(getDataTokenType('{"key": "value"}')).toBe("any");
    expect(getDataTokenType("[1, 2, 3]")).toBe("any");
    expect(getDataTokenType('{"nested": {"key": 123}}')).toBe("any");
  });

  test("should return 'any' type for plain text and invalid JSON inputs", () => {
    expect(getDataTokenType("hello")).toBe("any");
    expect(getDataTokenType("hello world")).toBe("any");
    expect(getDataTokenType("123A")).toBe("any");
    expect(getDataTokenType("")).toBe("any");
    expect(getDataTokenType("NaN")).toBe("any");
    expect(getDataTokenType("undefined")).toBe("any");
    expect(getDataTokenType("Infinity")).toBe("any");
  });
});
