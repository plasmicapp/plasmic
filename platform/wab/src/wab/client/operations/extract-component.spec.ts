import { extractComponent } from "@/wab/client/operations/extract-component";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant, mkVariantSetting } from "@/wab/shared/Variants";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import {
  addComponentState,
  mkValueStateForTextInput,
} from "@/wab/shared/core/states";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { TplTag, Variant } from "@/wab/shared/model/classes";

function setup() {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const component = tplMgr.addComponent({
    name: "Container",
    type: ComponentType.Plain,
  });
  const base = getBaseVariant(component);
  const root = component.tplTree as TplTag;
  return { site, tplMgr, component, base, root };
}

function mkChild(base: Variant, opts: { name?: string } = {}) {
  return mkTplTagX(opts.name ? "input" : "div", {
    name: opts.name,
    baseVariant: base,
    variants: [mkVariantSetting({ variants: [base] })],
  });
}

describe("extractComponent operation", () => {
  it("extracts a subtree into a new component attached to the site", () => {
    const { site, tplMgr, component, base, root } = setup();
    const child = mkChild(base);
    $$$(root).append(child);

    const result = extractComponent({
      site,
      containingComponent: component,
      tpl: child,
      name: "Extracted",
      tplMgr,
      getCanvasEnvForTpl: () => undefined,
    });

    expect(result.result).toEqual("success");
    if (result.result === "success") {
      expect(result.tplComponent.component.name).toEqual("Extracted");
      expect(site.components).toContain(result.tplComponent.component);
      // The original child is replaced by an instance of the new component.
      expect(root.children).toContain(result.tplComponent);
      expect(root.children).not.toContain(child);
    }
  });

  it("uniquifies the new component name on collision", () => {
    const { site, tplMgr, component, base, root } = setup();
    tplMgr.addComponent({ name: "Taken", type: ComponentType.Plain });
    const child = mkChild(base);
    $$$(root).append(child);

    const result = extractComponent({
      site,
      containingComponent: component,
      tpl: child,
      name: "Taken",
      tplMgr,
      getCanvasEnvForTpl: () => undefined,
    });

    expect(result.result).toEqual("success");
    if (result.result === "success") {
      expect(result.tplComponent.component.name).not.toEqual("Taken");
    }
  });

  it("returns a structured error when an implicit state is referenced outside the subtree", () => {
    const { site, tplMgr, component, base, root } = setup();
    const child = mkChild(base, { name: "myInput" });
    const sibling = mkChild(base);
    $$$(root).append(child);
    $$$(root).append(sibling);

    const state = mkValueStateForTextInput(child, component, tplMgr);
    addComponentState(site, component, state);

    const siblingVs = sibling.vsettings[0];
    siblingVs.dataCond = customCode(`$state.myInput.value`);

    const result = extractComponent({
      site,
      containingComponent: component,
      tpl: child,
      name: "Extracted",
      tplMgr,
      getCanvasEnvForTpl: () => undefined,
    });

    expect(result.result).toEqual("error");
    if (result.result === "error") {
      expect(result.message).toContain("referenced in the current component");
      // No component is created on failure.
      expect(site.components.map((c) => c.name)).not.toContain("Extracted");
    }
  });
});
