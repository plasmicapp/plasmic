import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { computedProjectFlags } from "@/wab/shared/cached-selectors";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import * as projectDeps from "@/wab/shared/core/project-deps";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  Component,
  Mixin,
  ProjectDependency,
  RuleSet,
  SelectorRuleSet,
  Site,
  StyleExpr,
  TplTag,
} from "@/wab/shared/model/classes";
import {
  calculateSemVer,
  compareSites,
  hashExpr,
} from "@/wab/shared/site-diffs";
import L from "lodash";

function mkSite(namedTpls: number) {
  const depSite = createSite();
  const depToken = mkStyleToken({
    name: "depColor",
    type: "Color",
    value: "#010101",
  });
  depSite.styleTokens.push(depToken);
  const site = createSite();
  site.projectDependencies.push(
    new ProjectDependency({
      name: "dep",
      projectId: "dep-project",
      uuid: "dep-uuid",
      pkgId: "dep-pkg",
      version: "0.0.1",
      site: depSite,
    }),
  );
  const local = mkStyleToken({
    name: "local",
    type: "Color",
    value: "#020202",
  });
  const alias = mkStyleToken({
    name: "alias",
    type: "Color",
    value: mkTokenRef(local),
  });
  site.styleTokens.push(local, alias);

  const root = mkTplTagX("div", { name: "root" });
  const comp: Component = mkComponent({
    name: "comp",
    tplTree: root,
    type: ComponentType.Plain,
  });
  site.components.push(comp);
  ensureBaseVariantSetting(comp, root);
  for (let i = 0; i < namedTpls; i++) {
    const child = mkTplTagX("div", { name: `box${i}` }) as TplTag;
    root.children.push(child);
    child.parent = root;
    const rs = ensureBaseVariantSetting(comp, child).rs;
    rs.values["color"] = mkTokenRef(alias);
    rs.values["border-color"] = `1px solid ${mkTokenRef(depToken)}`;
    rs.values["margin"] = "4px";
  }
  const mixin = new Mixin({
    name: "mixin",
    rs: new RuleSet({
      values: { background: mkTokenRef(local) },
      mixins: [],
      animations: null,
    }),
    preview: null,
    uuid: mkShortId(),
    forTheme: false,
    variantedRs: [],
  });
  site.mixins.push(mixin);
  return { site, local, alias, depToken, comp };
}

const clone = (site: Site) => L.cloneDeep(site);

/** The changelog without uuids: description, release type and names. */
function compare(prev: Site, curr: Site) {
  const entries = compareSites(prev, curr);
  return {
    entries: entries.map((e) => [
      e.description,
      e.releaseType,
      typeof e.parentComponent === "string"
        ? e.parentComponent
        : e.parentComponent.name,
      (e.oldValue as any)?.type ?? null,
      (e.oldValue as any)?.name ?? null,
      (e.newValue as any)?.name ?? null,
    ]),
    semver: calculateSemVer(entries),
  };
}

function allDepsWalks(run: () => void) {
  const spy = vi.spyOn(projectDeps, "walkDependencyTree");
  try {
    run();
    return spy.mock.calls.filter(([, scope]) => scope === "all").length;
  } finally {
    spy.mockRestore();
  }
}

describe("compareSites with token refs", () => {
  it("reports nothing for identical sites, in both directions", () => {
    const { site } = mkSite(3);
    const other = clone(site);
    expect(compare(site, other)).toEqual({ entries: [], semver: "patch" });
    expect(compare(other, site)).toEqual({ entries: [], semver: "patch" });
  });

  it("reports the token and the mixin that uses it when a local token's value changes", () => {
    const { site } = mkSite(2);
    const next = clone(site);
    next.styleTokens[0].value = "#abcdef";
    const expected = {
      entries: [
        ["updated", "patch", "global", "Mixin", "mixin", "mixin"],
        ["updated", "patch", "global", "Style token", "local", "local"],
      ],
      semver: "patch",
    };
    expect(compare(site, next)).toEqual(expected);
    expect(compare(next, site)).toEqual(expected);
  });

  it("reports the named tpls that use a dependency token whose value changes", () => {
    const { site } = mkSite(2);
    const next = clone(site);
    next.projectDependencies[0].site.styleTokens[0].value = "#fedcba";
    const expected = {
      entries: [
        ["updated", "patch", "comp", "Element", "box0", "box0"],
        ["updated", "patch", "comp", "Element", "box1", "box1"],
      ],
      semver: "patch",
    };
    expect(compare(site, next)).toEqual(expected);
    expect(compare(next, site)).toEqual(expected);
  });

  it("reports a style change on one tpl and keeps the others quiet", () => {
    const { site } = mkSite(3);
    const next = clone(site);
    const box = (next.components[0].tplTree as TplTag).children[1] as TplTag;
    box.vsettings[0].rs.values["margin"] = "8px";
    const expected = {
      entries: [["updated", "patch", "comp", "Element", "box1", "box1"]],
      semver: "patch",
    };
    expect(compare(site, next)).toEqual(expected);
    expect(compare(next, site)).toEqual(expected);
  });

  it("builds the same number of all-deps token dicts however many tpls it hashes", () => {
    const small = mkSite(2).site;
    const large = mkSite(12).site;
    const smallWalks = allDepsWalks(() => compareSites(small, clone(small)));
    const largeWalks = allDepsWalks(() => compareSites(large, clone(large)));
    expect(largeWalks).toBe(smallWalks);
  });
});

describe("hashExpr", () => {
  it("hashes a StyleExpr with token refs to their resolved values", () => {
    const { site, local, depToken } = mkSite(0);
    const expr = new StyleExpr({
      uuid: "style-expr",
      styles: [
        new SelectorRuleSet({
          selector: ":hover",
          rs: new RuleSet({
            values: {
              color: mkTokenRef(local),
              "border-color": mkTokenRef(depToken),
              margin: "1px",
            },
            mixins: [],
            animations: null,
          }),
        }),
      ],
    });
    const ctx = {
      projectFlags: computedProjectFlags(site),
      component: null,
      inStudio: true,
    };
    const hashed = hashExpr(site, expr, ctx);
    expect(hashed).toContain("style-expr-:hover-");
    expect(hashed).toContain("#020202");
    expect(hashed).toContain("#010101");
    expect(hashed).not.toContain("var(--token-");
    expect(hashed).toBe(
      "style-expr-:hover-\n    " +
        '[["border-color","#010101"],["color","#020202"],["margin","1px"]]' +
        "\n    \n  ",
    );
  });
});
