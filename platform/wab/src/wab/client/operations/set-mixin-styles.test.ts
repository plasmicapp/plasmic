import {
  setMixinStyles,
  setMixinVariantedStyles,
} from "@/wab/client/operations/set-mixin-styles";
import { TplMgr } from "@/wab/shared/TplMgr";
import { mkVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import { Mixin } from "@/wab/shared/model/classes";

describe("setMixinStyles", () => {
  function mkMixin(): Mixin {
    return new TplMgr({ site: createSite() }).addMixin("Heading");
  }

  it("adds, updates and removes CSS properties", () => {
    const mixin = mkMixin();

    expect(
      setMixinStyles(mixin.rs, { "font-size": "24px", color: "#fff" })
    ).toEqual([]);
    expect(mixin.rs.values).toEqual({ "font-size": "24px", color: "#fff" });

    setMixinStyles(mixin.rs, { "font-size": "32px", color: null });
    expect(mixin.rs.values).toEqual({ "font-size": "32px" });
  });

  it("removes the longhands a shorthand expands into", () => {
    const mixin = mkMixin();

    setMixinStyles(mixin.rs, {
      padding: "8px",
      border: "1px solid #000",
      gap: "4px",
      color: "#fff",
    });
    expect(Object.keys(mixin.rs.values)).toHaveLength(19);

    expect(
      setMixinStyles(mixin.rs, { padding: null, border: null, gap: null })
    ).toEqual([]);
    expect(mixin.rs.values).toEqual({ color: "#fff" });
  });

  it("handles gap, which expands differently under a grid display", () => {
    const mixin = mkMixin();

    expect(setMixinStyles(mixin.rs, { display: "grid", gap: "4px" })).toEqual(
      []
    );
    expect(mixin.rs.values).toEqual({
      display: "grid",
      "grid-row-gap": "4px",
      "grid-column-gap": "4px",
    });

    expect(setMixinStyles(mixin.rs, { gap: null })).toEqual([]);
    expect(mixin.rs.values).toEqual({ display: "grid" });
  });

  it("reports removals of properties that are not set", () => {
    const mixin = mkMixin();
    setMixinStyles(mixin.rs, { color: "#fff" });

    const messages = setMixinStyles(mixin.rs, {
      color: null,
      "font-size": null,
    });

    expect(mixin.rs.values).toEqual({});
    expect(messages).toEqual([
      'Ignored removal of properties that are not set: "font-size".',
    ]);
  });

  it("reports properties the importer drops without an error", () => {
    const mixin = mkMixin();

    const messages = setMixinStyles(mixin.rs, {
      transition: "all 0.2s ease",
      "pointer-events": "none",
      color: "#fff",
    });

    expect(mixin.rs.values).toEqual({ color: "#fff" });
    expect(messages).toEqual([
      'Ignored properties that cannot be set here: "transition", "pointer-events".',
    ]);
  });

  it("keeps token references as-is", () => {
    const mixin = mkMixin();
    setMixinStyles(mixin.rs, { color: "var(--token-abc)" });
    expect(mixin.rs.values).toEqual({ color: "var(--token-abc)" });
  });

  it("drops and reports properties Studio does not model as CSS", () => {
    const mixin = mkMixin();

    const messages = setMixinStyles(mixin.rs, {
      "font-size": "24px",
      filter: "blur(2px)",
    });

    expect(mixin.rs.values).toEqual({ "font-size": "24px" });
    expect(messages).toEqual([
      'Ignored properties that are not recognized CSS styles: "filter".',
    ]);
  });

  it("drops the animation shorthand, which mixins do not support", () => {
    const mixin = mkMixin();

    const messages = setMixinStyles(mixin.rs, {
      animation: "var(--anim-abc) 2s linear",
      color: "#000",
    });

    expect(mixin.rs.values).toEqual({ color: "#000" });
    expect(messages).toEqual([
      'Ignored "animation": CSS animations cannot be set here.',
    ]);
  });

  it("writes typography props raw, like the Typography section", () => {
    const mixin = mkMixin();

    const messages = setMixinStyles(mixin.rs, {
      "white-space": "nowrap",
      "text-decoration-line": "underline",
      "font-family": "Inter, sans-serif",
    });

    expect(messages).toEqual([]);
    expect(mixin.rs.values).toEqual({
      "white-space": "nowrap",
      "text-decoration-line": "underline",
      "font-family": "Inter",
    });
  });

  it("rejects malformed typography values instead of writing them raw", () => {
    const mixin = mkMixin();

    const messages = setMixinStyles(mixin.rs, {
      color: "red; display: none",
      "white-space": "nowrap}",
      "font-size": "16px",
    });

    expect(mixin.rs.values).toEqual({ "font-size": "16px" });
    expect(messages).toEqual([
      'Dropped invalid style "color: red; display: none" (Unexpected input).',
      'Dropped invalid style "white-space: nowrap}" (Unexpected input).',
    ]);
  });
});

describe("setMixinVariantedStyles", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });
    const mixin = tplMgr.addMixin("Heading");
    setMixinStyles(mixin.rs, { "font-size": "24px", color: "#fff" });
    const variant = mkVariant({
      name: "Mobile",
      mediaQuery: "(max-width:768px)",
    });
    return { site, tplMgr, mixin, variant };
  }

  it("creates then updates the override for a variant combo", () => {
    const { mixin, variant } = setup();

    assert(
      setMixinVariantedStyles({
        mixin,
        variants: [variant],
        styles: { "font-size": "16px" },
      }).isOk(),
      "expected success result"
    );
    expect(mixin.rs.values).toEqual({ "font-size": "24px", color: "#fff" });
    expect(mixin.variantedRs.length).toEqual(1);
    expect(mixin.variantedRs[0].variants).toEqual([variant]);
    expect(mixin.variantedRs[0].rs.values).toEqual({ "font-size": "16px" });

    setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { "font-size": "18px", color: "#000" },
    });
    expect(mixin.variantedRs.length).toEqual(1);
    expect(mixin.variantedRs[0].rs.values).toEqual({
      "font-size": "18px",
      color: "#000",
    });
  });

  it("removes the whole override for null styles", () => {
    const { mixin, variant } = setup();

    setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { "font-size": "16px" },
    });
    assert(
      setMixinVariantedStyles({
        mixin,
        variants: [variant],
        styles: null,
      }).isOk(),
      "expected success result"
    );
    expect(mixin.variantedRs).toEqual([]);
  });

  it("is a no-op when removing an override that does not exist", () => {
    const { mixin, variant } = setup();
    const result = setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: null,
    });
    expect(result.isOk()).toBe(true);
    expect(mixin.variantedRs).toEqual([]);
  });

  it("errors without any variant", () => {
    const { mixin } = setup();
    const result = setMixinVariantedStyles({
      mixin,
      variants: [],
      styles: { color: "#000" },
    });
    expect(result.isErr()).toBe(true);
    expect(mixin.variantedRs).toEqual([]);
  });

  it("skips props without a base value, which would render nothing", () => {
    const { mixin, variant } = setup();

    const result = setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { "font-size": "16px", padding: "8px", "line-height": null },
    });

    assert(result.isOk(), "expected success result");
    expect(result.value).toEqual([
      'Skipped for the targeted variants: "padding". A property needs a base value before it can be overridden per variant; set it without variantUuids first.',
      'Ignored removal of properties that are not set: "line-height".',
    ]);
    expect(mixin.variantedRs[0].rs.values).toEqual({ "font-size": "16px" });
  });

  it("checks base values for the keys the requested shorthand value writes", () => {
    const { mixin, variant } = setup();
    // Only the width longhands, not border style/color.
    setMixinStyles(mixin.rs, { border: "1px" });

    const result = setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { border: "2px" },
    });

    assert(result.isOk(), "expected success result");
    expect(result.value).toEqual([]);
    expect(mixin.variantedRs).toHaveLength(1);
    expect(mixin.variantedRs[0].rs.values).toEqual({
      "border-top-width": "2px",
      "border-right-width": "2px",
      "border-bottom-width": "2px",
      "border-left-width": "2px",
    });
  });

  it("checks base values in the base rule set's layout context", () => {
    const { mixin, variant } = setup();
    setMixinStyles(mixin.rs, { display: "grid", gap: "4px" });

    const result = setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { gap: "8px" },
    });

    assert(result.isOk(), "expected success result");
    expect(result.value).toEqual([]);
    expect(mixin.variantedRs[0].rs.values).toEqual({
      "grid-row-gap": "8px",
      "grid-column-gap": "8px",
    });
  });

  it("does not strand an override that ends up empty", () => {
    const { mixin, variant } = setup();

    setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { padding: "8px" },
    });
    expect(mixin.variantedRs).toEqual([]);

    setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { "font-size": "16px" },
    });
    setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { "font-size": null },
    });
    expect(mixin.variantedRs).toEqual([]);
  });

  it("dedupes a repeated variant so later edits can match the override", () => {
    const { mixin, variant } = setup();

    setMixinVariantedStyles({
      mixin,
      variants: [variant, variant],
      styles: { "font-size": "16px" },
    });
    setMixinVariantedStyles({
      mixin,
      variants: [variant],
      styles: { "font-size": "18px" },
    });

    expect(mixin.variantedRs.length).toEqual(1);
    expect(mixin.variantedRs[0].variants).toEqual([variant]);
    expect(mixin.variantedRs[0].rs.values).toEqual({ "font-size": "18px" });
  });

  it("rejects two variants from one single-choice group", () => {
    const { tplMgr, mixin } = setup();
    const group = tplMgr.createGlobalVariantGroup("Theme");
    const dark = tplMgr.createGlobalVariant(group, "Dark");
    const light = tplMgr.createGlobalVariant(group, "Light");

    const result = setMixinVariantedStyles({
      mixin,
      variants: [dark, light],
      styles: { color: "#000" },
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toContain("single-choice");
    expect(mixin.variantedRs).toEqual([]);
  });

  it("rejects two screen breakpoints, as CSS gets one media query", () => {
    const { tplMgr, mixin } = setup();
    const mobile = tplMgr.createScreenVariant({
      name: "Mobile",
      spec: new ScreenSizeSpec(undefined, 768),
    });
    const tablet = tplMgr.createScreenVariant({
      name: "Tablet",
      spec: new ScreenSizeSpec(undefined, 1024),
    });

    const result = setMixinVariantedStyles({
      mixin,
      variants: [mobile, tablet],
      styles: { color: "#000" },
    });

    assert(result.isErr(), "expected error result");
    expect(result.error.message).toContain("one screen breakpoint");
    expect(mixin.variantedRs).toEqual([]);
  });
});
