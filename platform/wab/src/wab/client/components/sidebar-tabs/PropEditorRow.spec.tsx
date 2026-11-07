import { PropEditorRowWrapper } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import type { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { getBaseVariant, mkVariant } from "@/wab/shared/Variants";
import {
  createTplMgr,
  createVariantTplMgr,
} from "@/wab/shared/__testonly__/site-tests-utils";
import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import { typeFactory } from "@/wab/shared/model/model-util";

// Inspect the wrapper's callbacks without rendering the prop editor itself.
vi.mock("mobx-react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("mobx-react")>()),
  observer: (component: unknown) => component,
}));
vi.mock("@/wab/shared/component-props", () => ({
  inferPropTypeFromParam: () => "string",
}));
vi.mock("@/wab/shared/defined-indicator", () => ({
  computeDefinedIndicator: () => ({ source: "set" }),
}));

it.each(["prop", "slot"] as const)(
  "writes and deletes a %s in its own setting while targeting a non-base variant",
  async (paramType) => {
    const param =
      paramType === "slot"
        ? mkParam({ name: "label", type: typeFactory.renderable(), paramType })
        : mkParam({ name: "label", type: typeFactory.text(), paramType });
    const child = mkComponent({
      name: "Child",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
      params: [param],
    });
    const root = mkTplTagX("div");
    const component = mkComponent({
      name: "Parent",
      type: ComponentType.Plain,
      tplTree: root,
    });
    const variant = mkVariant({ name: "Hover", selectors: [":hover"] });
    component.variants = [...component.variants, variant];
    const tpl = mkTplComponent(child, getBaseVariant(component));
    root.children = [tpl];
    tpl.parent = root;
    const site = createSite();
    site.components = [component, child];
    const vtm = createVariantTplMgr(site, createTplMgr(site), component);
    vi.spyOn(vtm, "getTargetVariantComboForNode").mockReturnValue([variant]);
    const base = vtm.ensureBaseVariantSetting(tpl);
    const target = vtm.ensureVariantSetting(tpl, [variant]);
    const viewCtx = {
      site,
      currentComponent: () => component,
      variantTplMgr: () => vtm,
      getComponentEvalContext: () => ({ invalidArgs: [] }),
      change: async (fn: () => void) => fn(),
      studioCtx: { changeSpawn: async (fn: () => void) => fn() },
    } as unknown as ViewCtx;
    const expsProvider = {
      effectiveVs: () => vtm.effectiveVariantSetting(tpl, [variant]),
      targetIndicatorCombo: [variant],
    } as unknown as TplExpsProvider;
    const row = ensure(
      PropEditorRowWrapper({ viewCtx, param, tpl, expsProvider }),
      "Expected a prop row",
    );
    const setting = paramType === "slot" ? base : target;
    const otherSetting = paramType === "slot" ? target : base;
    const expr = codeLit("edited");
    for (const remove of [
      () => row.props.onChange(undefined),
      row.props.onDelete,
    ]) {
      await row.props.onChange(expr);
      expect(setting.args[0]?.expr).toBe(expr);
      expect(otherSetting.args).toEqual([]);
      await remove();
      expect(setting.args).toEqual([]);
    }
  },
);
