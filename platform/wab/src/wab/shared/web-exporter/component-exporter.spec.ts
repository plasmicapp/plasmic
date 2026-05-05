import { ensureVariantSetting, mkVariant } from "@/wab/shared/Variants";
import { Bundle } from "@/wab/shared/bundler";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { TplTag } from "@/wab/shared/model/classes";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";

describe("Component Serialization", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  it("serialize all components into text representation for prompt", () => {
    const output: Record<string, string> = {};
    for (const component of site.components) {
      output[component.name] = serializeComponent(component);
    }
    expect(output).toMatchSnapshot();
  });

  it("serializes variant attr overrides without overwriting tpl ids", () => {
    const component = mkComponent({
      name: "VariantAttrs",
      type: ComponentType.Plain,
      tplTree: (baseVariant) =>
        mkTplTagX("button", { baseVariant, attrs: { title: "Base" } }),
    });
    const tpl = component.tplTree as TplTag;
    const hover = mkVariant({
      name: "hover",
      selectors: [":hover"],
      forTpl: tpl,
    });
    component.variants.push(hover);

    const vs = ensureVariantSetting(tpl, [hover]);
    vs.attrs["aria-label"] = codeLit("Hover label");
    vs.attrs.id = codeLit("html-id");

    const output = serializeComponent(component);
    expect(output).toContain(`<button id="${tpl.uuid}" title="Base">`);
    expect(output).toContain(`<Attrs>{"aria-label":"Hover label"}</Attrs>`);
    expect(output).not.toContain(`html-id`);
  });
});
