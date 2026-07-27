import { RSH } from "@/wab/shared/RuleSetHelpers";
import { mkVariant, mkVariantSetting } from "@/wab/shared/Variants";
import { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import {
  isBackgroundValidForTpl,
  isFlexContainerPropValidForRsh,
  isGapPropValidForRsh,
  isGridContainerPropValidForRsh,
  isListStyleValidForTpl,
  isMarginValidForTpl,
  isOverflowValidForTpl,
  isPaddingValidForTpl,
  isPositioningValidForTpl,
  isSizeValidForTpl,
  isTransformValidForTpl,
  isTransitionValidForTpl,
  isTypographyValidForTpl,
  isValidStylePropForTpl,
  validateStylesForTpl,
} from "@/wab/shared/core/style-props-tpl";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { TplTagType, mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { CodeComponentMeta, Mixin } from "@/wab/shared/model/classes";
import {
  TEST_GLOBAL_VARIANT,
  mkTestVariantSetting as vs,
} from "@/wab/test/tpls";

const ccRegistry = new CodeComponentsRegistry(globalThis, {});

/** Ruleset helper over a plain div carrying the given styles. */
const rsh = (styles: Record<string, string> = {}) =>
  RSH(vs(styles).rs, mkTplTagX("div"));

const mkTestMixin = (styles: Record<string, string>) =>
  new Mixin({
    name: "TestMixin",
    rs: mkRuleSet({ values: styles }),
    preview: undefined,
    uuid: mkShortId(),
    forTheme: false,
    variantedRs: [],
  });

describe("isTypographyValidForTpl", () => {
  it("is true for containers, text nodes, code components", () => {
    expect(isTypographyValidForTpl(mkTplTagX("div"))).toBe(true);
    expect(isTypographyValidForTpl(mkTplTagX("span"))).toBe(true);
    expect(
      isTypographyValidForTpl(mkTplTagX("span", { type: TplTagType.Text }))
    ).toBe(true);
    expect(isTypographyValidForTpl(mkCodeComponentTpl())).toBe(true);
  });
  it("is false for images, icons, plain components", () => {
    expect(isTypographyValidForTpl(mkImageTpl())).toBe(false);
    expect(isTypographyValidForTpl(mkIconTpl())).toBe(false);
    expect(isTypographyValidForTpl(mkPlainComponentTpl())).toBe(false);
  });
});

describe("isSizeValidForTpl", () => {
  it("is true for tags, components", () => {
    expect(isSizeValidForTpl(mkTplTagX("div"))).toBe(true);
    expect(isSizeValidForTpl(mkPlainComponentTpl())).toBe(true);
    expect(isSizeValidForTpl(mkCodeComponentTpl())).toBe(true);
  });
  it("is false for columns", () => {
    expect(
      isSizeValidForTpl(mkTplTagX("div", { type: TplTagType.Column }))
    ).toBe(false);
  });
});

describe("isPositioningValidForTpl", () => {
  it("is true for non-root tags, components", () => {
    expect(isPositioningValidForTpl(mkTplTagX("div"), rsh())).toBe(true);
    expect(isPositioningValidForTpl(mkPlainComponentTpl(), rsh())).toBe(true);
    expect(isPositioningValidForTpl(mkCodeComponentTpl(), rsh())).toBe(true);
  });
  it("is false for columns", () => {
    expect(
      isPositioningValidForTpl(
        mkTplTagX("div", { type: TplTagType.Column }),
        rsh()
      )
    ).toBe(false);
  });
  it("is true for a component root that has a position", () => {
    const component = mkComponent({
      name: "TestRoot",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
    });
    expect(isPositioningValidForTpl(component.tplTree, rsh())).toBe(false);
    expect(
      isPositioningValidForTpl(component.tplTree, rsh({ position: "absolute" }))
    ).toBe(true);
  });
});

describe("isBackgroundValidForTpl", () => {
  it("is true for tags, code components", () => {
    expect(isBackgroundValidForTpl(mkTplTagX("div"))).toBe(true);
    expect(isBackgroundValidForTpl(mkTplTagX("span"))).toBe(true);
    expect(isBackgroundValidForTpl(mkCodeComponentTpl())).toBe(true);
  });
  it("is false for images, icons, plain components", () => {
    expect(isBackgroundValidForTpl(mkImageTpl())).toBe(false);
    expect(isBackgroundValidForTpl(mkIconTpl())).toBe(false);
    expect(isBackgroundValidForTpl(mkPlainComponentTpl())).toBe(false);
  });
});

describe("isOverflowValidForTpl", () => {
  it("is true for containers, columns, code components", () => {
    expect(isOverflowValidForTpl(mkTplTagX("div"))).toBe(true);
    expect(isOverflowValidForTpl(mkTplTagX("span"))).toBe(true);
    expect(
      isOverflowValidForTpl(mkTplTagX("div", { type: TplTagType.Column }))
    ).toBe(true);
    expect(isOverflowValidForTpl(mkCodeComponentTpl())).toBe(true);
  });
  it("is false for text nodes, plain components", () => {
    expect(
      isOverflowValidForTpl(mkTplTagX("div", { type: TplTagType.Text }))
    ).toBe(false);
    expect(
      isOverflowValidForTpl(mkTplTagX("span", { type: TplTagType.Text }))
    ).toBe(false);
    expect(isOverflowValidForTpl(mkPlainComponentTpl())).toBe(false);
  });
});

describe("isListStyleValidForTpl", () => {
  it("is true for list containers", () => {
    expect(isListStyleValidForTpl(mkTplTagX("ul"))).toBe(true);
    expect(isListStyleValidForTpl(mkTplTagX("ol"))).toBe(true);
  });
  it("is false for non-list tags", () => {
    expect(isListStyleValidForTpl(mkTplTagX("div"))).toBe(false);
    expect(isListStyleValidForTpl(mkTplTagX("span"))).toBe(false);
    expect(isListStyleValidForTpl(mkTplTagX("li"))).toBe(false);
  });
});

describe("isTransformValidForTpl", () => {
  it("is true for tags, all components", () => {
    expect(isTransformValidForTpl(mkTplTagX("div"))).toBe(true);
    expect(isTransformValidForTpl(mkCodeComponentTpl())).toBe(true);
    expect(isTransformValidForTpl(mkPlainComponentTpl())).toBe(true);
  });
});

describe("isTransitionValidForTpl", () => {
  it("is true for tags, all components", () => {
    expect(isTransitionValidForTpl(mkTplTagX("div"))).toBe(true);
    expect(isTransitionValidForTpl(mkCodeComponentTpl())).toBe(true);
    expect(isTransitionValidForTpl(mkPlainComponentTpl())).toBe(true);
  });
});

describe("isMarginValidForTpl", () => {
  it("is true for non-root, non-column elements", () => {
    expect(isMarginValidForTpl(mkTplTagX("div"))).toBe(true);
  });
  it("is false for columns", () => {
    expect(
      isMarginValidForTpl(mkTplTagX("div", { type: TplTagType.Column }))
    ).toBe(false);
  });
});

describe("validateStylesForTpl", () => {
  const styles = {
    marginTop: "10px",
    marginLeft: "20px",
    color: "red",
    display: "flex",
  };

  it("keeps all styles valid for a regular tag", () => {
    expect(
      validateStylesForTpl(styles, mkTplTagX("div"), rsh(), ccRegistry)
    ).toEqual({
      valid: styles,
      invalid: {},
    });
  });

  it("splits out margin styles for a component root", () => {
    const component = mkComponent({
      name: "TestRoot",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
    });
    expect(
      validateStylesForTpl(styles, component.tplTree, rsh(), ccRegistry)
    ).toEqual({
      valid: { color: "red", display: "flex" },
      invalid: { marginTop: "10px", marginLeft: "20px" },
    });
  });

  it("splits out all restricted styles for a column", () => {
    expect(
      validateStylesForTpl(
        styles,
        mkTplTagX("div", { type: TplTagType.Column }),
        rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: {},
      invalid: styles,
    });
  });

  it("splits out typography styles other than color for an icon", () => {
    expect(
      validateStylesForTpl(
        { color: "red", fontSize: "16px", opacity: "0.5" },
        mkIconTpl(),
        rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: { color: "red", opacity: "0.5" },
      invalid: { fontSize: "16px" },
    });
  });

  it("splits out non-positioning styles for a plain component instance", () => {
    expect(
      validateStylesForTpl(
        {
          width: "100px",
          marginTop: "10px",
          background: "red",
          fontSize: "16px",
        },
        mkPlainComponentTpl(),
        rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: { width: "100px", marginTop: "10px" },
      invalid: { background: "red", fontSize: "16px" },
    });
  });

  it("validates state-dependent styles against the post-merge ruleset", () => {
    expect(
      validateStylesForTpl(
        { display: "flex", flexDirection: "column", rowGap: "8px" },
        mkTplTagX("div"),
        rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: { display: "flex", flexDirection: "column", rowGap: "8px" },
      invalid: {},
    });
  });

  it("validates state-dependent styles against the whole variant stack", () => {
    // The stack is a flex column in base and the styles target a screen
    // variant that does not restate display/flex-direction.
    const tpl = mkTplTagX("div");
    tpl.vsettings = [
      vs({ display: "flex", "flex-direction": "column" }),
      mkVariantSetting({ variants: [mkVariant({ name: "Tablet" })] }),
    ];
    expect(
      validateStylesForTpl(
        { rowGap: "8px" },
        tpl,
        new EffectiveVariantSetting(tpl, tpl.vsettings).rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: { rowGap: "8px" },
      invalid: {},
    });
  });

  it("validates state-dependent styles against mixin styles", () => {
    // The tpl is a flex column only because of a mixin applied to it.
    const tpl = mkTplTagX("div");
    const mixin = mkTestMixin({
      display: "flex",
      "flex-direction": "column",
    });
    const baseVs = vs();
    baseVs.rs.mixins = [mixin];
    tpl.vsettings = [baseVs];
    expect(
      validateStylesForTpl(
        { rowGap: "8px" },
        tpl,
        new EffectiveVariantSetting(tpl, tpl.vsettings).rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: { rowGap: "8px" },
      invalid: {},
    });
  });

  it("splits out empty values as invalid", () => {
    expect(
      validateStylesForTpl(
        { color: "", marginTop: "10px" },
        mkTplTagX("div"),
        rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: { marginTop: "10px" },
      invalid: { color: "" },
    });
  });

  it("splits out flex styles when the tpl is not a flex container", () => {
    expect(
      validateStylesForTpl(
        { flexDirection: "column" },
        mkTplTagX("div"),
        rsh(),
        ccRegistry
      )
    ).toEqual({
      valid: {},
      invalid: { flexDirection: "column" },
    });
  });
});

describe("isPaddingValidForTpl", () => {
  it("is true for non-image tags, code components", () => {
    expect(isPaddingValidForTpl(mkTplTagX("div"), ccRegistry)).toBe(true);
    expect(isPaddingValidForTpl(mkTplTagX("span"), ccRegistry)).toBe(true);
    expect(isPaddingValidForTpl(mkCodeComponentTpl(), ccRegistry)).toBe(true);
  });
  it("is false for images, icons, plain components", () => {
    expect(isPaddingValidForTpl(mkImageTpl(), ccRegistry)).toBe(false);
    expect(isPaddingValidForTpl(mkIconTpl(), ccRegistry)).toBe(false);
    expect(isPaddingValidForTpl(mkPlainComponentTpl(), ccRegistry)).toBe(false);
  });
  it("is true for code components with styleSections including spacing", () => {
    const registry = mkCcRegistry("WithSpacing", {
      styleSections: ["spacing"],
    });
    expect(
      isPaddingValidForTpl(mkCodeComponentTpl("WithSpacing"), registry)
    ).toBe(true);
  });
  it("is false for code components with styleSections excluding spacing", () => {
    const registry = mkCcRegistry("NoSpacing", {
      styleSections: ["visibility"],
    });
    expect(
      isPaddingValidForTpl(mkCodeComponentTpl("NoSpacing"), registry)
    ).toBe(false);
  });
});

describe("isFlexContainerPropValidForRsh", () => {
  it("is true for flex containers", () => {
    expect(
      isFlexContainerPropValidForRsh(
        rsh({ display: "flex", "flex-direction": "row" })
      )
    ).toBe(true);
    expect(
      isFlexContainerPropValidForRsh(
        rsh({ display: "flex", "flex-direction": "column" })
      )
    ).toBe(true);
  });
  it("is false for grid, block", () => {
    expect(isFlexContainerPropValidForRsh(rsh({ display: "grid" }))).toBe(
      false
    );
    expect(isFlexContainerPropValidForRsh(rsh())).toBe(false);
  });
});

describe("isGridContainerPropValidForRsh", () => {
  it("is true for grid containers", () => {
    expect(isGridContainerPropValidForRsh(rsh({ display: "grid" }))).toBe(true);
  });
  it("is false for flex, block", () => {
    expect(
      isGridContainerPropValidForRsh(
        rsh({ display: "flex", "flex-direction": "row" })
      )
    ).toBe(false);
    expect(isGridContainerPropValidForRsh(rsh())).toBe(false);
  });
});

describe("isGapPropValidForRsh", () => {
  it("is true for gap along main axis, both axes when wrapped, both axes for grid", () => {
    expect(
      isGapPropValidForRsh(
        "column-gap",
        rsh({ display: "flex", "flex-direction": "row" })
      )
    ).toBe(true);
    expect(
      isGapPropValidForRsh(
        "row-gap",
        rsh({ display: "flex", "flex-direction": "column" })
      )
    ).toBe(true);

    const wrapRsh = rsh({
      display: "flex",
      "flex-direction": "row",
      "flex-wrap": "wrap",
    });
    expect(isGapPropValidForRsh("column-gap", wrapRsh)).toBe(true);
    expect(isGapPropValidForRsh("row-gap", wrapRsh)).toBe(true);

    const gridRsh = rsh({ display: "grid" });
    expect(isGapPropValidForRsh("column-gap", gridRsh)).toBe(true);
    expect(isGapPropValidForRsh("row-gap", gridRsh)).toBe(true);
  });
  it("is false for gap along cross axis without wrap, unknown gap prop", () => {
    expect(
      isGapPropValidForRsh(
        "column-gap",
        rsh({ display: "flex", "flex-direction": "column" })
      )
    ).toBe(false);
    expect(
      isGapPropValidForRsh(
        "row-gap",
        rsh({ display: "flex", "flex-direction": "row" })
      )
    ).toBe(false);
    expect(
      isGapPropValidForRsh(
        "gap",
        rsh({ display: "flex", "flex-direction": "row" })
      )
    ).toBe(false);
  });
  it("is true for a variant that inherits the flex state it depends on", () => {
    // A stack is a flex row in the base variant and the targeted variant does
    // not override display/flex-direction, so the gap must stay valid there.
    const stack = mkTplTagX("div");
    const tabletVs = mkVariantSetting({
      variants: [mkVariant({ name: "Tablet" })],
    });
    stack.vsettings = [
      vs({ display: "flex", "flex-direction": "row", "column-gap": "14px" }),
      tabletVs,
    ];

    expect(isGapPropValidForRsh("column-gap", RSH(tabletVs.rs, stack))).toBe(
      false
    );
    expect(
      isGapPropValidForRsh(
        "column-gap",
        new EffectiveVariantSetting(stack, stack.vsettings).rsh()
      )
    ).toBe(true);
  });
});

describe("isValidStylePropForTpl", () => {
  it("is true for valid prop+element combinations", () => {
    const baseVs = rsh();
    // typography
    expect(
      isValidStylePropForTpl("color", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl("font-size", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    // spacing
    expect(
      isValidStylePropForTpl(
        "padding-top",
        mkTplTagX("div"),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl("margin-top", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    // size
    expect(
      isValidStylePropForTpl("width", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    // background
    expect(
      isValidStylePropForTpl("background", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    // overflow
    expect(
      isValidStylePropForTpl("overflow", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl("overflow-x", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    // border, shadow, effects
    expect(
      isValidStylePropForTpl(
        "border-top-left-radius",
        mkTplTagX("div"),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "border-top-left-radius",
        mkCodeComponentTpl(),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl("box-shadow", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl("cursor", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl("filter", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "pointer-events",
        mkTplTagX("div"),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    // list style
    expect(
      isValidStylePropForTpl(
        "list-style-type",
        mkTplTagX("ul"),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    // image
    expect(
      isValidStylePropForTpl("object-fit", mkImageTpl(), baseVs, ccRegistry)
    ).toBe(true);
    // visibility, opacity
    expect(
      isValidStylePropForTpl("visibility", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl("opacity", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "opacity",
        mkPlainComponentTpl(),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "visibility",
        mkPlainComponentTpl(),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    // transform
    expect(
      isValidStylePropForTpl("transform", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    // layout
    expect(
      isValidStylePropForTpl("display", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "display",
        mkCodeComponentTpl(),
        baseVs,
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "flex-direction",
        mkTplTagX("div"),
        rsh({ display: "flex", "flex-direction": "row" }),
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "grid-template-columns",
        mkTplTagX("div"),
        rsh({ display: "grid" }),
        ccRegistry
      )
    ).toBe(true);
    expect(
      isValidStylePropForTpl(
        "column-gap",
        mkTplTagX("div"),
        rsh({ display: "flex", "flex-direction": "row" }),
        ccRegistry
      )
    ).toBe(true);
  });

  it("is false for inapplicable prop+element combinations, invalid props", () => {
    const baseVs = rsh();
    // typography on icon (except color, which has its dedicated control)
    expect(
      isValidStylePropForTpl("color", mkIconTpl(), baseVs, ccRegistry)
    ).toBe(true);
    expect(
      isValidStylePropForTpl("font-size", mkIconTpl(), baseVs, ccRegistry)
    ).toBe(false);
    // spacing on wrong elements
    expect(
      isValidStylePropForTpl("padding-top", mkImageTpl(), baseVs, ccRegistry)
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "margin-top",
        mkTplTagX("div", { type: TplTagType.Column }),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    // size on column
    expect(
      isValidStylePropForTpl(
        "width",
        mkTplTagX("div", { type: TplTagType.Column }),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    // background on image
    expect(
      isValidStylePropForTpl("background", mkImageTpl(), baseVs, ccRegistry)
    ).toBe(false);
    // overflow on text
    expect(
      isValidStylePropForTpl(
        "overflow",
        mkTplTagX("span", { type: TplTagType.Text }),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    // border on plain component
    expect(
      isValidStylePropForTpl(
        "border-top-left-radius",
        mkPlainComponentTpl(),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    // list style on non-list
    expect(
      isValidStylePropForTpl(
        "list-style-type",
        mkTplTagX("div"),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    // image prop on non-image
    expect(
      isValidStylePropForTpl("object-fit", mkTplTagX("div"), baseVs, ccRegistry)
    ).toBe(false);
    // layout mismatch
    expect(
      isValidStylePropForTpl(
        "display",
        mkPlainComponentTpl(),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "display",
        mkTplTagX("span", { type: TplTagType.Text }),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "flex-direction",
        mkTplTagX("div"),
        rsh({ display: "grid" }),
        ccRegistry
      )
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "flex-direction",
        mkTplTagX("span", { type: TplTagType.Text }),
        rsh({ display: "flex" }),
        ccRegistry
      )
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "grid-template-columns",
        mkTplTagX("div"),
        rsh({ display: "flex", "flex-direction": "row" }),
        ccRegistry
      )
    ).toBe(false);
    // invalid/shorthand CSS props
    expect(
      isValidStylePropForTpl(
        "not-a-css-prop",
        mkTplTagX("div"),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "text-decoration",
        mkTplTagX("div"),
        baseVs,
        ccRegistry
      )
    ).toBe(false);
  });

  it("respects code component styleSections for visibility/opacity", () => {
    const baseVs = rsh();
    // styleSections: false disables everything
    const disabledRegistry = mkCcRegistry("AllDisabled", {
      styleSections: false,
    });
    const disabledTpl = mkCodeComponentTpl("AllDisabled");
    expect(
      isValidStylePropForTpl("opacity", disabledTpl, baseVs, disabledRegistry)
    ).toBe(false);
    expect(
      isValidStylePropForTpl(
        "visibility",
        disabledTpl,
        baseVs,
        disabledRegistry
      )
    ).toBe(false);

    // styleSections: ["visibility"] enables opacity and visibility
    const visRegistry = mkCcRegistry("VisOnly", {
      styleSections: ["visibility"],
    });
    const visTpl = mkCodeComponentTpl("VisOnly");
    expect(isValidStylePropForTpl("opacity", visTpl, baseVs, visRegistry)).toBe(
      true
    );
    expect(
      isValidStylePropForTpl("visibility", visTpl, baseVs, visRegistry)
    ).toBe(true);

    // styleSections: ["spacing"] does not enable opacity/visibility
    const spacingRegistry = mkCcRegistry("SpacingOnly", {
      styleSections: ["spacing"],
    });
    const spacingTpl = mkCodeComponentTpl("SpacingOnly");
    expect(
      isValidStylePropForTpl("opacity", spacingTpl, baseVs, spacingRegistry)
    ).toBe(false);
    expect(
      isValidStylePropForTpl("visibility", spacingTpl, baseVs, spacingRegistry)
    ).toBe(false);
  });
});

function mkImageTpl() {
  return mkTplTagX("img", { type: TplTagType.Image });
}

function mkIconTpl() {
  return mkTplTagX("svg", { type: TplTagType.Image });
}

function mkPlainComponentTpl() {
  const component = mkComponent({
    name: "TestPlain",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div"),
  });
  return mkTplComponent(component, TEST_GLOBAL_VARIANT, []);
}

function mkCodeComponentTpl(name = "TestCode") {
  const component = mkComponent({
    name,
    type: ComponentType.Code,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: {} as CodeComponentMeta,
  });
  return mkTplComponent(component, TEST_GLOBAL_VARIANT, []);
}

function mkCcRegistry(name: string, metaOverrides: Record<string, any>) {
  const win = {
    __PlasmicComponentRegistry: [
      { component: (() => null) as any, meta: { name, ...metaOverrides } },
    ],
  };
  return new CodeComponentsRegistry(win as any, {});
}
