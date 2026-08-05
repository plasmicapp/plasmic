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
import {
  DataQueryJson,
  LegacyDataQueryJson,
} from "@/wab/shared/web-exporter/schema";

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

  describe("data queries", () => {
    const dataQueries: DataQueryJson[] = [
      {
        __type: "DataQuery",
        name: "Users",
        uuid: "sq1",
        reference: "$q.users",
        kind: "customCode",
        code: "(await $$.fetch('/api/users'))",
      },
      {
        __type: "DataQuery",
        name: "People",
        uuid: "sq2",
        reference: "$q.people",
        kind: "function",
        functionId: "plasmic.fetch",
        args: [
          {
            __type: "InterpolatedString",
            name: "url",
            value: "{{ $ctx.params.api }}",
          },
        ],
      },
    ];
    const legacyDataQueries: LegacyDataQueryJson[] = [
      {
        __type: "LegacyDataQuery",
        name: "Get Users",
        uuid: "dq1",
        reference: "$queries.getUsers",
        op: {
          __type: "DataSourceOp",
          sourceId: "src1",
          sourceName: "My Postgres",
          sourceType: "postgres",
          opName: "getList",
          opLabel: "Get List",
          opId: "op1",
          roleId: "role1",
          cacheKey: "{{ $ctx.params.q }}",
          args: [
            {
              __type: "DataSourceOpArg",
              name: "resource",
              fieldType: "table",
              value: "users",
            },
          ],
        },
      },
    ];

    const mkQueriesComponent = (name: string) => {
      const component = mkComponent({
        name,
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      // mkTplTagX only attaches a base variant setting when given attrs/styles.
      ensureVariantSetting(component.tplTree as TplTag, [
        getBaseVariant(component),
      ]);
      return component;
    };

    it("includes query definitions in the component model and its XML", () => {
      const component = mkQueriesComponent("WithQueries");

      const result = buildComponentResource(component, {
        site,
        dataQueries,
        legacyDataQueries,
      });

      expect(result.dataQueries).toEqual(dataQueries);
      expect(result.legacyDataQueries).toEqual(legacyDataQueries);

      // Query definitions come after `variants` and before the tpl tree, so
      // the model sees how `$q.*` / `$queries.*` are configured before usages.
      const keys = Object.keys(result);
      expect(keys.indexOf("dataQueries")).toBeGreaterThan(
        keys.indexOf("variants")
      );
      expect(keys.indexOf("legacyDataQueries")).toBeLessThan(
        keys.indexOf("baseVariantTplTree")
      );

      const xml = jsonToXml(result, true);
      expect(xml).toContain(`reference="$q.users"`);
      expect(xml).toContain(`reference="$queries.getUsers"`);
      expect(xml).toContain(`sourceName="My Postgres"`);
      // The modern queries surface as `dataQueries`, never "server queries".
      expect(xml).not.toContain("server-quer");
      expect(xml).not.toContain("ServerQuery");
    });

    it("omits both fields when there are no queries", () => {
      const component = mkQueriesComponent("NoQueries");

      const result = buildComponentResource(component, {
        site,
        dataQueries: [],
        legacyDataQueries: [],
      });

      expect(result.dataQueries).toBeUndefined();
      expect(result.legacyDataQueries).toBeUndefined();
    });
  });
});
