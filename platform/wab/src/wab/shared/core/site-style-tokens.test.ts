import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
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
    depSite.styleTokens.push(imported);
    site.projectDependencies.push(
      new ProjectDependency({
        site: depSite,
        name: "dep",
        projectId: "dep",
        pkgId: "dep",
        uuid: "dep",
        version: "1.0.0",
      }),
    );
    const alias = mkStyleToken({
      name: "alias",
      type: "Color",
      value: mkTokenRef(imported),
    });
    const extra = mkStyleToken({ name: "extra", type: "Color", value: "blue" });
    site.styleTokens.push(alias, extra);
    const component = mkComponent({
      name: "test",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
    });
    site.components.push(component);
    const vs = ensureBaseVariantSetting(component, component.tplTree);
    vs.rs.mixins.push(
      new Mixin({
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
      }),
    );
    if (observable) {
      mobx.makeObservable(site, {
        styleTokens: mobx.observable.shallow,
        styleTokenOverrides: mobx.observable.shallow,
      });
      mobx.makeObservable(alias, { value: mobx.observable });
    }
    const used = () =>
      componentToUsedTokens(site, component).map((t) => t.uuid);
    expect(used()).toEqual([alias.uuid, imported.uuid]);
    mobx.runInAction(() =>
      site.styleTokenOverrides.push(
        new StyleTokenOverride({
          token: imported,
          value: mkTokenRef(extra),
          variantedValues: [],
        }),
      ),
    );
    expect(used()).toEqual([alias.uuid, imported.uuid, extra.uuid]);
    mobx.runInAction(() => site.styleTokens.splice(1, 1));
    expect(used()).toEqual([alias.uuid, imported.uuid]);
    mobx.runInAction(() => site.styleTokens.push(extra));
    expect(used()).toEqual([alias.uuid, imported.uuid, extra.uuid]);
    mobx.runInAction(() => (alias.value = "green"));
    expect(used()).toEqual([alias.uuid]);
  });
}
