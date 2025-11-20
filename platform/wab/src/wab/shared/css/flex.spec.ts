import { _testOnlyUtils } from "@/wab/client/web-importer/html-parser";
import { parseFlexShorthand } from "@/wab/shared/css/flex";
import { Value, parse } from "css-tree";
const { fixCSSValue } = _testOnlyUtils;

function getTestValueNode(testValue: string) {
  const testValueNode = parse(testValue, { context: "value" }) as Value;
  if (testValueNode.type !== "Value") {
    throw new Error(`Expected a Value node, but got ${testValueNode.type}`);
  }
  return testValueNode;
}

describe("parseFlexShorthand", () => {
  describe("keyword values", () => {
    it("parses flex: none", () => {
      const testValue = "none";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "0",
        flexShrink: "0",
        flexBasis: "auto",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: auto", () => {
      const testValue = "auto";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "auto",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: initial", () => {
      const testValue = "initial";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "0",
        flexShrink: "1",
        flexBasis: "auto",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });
  });

  describe("single value", () => {
    it("parses flex: 2 (single number as grow)", () => {
      const testValue = "2";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "2",
        flexShrink: "1",
        flexBasis: "0",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 10px (single dimension as basis)", () => {
      const testValue = "10px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "10px",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 30% (percentage as basis)", () => {
      const testValue = "30%";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "30%",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: calc(100% - 100px) (dimension as basis)", () => {
      const testValue = "calc(100% - 100px)";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "calc(100% - 100px)",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });
  });

  describe("two values", () => {
    it("parses flex: 2 3 (two numbers as grow shrink)", () => {
      const testValue = "2 3";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "2",
        flexShrink: "3",
        flexBasis: "0",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 2 30px (number and dimension as grow basis)", () => {
      const testValue = "2 30px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "2",
        flexShrink: "1",
        flexBasis: "30px",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 2 50% (number and percentage as grow basis)", () => {
      const testValue = "2 50%";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "2",
        flexShrink: "1",
        flexBasis: "50%",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 3 auto (number and auto keyword as grow basis)", () => {
      const testValue = "3 auto";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "3",
        flexShrink: "1",
        flexBasis: "auto",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });
  });

  describe("three values", () => {
    it("parses flex: 2 3 10% (grow shrink basis)", () => {
      const testValue = "2 3 10%";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "2",
        flexShrink: "3",
        flexBasis: "10%",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 1 1 100px (grow shrink basis)", () => {
      const testValue = "1 1 100px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "100px",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 0 0 auto (all zeros with auto basis)", () => {
      const testValue = "0 0 auto";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "0",
        flexShrink: "0",
        flexBasis: "auto",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 5 2 calc(20% - 20px) (grow shrink basis)", () => {
      const testValue = "5 2 calc(20% - 20px)";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "5",
        flexShrink: "2",
        flexBasis: "calc(20% - 20px)",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });
  });

  describe("edge cases", () => {
    it("parses flex: 0.5 (decimal grow)", () => {
      const testValue = "0.5";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "0.5",
        flexShrink: "1",
        flexBasis: "0",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 1.5 2.5 (decimal grow and shrink)", () => {
      const testValue = "1.5 2.5";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1.5",
        flexShrink: "2.5",
        flexBasis: "0",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 0 1 auto (explicit initial values)", () => {
      const testValue = "0 1 auto";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "0",
        flexShrink: "1",
        flexBasis: "auto",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 1 1 0 (grow shrink with zero basis)", () => {
      const testValue = "1 1 0";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "0",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });
  });

  describe("different units", () => {
    it("parses flex: 1 10em (em units for basis)", () => {
      const testValue = "1 10em";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "10em",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 2 5rem (rem units for basis)", () => {
      const testValue = "2 5rem";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "2",
        flexShrink: "1",
        flexBasis: "5rem",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });

    it("parses flex: 1 1 10vh (viewport units for basis)", () => {
      const testValue = "1 1 10vh";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "10vh",
      });
      expect(result).toEqual(fixCSSValue("flex", testValue));
    });
  });

  describe("invalid values", () => {
    it("returns {} for flex with invalid identifier", () => {
      const testValue = "1 bad-identifier 0px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with invalid identifier in middle", () => {
      const testValue = "1 invalid 2";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with multiple invalid identifiers", () => {
      const testValue = "foo bar baz";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with too many valid values", () => {
      const testValue = "1 2 10px 20px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with dimension in wrong position", () => {
      const testValue = "10px 1 2";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with two dimensions", () => {
      const testValue = "10px 20px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with three dimensions", () => {
      const testValue = "10px 20px 30px";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });

    it("returns {} for flex with invalid mixed values", () => {
      const testValue = "1 2 3 auto";
      const testValueNode = getTestValueNode(testValue);
      const result = parseFlexShorthand(testValueNode);
      expect(result).toEqual({});
    });
  });
});
