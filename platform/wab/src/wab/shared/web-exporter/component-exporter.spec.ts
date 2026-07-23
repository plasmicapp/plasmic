import {
  ensureVariantSetting,
  getBaseVariant,
  mkVariant,
} from "@/wab/shared/Variants";
import { Bundle } from "@/wab/shared/bundler";
import {
  codeToDynExpr,
  interpolatedStringToTemplatedString,
} from "@/wab/shared/copilot/dynamic-value-input";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit, customCode } from "@/wab/shared/core/exprs";
import { mkParam, mkVar } from "@/wab/shared/core/lang";
import { TplTagType, mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ExprText,
  ObjectPath,
  Rep,
  TplComponent,
  TplTag,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import { TplVisibility, setTplVisibility } from "@/wab/shared/visibility-utils";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import {
  buildComponentResource,
  tplToHtml,
} from "@/wab/shared/web-exporter/component-exporter";
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

  it("serializes variant visibility overrides as data-visibility attrs", () => {
    const component = mkComponent({
      name: "VariantVisibility",
      type: ComponentType.Plain,
      tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
    });
    const tpl = component.tplTree as TplTag;
    const hover = mkVariant({
      name: "hover",
      selectors: [":hover"],
      forTpl: tpl,
    });
    component.variants.push(hover);

    // Hidden in the base variant, explicitly revealed by the variant.
    setTplVisibility(
      tpl,
      [getBaseVariant(component)],
      TplVisibility.DisplayNone
    );
    setTplVisibility(tpl, [hover], TplVisibility.Visible);

    const result = buildComponentResource(component, { site });
    expect(result.baseVariantTplTree).toContain(
      `data-visibility="displayNone"`
    );
    expect(result.variantSettings).toMatchObject([
      { elements: [{ attrs: { "data-visibility": "visible" } }] },
    ]);
  });

  describe("dynamic values", () => {
    it("serializes dynamic text (ExprText) as a {{ }} interpolation", () => {
      const component = mkComponent({
        name: "DynamicText",
        type: ComponentType.Plain,
        tplTree: (baseVariant) =>
          mkTplTagX("h1", { baseVariant, type: TplTagType.Text }),
      });
      const tpl = component.tplTree as TplTag;
      const vs = ensureVariantSetting(tpl, [getBaseVariant(component)]);
      vs.text = new ExprText({
        expr: interpolatedStringToTemplatedString(
          "Posts in {{ $ctx.params.category }}"
        ),
        html: false,
      });

      const output = tplToHtml(tpl, site);
      expect(output).toContain("Posts in {{ $ctx.params.category }}");
    });

    it("serializes a dynamic attribute as a {{ }} interpolation", () => {
      const component = mkComponent({
        name: "DynamicAttr",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("a", { baseVariant }),
      });
      const tpl = component.tplTree as TplTag;
      const vs = ensureVariantSetting(tpl, [getBaseVariant(component)]);
      vs.attrs.href = codeToDynExpr("currentItem.url");

      const output = tplToHtml(tpl, site);
      expect(output).toContain(`href="{{ currentItem.url }}"`);
    });

    it("serializes repetition as data-repeat attributes", () => {
      const component = mkComponent({
        name: "Repeater",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      const tpl = component.tplTree as TplTag;
      const vs = ensureVariantSetting(tpl, [getBaseVariant(component)]);
      vs.dataRep = new Rep({
        collection: codeToDynExpr("$q.pokedex.data") as ObjectPath,
        element: mkVar("currentItem"),
        index: mkVar("currentIndex"),
      });

      const output = tplToHtml(tpl, site);
      expect(output).toContain(`data-repeat="{{ $q.pokedex.data }}"`);
      expect(output).toContain(`data-repeat-item="currentItem"`);
      expect(output).toContain(`data-repeat-index="currentIndex"`);
    });

    it("serializes a dynamic visibility condition as data-visible-if", () => {
      const component = mkComponent({
        name: "ConditionalVisible",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      const tpl = component.tplTree as TplTag;
      const combo = [getBaseVariant(component)];
      const vs = ensureVariantSetting(tpl, combo);
      setTplVisibility(tpl, combo, TplVisibility.CustomExpr);
      vs.dataCond = customCode("$q.users.data.length");

      const output = tplToHtml(tpl, site);
      expect(output).toContain(`data-visible-if="{{ $q.users.data.length }}"`);
    });

    it("serializes static displayNone as data-visibility", () => {
      const component = mkComponent({
        name: "HiddenBox",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      const tpl = component.tplTree as TplTag;
      const combo = [getBaseVariant(component)];
      ensureVariantSetting(tpl, combo);
      setTplVisibility(tpl, combo, TplVisibility.DisplayNone);

      const output = tplToHtml(tpl, site);
      expect(output).toContain(`data-visibility="displayNone"`);
    });

    it("serializes a dynamic component prop into data-props as {{ }}", () => {
      const inner = mkComponent({
        name: "Card",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      const labelParam = mkParam({
        name: "label",
        type: typeFactory.text(),
        paramType: "prop",
      });
      inner.params.push(labelParam);

      const host = mkComponent({
        name: "Host",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      const instance = mkTplComponentX({
        component: inner,
        baseVariant: getBaseVariant(host),
        args: {
          [labelParam.variable.name]: codeToDynExpr("currentItem.name"),
        },
      }) as TplComponent;

      const output = tplToHtml(instance, site);
      expect(output).toContain(`data-props=`);
      expect(output).toContain(`{{ currentItem.name }}`);
    });
  });
});
