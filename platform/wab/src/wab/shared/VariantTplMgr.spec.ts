import { RSH } from "@/wab/shared/RuleSetHelpers";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { CodeComponentMeta, Component } from "@/wab/shared/model/classes";
import {
  createTplMgr,
  createVariantTplMgr,
} from "@/wab/shared/tests/site-tests-utils";

function mkCodeComponent(defaultStyles?: Record<string, string>): Component {
  return mkComponent({
    name: "CodeComp",
    type: ComponentType.Code,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: {
      defaultStyles: defaultStyles
        ? mkRuleSet({ values: defaultStyles })
        : null,
    } as CodeComponentMeta,
  });
}

describe("VariantTplMgr.mkTplComponentWithDefaults", () => {
  function instantiate(component: Component) {
    const site = createSite();
    const tplMgr = createTplMgr(site);
    const vtm = createVariantTplMgr(site, tplMgr);
    const tpl = vtm.mkTplComponentWithDefaults(component);
    return RSH(vtm.ensureBaseVariantSetting(tpl).rs, tpl);
  }

  it("applies the fallback max-width/object-fit when defaultStyles omits them", () => {
    const exp = instantiate(mkCodeComponent());
    expect(exp.getRaw("max-width")).toBe("100%");
    expect(exp.getRaw("object-fit")).toBe("cover");
  });

  it("respects registered defaultStyles instead of clobbering them", () => {
    const exp = instantiate(
      mkCodeComponent({ "max-width": "none", "object-fit": "contain" })
    );
    expect(exp.getRaw("max-width")).toBe("none");
    expect(exp.getRaw("object-fit")).toBe("contain");
  });

  it("only overrides the props that defaultStyles specifies", () => {
    const exp = instantiate(mkCodeComponent({ "object-fit": "contain" }));
    // max-width wasn't specified, so the fallback still applies
    expect(exp.getRaw("max-width")).toBe("100%");
    expect(exp.getRaw("object-fit")).toBe("contain");
  });

  it("still applies the max-width default to plain components (no object-fit)", () => {
    const plainComponent = mkComponent({
      name: "PlainComp",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
    });
    const exp = instantiate(plainComponent);
    expect(exp.getRaw("max-width")).toBe("100%");
    // object-fit is only defaulted for code components
    expect(exp.getRaw("object-fit")).toBeUndefined();
  });
});
