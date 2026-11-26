import { deleteStyleToken } from "@/wab/client/operations/delete-style-token";
import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import { createSite } from "@/wab/shared/core/sites";
import { MutableToken, OverrideableToken } from "@/wab/shared/core/tokens";

it("inlines a deleted token at each reference using its value for that variant", () => {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const dark = tplMgr.createGlobalVariant(
    tplMgr.createGlobalVariantGroup("Theme"),
    "Dark",
  );
  const color = (name: string, value: string) =>
    mkStyleToken({ name, type: "Color", value });
  const primary = color("primary", "red");
  const fallback = color("fallback", "blue");
  const withFallback = (value: string) =>
    `var(--token-${primary.uuid}, ${value})`;
  const alias = color("alias", withFallback(mkTokenRef(fallback)));
  const direct = color("direct", mkTokenRef(fallback));
  const registered = color("registered", "white");
  registered.isRegistered = true;
  site.styleTokens = [
    ...site.styleTokens,
    primary,
    fallback,
    alias,
    direct,
    registered,
  ];
  const override = new OverrideableToken(registered, site);
  override.setValue(alias.value);
  new MutableToken(fallback).setVariantedValue([dark], "green");
  new MutableToken(direct).setVariantedValue([dark], alias.value);

  deleteStyleToken({ site, token: fallback });

  expect(site.styleTokens).not.toContain(fallback);
  expect(alias.value).toBe(withFallback("blue"));
  expect(override.value).toBe(withFallback("blue"));
  expect(registered.value).toBe("white");
  expect(direct.value).toBe("blue");
  expect(direct.variantedValues[0].value).toBe(withFallback("green"));
});
