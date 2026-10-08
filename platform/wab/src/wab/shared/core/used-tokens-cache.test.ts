/**
 * @vi-environment jsdom
 */
import * as styleToken from "@/wab/commons/StyleToken";
import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { componentToUsedTokens } from "@/wab/shared/core/site-style-tokens";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { instUtil } from "@/wab/shared/model/InstUtil";
import { Site, StyleToken } from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";

function mkSite() {
  const site = createSite();
  const tokA = mkStyleToken({ name: "tokA", type: "Color", value: "#aaaaaa" });
  const tokB = mkStyleToken({
    name: "tokB",
    type: "Color",
    value: mkTokenRef(tokA),
  });
  const tokC = mkStyleToken({
    name: "tokC",
    type: "Color",
    value: mkTokenRef(tokB),
  });
  site.styleTokens.push(tokA, tokB, tokC);
  return { site, tokC };
}

/** Adds a component with one child that uses `token` as its color. */
function addComponent(site: Site, name: string, token: StyleToken) {
  const root = mkTplTagX("div", { name: `${name}Root` });
  const component = mkComponent({
    name,
    tplTree: root,
    type: ComponentType.Plain,
  });
  site.components.push(component);
  ensureBaseVariantSetting(component, root);
  const child = mkTplTagX("div", { name: `${name}Child` });
  root.children.push(child);
  child.parent = root;
  ensureBaseVariantSetting(component, child).rs.values["color"] =
    mkTokenRef(token);
  return component;
}

function observe(site: Site) {
  return new ChangeRecorder({
    inst: site,
    _instUtil: instUtil,
    excludeFields: [meta.getFieldByName("ProjectDependency", "site")],
    excludeClasses: [],
    isExternalRef: () => false,
    skipInitialObserveFields: [],
    incremental: true,
    quiet: true,
  } as any);
}

/** Counts the token ref lookups made while running `run`. */
function refLookups(run: () => void) {
  const spy = vi.spyOn(styleToken, "tryParseTokenRef");
  try {
    run();
    return spy.mock.calls.length;
  } finally {
    spy.mockRestore();
  }
}

/**
 * Two components use the same token. Reading the used tokens of the second one
 * should reuse the alias chain walk from the first one when the site is
 * observable, because Studio caches by arguments. A plain site caches nothing.
 */
function lookupsForFirstAndSecond(observable: boolean) {
  const { site, tokC } = mkSite();
  const first = addComponent(site, "first", tokC);
  const second = addComponent(site, "second", tokC);
  const recorder = observable ? observe(site) : undefined;
  try {
    let firstUsed: ReadonlyArray<StyleToken> = [];
    let secondUsed: ReadonlyArray<StyleToken> = [];
    const forFirst = refLookups(() => {
      firstUsed = componentToUsedTokens(site, first);
    });
    const forSecond = refLookups(() => {
      secondUsed = componentToUsedTokens(site, second);
    });
    return { forFirst, forSecond, firstUsed, secondUsed };
  } finally {
    recorder?.dispose();
  }
}

describe("alias chain walk in used tokens", () => {
  it("is cached by arguments on an observable site", () => {
    const { forFirst, forSecond, firstUsed, secondUsed } =
      lookupsForFirstAndSecond(true);
    expect(firstUsed.map((t) => t.name)).toEqual(["tokC", "tokB", "tokA"]);
    expect(secondUsed.map((t) => t.name)).toEqual(["tokC", "tokB", "tokA"]);
    expect(forSecond).toBeLessThan(forFirst);
  });

  it("is not cached on a plain site, and gives the same tokens", () => {
    const { forFirst, forSecond, firstUsed, secondUsed } =
      lookupsForFirstAndSecond(false);
    expect(secondUsed.map((t) => t.name)).toEqual(firstUsed.map((t) => t.name));
    expect(forSecond).toBe(forFirst);
  });
});
