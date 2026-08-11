import { createStyleToken } from "@/wab/client/operations/create-style-token";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";

describe("createStyleToken", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });
    return { site, tplMgr };
  }

  it("creates a Color token with the given value", () => {
    const { site, tplMgr } = setup();
    const before = site.styleTokens.length;

    const result = createStyleToken({
      tplMgr,
      name: "primary",
      type: "Color",
      value: "#ff0000",
    });

    assert(result.isOk(), "expected success result");
    expect(site.styleTokens.length).toEqual(before + 1);
    expect(result.value.name).toEqual("primary");
    expect(result.value.type).toEqual("Color");
    expect(result.value.value).toEqual("#ff0000");
    expect(result.value.variantedValues).toEqual([]);
  });

  it("errors on empty name", () => {
    const { tplMgr } = setup();
    const result = createStyleToken({
      tplMgr,
      name: "   ",
      type: "Color",
      value: "#000",
    });
    expect(result.isErr()).toBe(true);
  });
});
