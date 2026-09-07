import { createMixin } from "@/wab/client/operations/create-mixin";
import { TplMgr } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";

describe("createMixin", () => {
  function setup() {
    const site = createSite();
    const tplMgr = new TplMgr({ site });
    return { site, tplMgr };
  }

  it("creates an empty mixin with the given name and preview", () => {
    const { site, tplMgr } = setup();

    const result = createMixin({
      tplMgr,
      name: "Heading",
      preview: "The quick brown fox",
    });

    assert(result.isOk(), "expected success result");
    expect(site.mixins).toEqual([result.value]);
    expect(result.value.name).toEqual("Heading");
    expect(result.value.preview).toEqual("The quick brown fox");
    expect(result.value.forTheme).toBe(false);
    expect(result.value.rs.values).toEqual({});
    expect(result.value.variantedRs).toEqual([]);
  });

  it("uniquifies a colliding name", () => {
    const { site, tplMgr } = setup();

    createMixin({ tplMgr, name: "Heading", preview: undefined });
    const result = createMixin({ tplMgr, name: "Heading", preview: undefined });

    assert(result.isOk(), "expected success result");
    expect(result.value.name).not.toEqual("Heading");
    expect(site.mixins.length).toEqual(2);
  });

  it("errors on empty name", () => {
    const { site, tplMgr } = setup();
    const result = createMixin({ tplMgr, name: "   ", preview: undefined });
    expect(result.isErr()).toBe(true);
    expect(site.mixins).toEqual([]);
  });
});
