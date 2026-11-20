import { createStyleToken } from "@/wab/client/operations/create-style-token";
import { setStyleTokenVariantedValue } from "@/wab/client/operations/set-style-token-varianted-value";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";

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
    assert(created.isOk(), "setup failed");

    return { site, tplMgr, token: created.value, dark };
  }

  it("upserts a varianted value and then removes it via null", () => {
    const { site, token, dark } = setup();

    const setResult = setStyleTokenVariantedValue({
      site,
      token,
      variant: dark,
      value: "#111111",
    });
    assert(setResult.isOk(), "expected set success");
    expect(token.variantedValues.length).toEqual(1);
    expect(token.variantedValues[0].value).toEqual("#111111");
    expect(token.variantedValues[0].variants).toEqual([dark]);

    const removeResult = setStyleTokenVariantedValue({
      site,
      token,
      variant: dark,
      value: null,
    });
    assert(removeResult.isOk(), "expected remove success");
    expect(token.variantedValues.length).toEqual(0);
  });
});
