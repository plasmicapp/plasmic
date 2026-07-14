import { coerceLinkedPropValue } from "@/wab/client/components/sidebar-tabs/linked-prop-utils";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";

describe("coerceLinkedPropValue", () => {
  it("returns null for an empty expr", () => {
    expect(coerceLinkedPropValue(null, ["a"], false)).toBeNull();
    expect(coerceLinkedPropValue(undefined, ["a"], false)).toBeNull();
  });

  it("keeps a still-valid single value", () => {
    const result = coerceLinkedPropValue(codeLit("a"), ["a", "b"], false);
    expect(tryExtractJson(result!)).toBe("a");
  });

  it("drops a no-longer-valid single value", () => {
    expect(coerceLinkedPropValue(codeLit("x"), ["a", "b"], false)).toBeNull();
  });

  it("filters a multi value to the valid options", () => {
    const result = coerceLinkedPropValue(codeLit(["a", "x"]), ["a", "b"], true);
    expect(tryExtractJson(result!)).toEqual(["a"]);
  });

  it("collapses a multi value to the first valid option when going single", () => {
    const result = coerceLinkedPropValue(
      codeLit(["a", "b"]),
      ["a", "b"],
      false
    );
    expect(tryExtractJson(result!)).toBe("a");
  });

  it("returns null when no members remain valid", () => {
    expect(coerceLinkedPropValue(codeLit(["x", "y"]), ["a"], true)).toBeNull();
  });

  it("keeps still-valid numeric and boolean values (not just strings)", () => {
    expect(
      tryExtractJson(coerceLinkedPropValue(codeLit(1), [1, 2], false)!)
    ).toBe(1);
    expect(
      tryExtractJson(
        coerceLinkedPropValue(codeLit(true), [true, false], false)!
      )
    ).toBe(true);
    // A string "1" is not the numeric option 1.
    expect(coerceLinkedPropValue(codeLit("1"), [1, 2], false)).toBeNull();
  });
});
