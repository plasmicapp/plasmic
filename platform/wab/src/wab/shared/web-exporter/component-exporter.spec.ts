import { ensureVariantSetting, mkVariant } from "@/wab/shared/Variants";
import { Bundle } from "@/wab/shared/bundler";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { TplTag } from "@/wab/shared/model/classes";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import { buildComponentResource } from "@/wab/shared/web-exporter/component-exporter";
import { jsonToXml } from "@/wab/shared/web-exporter/json-to-xml";

describe("Component Serialization", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  it("serializes all components", () => {
    const output: Record<string, unknown> = {};
    const xmlOutput: Record<string, string> = {};
    for (const component of site.components) {
      const resource = buildComponentResource(component, { site });
      output[component.name] = resource;
      xmlOutput[component.name] = jsonToXml(resource, true);
    }
    expect(xmlOutput).toMatchSnapshot();
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

    const result = buildComponentResource(component, { site });
    // Base tree keeps the tpl's own id and base attr.
    expect(result.baseVariantTplTree).toContain(
      `<button id="${tpl.uuid}" title="Base">`
    );
    // The hover variant's attr override is captured; the reserved `id` attr is
    // not applied (so the tpl's id is never overwritten).
    expect(result.variantSettings).toMatchObject([
      { elements: [{ attrs: { "aria-label": "Hover label" } }] },
    ]);
    expect(JSON.stringify(result)).not.toContain("html-id");
  });
});
