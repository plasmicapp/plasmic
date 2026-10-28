import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { observeSiteForTest } from "@/wab/shared/__testonly__/site-tests-utils";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { componentToUsedTokens } from "@/wab/shared/core/site-style-tokens";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import mobx from "@/wab/shared/import-mobx";
import {
  Mixin,
  ProjectDependency,
  RuleSet,
  StyleTokenOverride,
} from "@/wab/shared/model/classes";

for (const observable of [false, true]) {
  it(`collects token aliases through mixins and refreshes overrides (observable=${observable})`, () => {
    const site = createSite();
    const depSite = createSite();
    const imported = mkStyleToken({
      name: "imported",
      type: "Color",
      value: "red",
    });
    depSite.styleTokens = [...depSite.styleTokens, imported];
    site.projectDependencies = [
      ...site.projectDependencies,
      new ProjectDependency({
        site: depSite,
        name: "dep",
        projectId: "dep",
        pkgId: "dep",
        uuid: "dep",
        version: "1.0.0",
      }),
    ];
    const alias = mkStyleToken({
      name: "alias",
      type: "Color",
      value: mkTokenRef(imported),
    });
    const extra = mkStyleToken({ name: "extra", type: "Color", value: "blue" });
    site.styleTokens = [...site.styleTokens, alias, extra];
    const component = mkComponent({
      name: "test",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
    });
    site.components = [...site.components, component];
    const vs = ensureBaseVariantSetting(component, component.tplTree);
    const mixin = new Mixin({
      name: "test",
      uuid: "mixin",
      preview: null,
      forTheme: false,
      variantedRs: [],
      rs: new RuleSet({
        values: { color: mkTokenRef(alias) },
        mixins: [],
        animations: null,
      }),
    });
    site.mixins = [...site.mixins, mixin];
    vs.rs.mixins = [...vs.rs.mixins, mixin];
    if (observable) {
      const tracker = observeSiteForTest(site);
      onTestFinished(() => tracker.dispose());
    }
    const used = () =>
      componentToUsedTokens(site, component).map((t) => t.uuid);
    expect(used()).toEqual([alias.uuid, imported.uuid]);
    mobx.runInAction(() => {
      site.styleTokenOverrides = [
        ...site.styleTokenOverrides,
        new StyleTokenOverride({
          token: imported,
          value: mkTokenRef(extra),
          variantedValues: [],
        }),
      ];
    });
    expect(used()).toEqual([alias.uuid, imported.uuid, extra.uuid]);
    mobx.runInAction(() => {
      site.styleTokens = site.styleTokens.filter((_, i) => i !== 1);
    });
    expect(used()).toEqual([alias.uuid, imported.uuid]);
    mobx.runInAction(() => {
      site.styleTokens = [...site.styleTokens, extra];
    });
    expect(used()).toEqual([alias.uuid, imported.uuid, extra.uuid]);
    mobx.runInAction(() => (alias.value = "green"));
    expect(used()).toEqual([alias.uuid]);
  });
}
