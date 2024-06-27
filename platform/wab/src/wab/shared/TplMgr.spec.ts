import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import {
  Arg,
  ensureKnownTplTag,
  TplComponent,
  VariantGroup,
  VariantsRef,
} from "@/wab/shared/model/classes";
import { ensureBaseVariant, TplMgr, uniquePagePath } from "@/wab/shared/TplMgr";
import { mkVariantSetting } from "@/wab/shared/Variants";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";

describe("uniquePagePath", () => {
  it("works", () => {
    // Part 1: no prefix.

    expect(uniquePagePath("/", ["/blah"])).toBe("/");
    expect(uniquePagePath("/", ["/"])).toBe("/new-page");
    expect(uniquePagePath("/", ["/", "/new-page"])).toBe("/new-page-2");
    expect(uniquePagePath("/", ["/", "/new-page", "/new-page-2"])).toBe(
      "/new-page-3"
    );

    expect(
      uniquePagePath("/[a]/[b]", ["/", "/foo/bar", "/[a]", "/[a]/[b]/[c]"])
    ).toBe("/[a]/[b]");
    expect(uniquePagePath("/[a]/[b]", ["/[x]/[y]"])).toBe("/new-page/[a]/[b]");
    expect(uniquePagePath("/[a]/[b]", ["/[a]/[b]", "/new-page/[a]/[b]"])).toBe(
      "/new-page-2/[a]/[b]"
    );
    expect(
      uniquePagePath("/[a]/[b]", [
        "/[a]/[b]",
        "/new-page/[a]/[b]",
        "/new-page-2/[a]/[b]",
      ])
    ).toBe("/new-page-3/[a]/[b]");

    // Part 2: there is prefix.

    // No-changes.

    expect(
      uniquePagePath("/pre/[pre]/part/[a]/[b]", [
        "/pre/[pre]/part",
        "/pre/[pre]/part/foo/bar",
        "/pre/[pre]/part/[a]",
        "/pre/[pre]/part/[a]/[b]/[c]",
      ])
    ).toBe("/pre/[pre]/part/[a]/[b]");
    expect(
      uniquePagePath("/pre/[pre]/part", [
        "/pre/[pre]",
        "/pre/[pre]/[a]",
        "/pre/[pre]/part/foo/bar",
        "/pre/[pre]/part/[a]",
        "/pre/[pre]/part/[a]/[b]/[c]",
      ])
    ).toBe("/pre/[pre]/part");

    // Changes.

    for (const suffix of ["", "/[a]/[b]"]) {
      expect(
        uniquePagePath(`/pre/[pre]/part${suffix}`, [
          suffix ? "/pre/[p]/part/[x]/[y]" : "/pre/[p]/part",
        ])
      ).toBe(`/pre/[pre]/part-2${suffix}`);
      expect(
        uniquePagePath(`/pre/[pre]/part${suffix}`, [
          `/pre/[pre]/part${suffix}`,
          `/pre/[pre]/part-2${suffix}`,
        ])
      ).toBe(`/pre/[pre]/part-3${suffix}`);
    }
  });
});

describe("TplMgr", () => {
  describe("tryRemoveVariant", () => {
    const site = createSite();
    const mgr = new TplMgr({ site: site });

    const screenV1 = mgr.createScreenVariant({
      name: "mobile",
      spec: new ScreenSizeSpec(undefined, 500),
    });

    const component = mkComponent({
      tplTree: mkTplTagX("div", {}),
      type: ComponentType.Plain,
    });
    mgr.attachComponent(component);
    const groupSingle = mgr.createVariantGroup({ component: component });
    const singleV1 = mgr.createVariant(component, groupSingle);
    const singleV2 = mgr.createVariant(component, groupSingle);

    const groupMulti = mgr.createVariantGroup({ component: component });
    groupMulti.multi = true;
    const multiV1 = mgr.createVariant(component, groupMulti);
    const multiV2 = mgr.createVariant(component, groupMulti);
    const multiV3 = mgr.createVariant(component, groupMulti);

    const componentRoot = ensureKnownTplTag(component.tplTree);
    let vs1, vs2, vs3, vs4, vs5;
    componentRoot.vsettings.push(
      (vs1 = mkVariantSetting({ variants: [singleV1] }))
    );
    componentRoot.vsettings.push(
      (vs2 = mkVariantSetting({ variants: [singleV2] }))
    );
    componentRoot.vsettings.push(
      (vs3 = mkVariantSetting({ variants: [multiV1] }))
    );
    componentRoot.vsettings.push(
      (vs4 = mkVariantSetting({ variants: [multiV2] }))
    );
    componentRoot.vsettings.push(
      (vs5 = mkVariantSetting({ variants: [multiV2, screenV1] }))
    );

    const rootComponent = mkComponent({
      tplTree: mkTplTagX("div", {}),
      type: ComponentType.Plain,
    });
    mgr.attachComponent(rootComponent);
    const root = ensureKnownTplTag(rootComponent.tplTree);

    const tpl1 = mkTplComponentX({
      component,
      baseVariant: ensureBaseVariant(rootComponent),
      args: [
        new Arg({
          param: groupSingle.param,
          expr: new VariantsRef({ variants: [singleV1] }),
        }),
        new Arg({
          param: groupMulti.param,
          expr: new VariantsRef({ variants: [multiV2] }),
        }),
      ],
    });
    root.children.push(tpl1);

    const tpl2 = mkTplComponentX({
      component,
      baseVariant: ensureBaseVariant(rootComponent),
      args: [
        new Arg({
          param: groupSingle.param,
          expr: new VariantsRef({ variants: [singleV2] }),
        }),
        new Arg({
          param: groupMulti.param,
          expr: new VariantsRef({ variants: [multiV1, multiV2, multiV3] }),
        }),
      ],
    });
    root.children.push(tpl2);

    const getArg = (tpl: TplComponent, group: VariantGroup) => {
      return tpl.vsettings[0].args.find((a) => a.param === group.param);
    };

    it("removes from single group", () => {
      mgr.tryRemoveVariant(singleV1, component);
      const arg1 = getArg(tpl1, groupSingle);
      expect(arg1).toBe(undefined);
      const arg2 = getArg(tpl2, groupSingle);
      expect((arg2?.expr as VariantsRef).variants).toEqual([singleV2]);

      expect(groupSingle.variants).toEqual([singleV2]);

      expect(
        componentRoot.vsettings.find((vs) => vs.variants.includes(singleV1))
      ).toBeUndefined();
      expect(componentRoot.vsettings).not.toContain(vs1);
      expect(componentRoot.vsettings).toContain(vs2);
    });

    it("removes from multi group", () => {
      mgr.tryRemoveVariant(multiV2, component);
      const arg1 = getArg(tpl1, groupMulti);
      expect((arg1!.expr as VariantsRef).variants).toEqual([]);
      const arg2 = getArg(tpl2, groupMulti);
      expect((arg2!.expr as VariantsRef).variants).toEqual([multiV1, multiV3]);
      expect(groupMulti.variants).toEqual([multiV1, multiV3]);

      expect(
        componentRoot.vsettings.find((vs) => vs.variants.includes(multiV2))
      ).toBeUndefined();
      expect(componentRoot.vsettings).toContain(vs3);
      expect(componentRoot.vsettings).not.toContain(vs4);
      expect(componentRoot.vsettings).not.toContain(vs5);
    });
  });
});
