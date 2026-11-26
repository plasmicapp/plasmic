import { setStyleTokenVariantedValue } from "@/wab/client/operations/set-style-token-varianted-value";
import { mkTokenRef } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { setStyleTokenValue } from "@/wab/shared/core/site-style-tokens";
import { createSite } from "@/wab/shared/core/sites";
import { MutableToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";

describe("setStyleTokenVariantedValue", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });

    const group = tplMgr.createGlobalVariantGroup("theme");
    const dark = tplMgr.createGlobalVariant(group, "dark");

    const color = (name: string, value: string) =>
      tplMgr.addStyleToken({ name, tokenType: "Color", value });
    return { site, color, token: color("bg", "#ffffff"), dark };
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

  it("errors on a token ref that leads back to the token under the variants", () => {
    const { site, color, token, dark } = setup();
    const alias = color("alias", "#000000");
    const set = (t: StyleToken, value: string) =>
      setStyleTokenVariantedValue({ site, token: t, variant: dark, value });

    expect(set(alias, mkTokenRef(token)).isOk()).toBe(true);
    const primary = color("primary", "red");
    const result = set(
      token,
      `var(--token-${primary.uuid}, ${mkTokenRef(alias)})`,
    );
    assert(result.isErr(), "expected error result");
    expect(result.error.message).toContain("bg -> alias -> bg");
    expect(token.variantedValues).toEqual([]);

    // A base alias would also apply in dark until bg has its own override.
    const setBase = () =>
      setStyleTokenValue(site, new MutableToken(token), mkTokenRef(alias));
    expect(setBase().isErr()).toBe(true);
    expect(token.value).toBe("#ffffff");
    expect(set(token, "#333").isOk()).toBe(true);
    expect(setBase().isOk()).toBe(true);
    expect(
      setStyleTokenVariantedValue({
        site,
        token,
        variant: dark,
        value: null,
      }).isErr(),
    ).toBe(true);
    expect(token.variantedValues[0].value).toBe("#333");
  });
});
