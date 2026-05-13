import { createComponent } from "@/wab/client/operations/create-component";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import * as Tpls from "@/wab/shared/core/tpls";

describe("createComponent", () => {
  function setup() {
    return setupComponentWithTplTree(Tpls.mkTplTagX("div", {}));
  }

  it("creates a reusable component with default root", () => {
    const { site, tplMgr } = setup();
    const before = site.components.length;

    const result = createComponent({
      tplMgr,
      name: "CopilotNewButton",
      type: ComponentType.Plain,
    });

    assert(result.result === "success", "expected created result");
    expect(site.components.length).toEqual(before + 1);
    expect(result.component.name).toEqual("CopilotNewButton");
    expect(result.component.type).toEqual(ComponentType.Plain);
    expect(result.component.tplTree).toBeDefined();
    expect(result.component.variantGroups).toEqual([]);
  });

  it("creates a page with default pageMeta synthesized from name", () => {
    const { site, tplMgr } = setup();

    const result = createComponent({
      tplMgr,
      name: "PricingPage",
      type: ComponentType.Page,
    });

    assert(result.result === "success", "expected created result");
    expect(result.component.type).toEqual(ComponentType.Page);
    assert(result.component.pageMeta, "Expected pageMeta to exists");
    expect(result.component.pageMeta.path).toEqual("/pricing-page");
    expect(result.component.pageMeta.roleId).toEqual(site.defaultPageRoleId);
    expect(
      site.pageArenas.some((a) => a.component === result.component)
    ).toEqual(true);
  });

  it("creates a page with caller-provided pageMeta", () => {
    const { tplMgr } = setup();

    const result = createComponent({
      tplMgr,
      name: "AboutPage",
      type: ComponentType.Page,
      pageMeta: {
        path: "/about",
        title: "About Us",
        description: "Learn about our company",
        canonical: "https://example.com/about",
        openGraphImage: "https://example.com/og/about.png",
        params: { section: "team" },
        query: { utm: "homepage" },
      },
    });

    assert(result.result === "success", "expected created result");
    const { pageMeta } = result.component;
    assert(pageMeta, "Expected pageMeta to exists");
    expect(pageMeta.path).toEqual("/about");
    expect(pageMeta.title).toEqual("About Us");
    expect(pageMeta.description).toEqual("Learn about our company");
    expect(pageMeta.canonical).toEqual("https://example.com/about");
    expect(pageMeta.openGraphImage).toEqual("https://example.com/og/about.png");
    expect(pageMeta.params).toEqual({ section: "team" });
    expect(pageMeta.query).toEqual({ utm: "homepage" });
  });

  it("accepts a partial pageMeta and synthesizes the rest", () => {
    const { site, tplMgr } = setup();

    const result = createComponent({
      tplMgr,
      name: "ContactPage",
      type: ComponentType.Page,
      pageMeta: { title: "Get in touch" },
    });

    assert(result.result === "success", "expected created result");
    const { pageMeta } = result.component;
    assert(pageMeta, "Expected pageMeta to exists");
    expect(pageMeta.title).toEqual("Get in touch");
    // Missing path falls back to the slugified component name.
    expect(pageMeta.path).toEqual("/contact-page");
    // roleId is system-controlled, sourced from the site.
    expect(pageMeta.roleId).toEqual(site.defaultPageRoleId);
  });

  it("normalizes raw caller-provided path input", () => {
    const { tplMgr } = setup();

    const result = createComponent({
      tplMgr,
      name: "RawPathPage",
      type: ComponentType.Page,
      pageMeta: { path: "About Us" },
    });

    assert(result.result === "success", "expected created result");
    // nameToPath kebab-cases segments and adds the leading slash.
    assert(result.component.pageMeta, "Expected pageMeta to exists");
    expect(result.component.pageMeta.path).toEqual("/about-us");
  });

  it("uniquifies colliding page paths", () => {
    const { tplMgr } = setup();

    const first = createComponent({
      tplMgr,
      name: "PricingA",
      type: ComponentType.Page,
      pageMeta: { path: "/pricing" },
    });
    const second = createComponent({
      tplMgr,
      name: "PricingB",
      type: ComponentType.Page,
      pageMeta: { path: "/pricing" },
    });

    assert(first.result === "success", "expected first to be created");
    assert(second.result === "success", "expected second to be created");
    assert(first.component.pageMeta, "Expected pageMeta to exists");
    assert(second.component.pageMeta, "Expected pageMeta to exists");

    expect(first.component.pageMeta.path).toEqual("/pricing");
    expect(second.component.pageMeta.path).not.toEqual("/pricing");
  });

  it("composes with createVariantGroup to add variant groups", () => {
    const { tplMgr } = setup();

    const result = createComponent({
      tplMgr,
      name: "CopilotBadge",
      type: ComponentType.Plain,
    });
    assert(result.result === "success", "expected success result");

    const { component } = result;
    createVariantGroup({
      component,
      tplMgr,
      name: "color",
      optionsType: VariantOptionsType.singleChoice,
    });
    createVariantGroup({
      component,
      tplMgr,
      name: "isRounded",
      optionsType: VariantOptionsType.standalone,
    });

    expect(component.variantGroups.length).toEqual(2);

    const colorGroup = component.variantGroups.find(
      (g) => g.param.variable.name === "color"
    );
    expect(colorGroup).toBeDefined();

    const toggleGroup = component.variantGroups.find(
      (g) => g.param.variable.name === "isRounded"
    );
    expect(toggleGroup).toBeDefined();
    // toggle (standalone) groups have exactly one implicit variant
    expect(toggleGroup!.variants.length).toEqual(1);
  });

  it("errors on empty name", () => {
    const { tplMgr } = setup();
    const result = createComponent({
      tplMgr,
      name: "   ",
      type: ComponentType.Plain,
    });
    expect(result.result).toEqual("error");
  });

  it("uniquifies colliding component names", () => {
    const { tplMgr } = setup();

    const first = createComponent({
      tplMgr,
      name: "CopilotDup",
      type: ComponentType.Plain,
    });
    const second = createComponent({
      tplMgr,
      name: "CopilotDup",
      type: ComponentType.Plain,
    });

    assert(first.result === "success", "expected first to be created");
    assert(second.result === "success", "expected second to be created");
    expect(first.component.name).not.toEqual(second.component.name);
  });
});
