import { _testOnlyUtils } from "@/wab/client/web-importer/html-parser";
import {
  parseAspectRatio,
  parseAspectRatioFromValueNode,
} from "@/wab/shared/css/aspect-ratio";
import { Value, parse } from "css-tree";

const { fixCSSValue } = _testOnlyUtils;

function getTestValueNode(testValue: string) {
  const testValueNode = parse(testValue, { context: "value" }) as Value;
  if (testValueNode.type !== "Value") {
    throw new Error(`Expected a Value node, but got ${testValueNode.type}`);
  }
  return testValueNode;
}

describe("parseAspectRatio", () => {
  describe("valid values", () => {
    it("should parse auto keyword", () => {
      expect(parseAspectRatio("auto")).toEqual({ aspectRatio: "auto" });
      expect(parseAspectRatio("  auto  ")).toEqual({ aspectRatio: "auto" });
    });

    it("should parse positive decimal numbers", () => {
      expect(parseAspectRatio("1.5")).toEqual({ aspectRatio: "1.5" });
      expect(parseAspectRatio("1.777")).toEqual({ aspectRatio: "1.777" });
      expect(parseAspectRatio("16")).toEqual({ aspectRatio: "16" });
      expect(parseAspectRatio("0.5")).toEqual({ aspectRatio: "0.5" });
      expect(parseAspectRatio("2")).toEqual({ aspectRatio: "2" });
    });

    it("should parse and normalize fractions", () => {
      expect(parseAspectRatio("16 / 9")).toEqual({ aspectRatio: "16/9" });
      expect(parseAspectRatio("16/9")).toEqual({ aspectRatio: "16/9" });
      expect(parseAspectRatio("4 / 3")).toEqual({ aspectRatio: "4/3" });
      expect(parseAspectRatio("21/9")).toEqual({ aspectRatio: "21/9" });
      expect(parseAspectRatio("1 / 1")).toEqual({ aspectRatio: "1/1" });
    });

    it("should parse fractions with various spacing", () => {
      expect(parseAspectRatio("16 /9")).toEqual({ aspectRatio: "16/9" });
      expect(parseAspectRatio("16/ 9")).toEqual({ aspectRatio: "16/9" });
      expect(parseAspectRatio("16  /  9")).toEqual({ aspectRatio: "16/9" });
    });

    it("should parse fractions with decimals", () => {
      expect(parseAspectRatio("16.5 / 9")).toEqual({ aspectRatio: "16.5/9" });
      expect(parseAspectRatio("16 / 9.5")).toEqual({ aspectRatio: "16/9.5" });
      expect(parseAspectRatio("1.5 / 1.5")).toEqual({ aspectRatio: "1.5/1.5" });
    });
  });

  describe("invalid values", () => {
    it("should reject empty string", () => {
      expect(parseAspectRatio("")).toEqual({});
      expect(parseAspectRatio("  ")).toEqual({});
    });

    it("should reject zero or negative numbers", () => {
      expect(parseAspectRatio("0")).toEqual({});
      expect(parseAspectRatio("-1")).toEqual({});
      expect(parseAspectRatio("-1.5")).toEqual({});
      expect(parseAspectRatio("0 / 9")).toEqual({});
      expect(parseAspectRatio("16 / 0")).toEqual({});
      expect(parseAspectRatio("-16 / 9")).toEqual({});
      expect(parseAspectRatio("16 / -9")).toEqual({});
    });

    it("should reject invalid fraction syntax", () => {
      expect(parseAspectRatio("16 / 9 / 2")).toEqual({});
      expect(parseAspectRatio("/ 9")).toEqual({});
      expect(parseAspectRatio("16 /")).toEqual({});
      expect(parseAspectRatio("/")).toEqual({});
    });

    it("should reject non-numeric values", () => {
      expect(parseAspectRatio("abc")).toEqual({});
      expect(parseAspectRatio("16px")).toEqual({});
      expect(parseAspectRatio("16 / 9px")).toEqual({});
    });

    it("should reject operators other than division", () => {
      expect(parseAspectRatio("16 + 9")).toEqual({});
      expect(parseAspectRatio("16 - 9")).toEqual({});
      expect(parseAspectRatio("16 * 9")).toEqual({});
    });
  });
});

describe("parseAspectRatioFromValueNode (HTML parser integration)", () => {
  it("parses aspect-ratio: auto", () => {
    const testValue = "auto";
    const testValueNode = getTestValueNode(testValue);
    const result = parseAspectRatioFromValueNode(testValueNode);
    expect(result).toEqual({ aspectRatio: "auto" });
    expect(result).toEqual(fixCSSValue("aspect-ratio", testValue));
  });

  it("parses aspect-ratio with decimal", () => {
    const testValue = "1.5";
    const testValueNode = getTestValueNode(testValue);
    const result = parseAspectRatioFromValueNode(testValueNode);
    expect(result).toEqual({ aspectRatio: "1.5" });
    expect(result).toEqual(fixCSSValue("aspect-ratio", testValue));
  });

  it("parses and normalizes aspect-ratio with fraction", () => {
    const testValue = "16 / 9";
    const testValueNode = getTestValueNode(testValue);
    const result = parseAspectRatioFromValueNode(testValueNode);
    expect(result).toEqual({ aspectRatio: "16/9" });
    expect(result).toEqual(fixCSSValue("aspect-ratio", testValue));
  });

  it("parses aspect-ratio with fraction without spaces", () => {
    const testValue = "16/9";
    const testValueNode = getTestValueNode(testValue);
    const result = parseAspectRatioFromValueNode(testValueNode);
    expect(result).toEqual({ aspectRatio: "16/9" });
    expect(result).toEqual(fixCSSValue("aspect-ratio", testValue));
  });

  it("returns empty object for invalid aspect-ratio", () => {
    const testValue = "invalid";
    const testValueNode = getTestValueNode(testValue);
    const result = parseAspectRatioFromValueNode(testValueNode);
    expect(result).toEqual({});
    expect(result).toEqual(fixCSSValue("aspect-ratio", testValue));
  });
});
