import { captureModelTarget } from "@/wab/client/components/editor-sessions/model-target";
import { HTMLAttributePropEditor } from "@/wab/client/components/sidebar-tabs/HTMLAttributesSection";
import type { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensureVariantSetting, mkVariant } from "@/wab/shared/Variants";
import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit, tryExtractLit } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { render } from "@testing-library/react";
import React from "react";

const row = vi.hoisted(() => ({ props: undefined as any }));
vi.mock("@/wab/client/components/sidebar-tabs/PropEditorRow", () => ({
  inferPropTypeFromAttr: () => "string",
  PropEditorRow: (props: any) => {
    row.props = props;
    return null;
  },
}));
vi.mock("@/wab/shared/defined-indicator", () => ({
  computeDefinedIndicator: () => ({ source: "set" }),
}));

it("captures native attribute variants and detects external changes and deletion", async () => {
  const tpl = mkTplTagX("div");
  const component = mkComponent({
    name: "Test",
    type: ComponentType.Plain,
    tplTree: tpl,
  });
  const site = createSite();
  site.components = [...site.components, component];
  const a = mkVariant({ name: "Hover", selectors: [":hover"] });
  const b = mkVariant({ name: "Focus", selectors: [":focus"] });
  component.variants = [...component.variants, a, b];
  const base = ensureVariantSetting(tpl, [
    ensure(component.variants[0], "Base variant"),
  ]);
  const first = ensureVariantSetting(tpl, [a]);
  const second = ensureVariantSetting(tpl, [b]);
  first.attrs = { title: codeLit("first") };
  second.attrs = { title: codeLit("second") };
  let current = first;
  const viewCtx = {
    site,
    currentComponent: () => component,
    variantTplMgr: () => ({
      tryGetBaseVariantSetting: () => base,
      tryGetCurrentSharedVariantSetting: () => current,
    }),
    tagMeta: () => ({ expandLabel: () => "Title" }),
    change: async (fn: () => void) => fn(),
  } as unknown as ViewCtx;
  const makeExpsProvider = () =>
    ({
      effectiveVs: () => ({ attrs: current.attrs, getAttrSource: () => [] }),
      targetIndicatorCombo: [],
    }) as unknown as TplExpsProvider;
  const renderEditor = () => (
    <HTMLAttributePropEditor
      viewCtx={viewCtx}
      tpl={tpl}
      expsProvider={makeExpsProvider()}
      attr="title"
    />
  );
  const view = render(renderEditor());
  const original = row.props;
  const captured = captureModelTarget(original.bindingTarget);
  current = second;
  view.rerender(renderEditor());
  expect(row.props.bindingTarget.key).not.toBe(original.bindingTarget.key);
  const edited = codeLit("edited");
  await original.onChange(edited);
  expect(first.attrs.title).toBe(edited);
  expect(tryExtractLit(second.attrs.title)).toBe("second");
  expect(captured.check()).toContain("changed outside");
  tpl.vsettings = tpl.vsettings.filter((vs) => vs !== first);
  expect(captured.check()).toContain("deleted");
});
