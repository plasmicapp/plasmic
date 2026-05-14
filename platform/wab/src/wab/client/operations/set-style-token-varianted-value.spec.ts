import { createStyleToken } from "@/wab/client/operations/create-style-token";
import { setStyleTokenVariantedValue } from "@/wab/client/operations/set-style-token-varianted-value";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { Variant } from "@/wab/shared/model/classes";

describe("setStyleTokenVariantedValue", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });

    const group = tplMgr.createGlobalVariantGroup("theme");
    const dark = tplMgr.createGlobalVariant(group, "dark");

    const created = createStyleToken({
      tplMgr,
      name: "bg",
      type: "Color",
      value: "#ffffff",
    });
    assert(created.result === "success", "setup failed");

    return { site, tplMgr, token: created.token, dark };
  }

  it("upserts a varianted value and then removes it via null", () => {
    const { site, token, dark } = setup();

    const setResult = setStyleTokenVariantedValue({
      site,
      token,
      variants: [dark],
      value: "#111111",
    });
    assert(setResult.result === "success", "expected set success");
    expect(token.variantedValues.length).toEqual(1);
    expect(token.variantedValues[0].value).toEqual("#111111");
    expect(token.variantedValues[0].variants).toEqual([dark]);

    const removeResult = setStyleTokenVariantedValue({
      site,
      token,
      variants: [dark],
      value: null,
    });
    assert(removeResult.result === "success", "expected remove success");
    expect(token.variantedValues.length).toEqual(0);
  });

  it("errors when no variants are provided", () => {
    const { site, token } = setup();
    const result = setStyleTokenVariantedValue({
      site,
      token,
      variants: [] as Variant[],
      value: "#000",
    });
    expect(result.result).toEqual("error");
  });
});
