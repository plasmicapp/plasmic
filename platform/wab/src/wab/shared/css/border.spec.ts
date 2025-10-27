import { _testOnlyUtils } from "@/wab/client/web-importer/html-parser";
import { parseBorderShorthand } from "@/wab/shared/css/border";
import { Value, parse } from "css-tree";
const { fixCSSValue } = _testOnlyUtils;

function getTestValueNode(testValue: string) {
  const testValueNode = parse(testValue, { context: "value" }) as Value;
  if (testValueNode.type !== "Value") {
    throw new Error(`Expected a Value node, but got ${testValueNode.type}`);
  }
  return testValueNode;
}

describe("parseBorderShorthand", () => {
  it("parses border with width, style, and color", () => {
    const testValue = "1px solid red";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "1px",
      borderRightWidth: "1px",
      borderBottomWidth: "1px",
      borderLeftWidth: "1px",
      borderTopStyle: "solid",
      borderRightStyle: "solid",
      borderBottomStyle: "solid",
      borderLeftStyle: "solid",
      borderTopColor: "red",
      borderRightColor: "red",
      borderBottomColor: "red",
      borderLeftColor: "red",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses reorder border with width, style, and color", () => {
    const testValue = "solid 1px red";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "1px",
      borderRightWidth: "1px",
      borderBottomWidth: "1px",
      borderLeftWidth: "1px",
      borderTopStyle: "solid",
      borderRightStyle: "solid",
      borderBottomStyle: "solid",
      borderLeftStyle: "solid",
      borderTopColor: "red",
      borderRightColor: "red",
      borderBottomColor: "red",
      borderLeftColor: "red",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border with only width and style", () => {
    const testValue = "2em dashed";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "2em",
      borderRightWidth: "2em",
      borderBottomWidth: "2em",
      borderLeftWidth: "2em",
      borderTopStyle: "dashed",
      borderRightStyle: "dashed",
      borderBottomStyle: "dashed",
      borderLeftStyle: "dashed",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border with only color", () => {
    const testValue = "blue";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopColor: "blue",
      borderRightColor: "blue",
      borderBottomColor: "blue",
      borderLeftColor: "blue",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border with only width", () => {
    const testValue = "5px";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "5px",
      borderRightWidth: "5px",
      borderBottomWidth: "5px",
      borderLeftWidth: "5px",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border with only style", () => {
    const testValue = "dotted";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopStyle: "dotted",
      borderTopWidth: "1.5px",
      borderRightStyle: "dotted",
      borderRightWidth: "1.5px",
      borderBottomStyle: "dotted",
      borderBottomWidth: "1.5px",
      borderLeftStyle: "dotted",
      borderLeftWidth: "1.5px",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses borderTop with width, style, and color", () => {
    const testValue = "2px dashed blue";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderTop", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "2px",
      borderTopStyle: "dashed",
      borderTopColor: "blue",
    });
    expect(result).toEqual(fixCSSValue("borderTop", testValue));
  });

  it("parses borderRight with only width", () => {
    const testValue = "5px";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderRight", testValueNode);
    expect(result).toEqual({
      borderRightWidth: "5px",
    });
    expect(result).toEqual(fixCSSValue("borderRight", testValue));
  });

  it("parses borderBottom with only style", () => {
    const testValue = "dotted";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderBottom", testValueNode);
    expect(result).toEqual({
      borderBottomStyle: "dotted",
      borderBottomWidth: "1.5px",
    });
    expect(result).toEqual(fixCSSValue("borderBottom", testValue));
  });

  it("parses borderLeft with only color", () => {
    const testValue = "green";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderLeft", testValueNode);
    expect(result).toEqual({
      borderLeftColor: "green",
    });
    expect(result).toEqual(fixCSSValue("borderLeft", testValue));
  });

  it("parses borderTop with style and color", () => {
    const testValue = "solid #000";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderTop", testValueNode);
    expect(result).toEqual({
      borderTopStyle: "solid",
      borderTopWidth: "1.5px",
      borderTopColor: "#000",
    });
    expect(result).toEqual(fixCSSValue("borderTop", testValue));
  });

  it("parses borderRight with width and color", () => {
    const testValue = "10px red";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderRight", testValueNode);
    expect(result).toEqual({
      borderRightWidth: "10px",
      borderRightColor: "red",
    });
    expect(result).toEqual(fixCSSValue("borderRight", testValue));
  });

  it("parses borderBottom with width and style", () => {
    const testValue = "4em double";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderBottom", testValueNode);
    expect(result).toEqual({
      borderBottomWidth: "4em",
      borderBottomStyle: "double",
    });
    expect(result).toEqual(fixCSSValue("borderBottom", testValue));
  });

  it("parses borderLeft with all three in different order", () => {
    const testValue = "blue 2px solid";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("borderLeft", testValueNode);
    expect(result).toEqual({
      borderLeftWidth: "2px",
      borderLeftStyle: "solid",
      borderLeftColor: "blue",
    });
    expect(result).toEqual(fixCSSValue("borderLeft", testValue));
  });

  it("parses border thin width", () => {
    const testValue = "thin";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "1px",
      borderRightWidth: "1px",
      borderBottomWidth: "1px",
      borderLeftWidth: "1px",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border medium width", () => {
    const testValue = "medium";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "3px",
      borderRightWidth: "3px",
      borderBottomWidth: "3px",
      borderLeftWidth: "3px",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border thick width", () => {
    const testValue = "thick";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "5px",
      borderRightWidth: "5px",
      borderBottomWidth: "5px",
      borderLeftWidth: "5px",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border none", () => {
    const testValue = "none";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopStyle: "none",
      borderBottomStyle: "none",
      borderRightStyle: "none",
      borderLeftStyle: "none",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("parses border zero", () => {
    const testValue = "0";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result).toEqual({
      borderTopWidth: "0",
      borderBottomWidth: "0",
      borderRightWidth: "0",
      borderLeftWidth: "0",
    });
    expect(result).toEqual(fixCSSValue("border", testValue));
  });

  it("should support calc() in border width", () => {
    const testValue = "calc(1px + 2px) solid red";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result.borderTopWidth).toBe("calc(1px + 2px)");
  });

  it("should support min() in border width", () => {
    const testValue = "min(5px, 10px) dashed blue";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result.borderTopWidth).toBe("min(5px,10px)");
  });

  it("should support max() in border width", () => {
    const testValue = "max(2px, 5px) dotted green";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result.borderTopWidth).toBe("max(2px,5px)");
  });

  it("should support clamp() in border width", () => {
    const testValue = "clamp(1px, 3px, 5px) solid black";
    const testValueNode = getTestValueNode(testValue);
    const result = parseBorderShorthand("border", testValueNode);
    expect(result.borderTopWidth).toBe("clamp(1px,3px,5px)");
  });
});
