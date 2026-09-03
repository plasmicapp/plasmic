import {
  getVariantIdentifier,
  Selector,
} from "@/wab/client/components/sidebar/RuleSetControls";

describe("getVariantIdentifiers", () => {
  it("should return an array of variant identifiers", () => {
    const codeComponentSelector: Selector = {
      type: "CodeComponentSelector",
      key: "hover",
      componentName: "test",
      componentUuid: "testUuid",
      displayName: "Hover",
    };
    const cssSelector: Selector = { type: "CssSelector", cssSelector: "test2" };

    expect(getVariantIdentifier(codeComponentSelector)).toEqual("hover");
    expect(getVariantIdentifier(cssSelector)).toEqual("test2");
  });
});
