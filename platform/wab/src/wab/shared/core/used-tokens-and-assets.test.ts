import { mkStyleToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { ensureBaseVariant } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { componentToUsedImageAssets } from "@/wab/shared/cached-selectors";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { mkImageAsset, mkImageAssetRef } from "@/wab/shared/core/image-assets";
import * as projectDeps from "@/wab/shared/core/project-deps";
import { componentToUsedTokens } from "@/wab/shared/core/site-style-tokens";
import { createSite } from "@/wab/shared/core/sites";
import { TplTagType, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  Component,
  ImageAssetRef,
  ProjectDependency,
  Site,
  TplTag,
} from "@/wab/shared/model/classes";
import {
  assertSiteInvariants,
  genSiteErrors,
} from "@/wab/shared/site-invariants";

function mkSite() {
  const depSite = createSite();
  const depBase = mkStyleToken({
    name: "depBase",
    type: "Color",
    value: "#111111",
  });
  // alias in a dependency: depAlias -> depBase
  const depAlias = mkStyleToken({
    name: "depAlias",
    type: "Color",
    value: mkTokenRef(depBase),
  });
  depSite.styleTokens.push(depBase, depAlias);
  const depAsset = mkImageAsset({
    name: "depAsset",
    type: ImageAssetType.Picture,
  });
  depSite.imageAssets.push(depAsset);

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
  // chain: tokC -> tokB -> tokA, and tokD -> depAlias -> depBase
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
  const tokD = mkStyleToken({
    name: "tokD",
    type: "Color",
    value: mkTokenRef(depAlias),
  });
  site.styleTokens.push(tokA, tokB, tokC, tokD);
  const asset = mkImageAsset({ name: "asset", type: ImageAssetType.Picture });
  site.imageAssets.push(asset);
  return {
    site,
    tokens: { tokA, tokB, tokC, tokD, depBase, depAlias },
    asset,
    depAsset,
  };
}

/** Adds a component whose children have the given `background`/`color` values. */
function addComponent(
  site: Site,
  name: string,
  childValues: Array<Record<string, string>>,
): Component & { children: TplTag[] } {
  const root = mkTplTagX("div", { name: `${name}Root` });
  const component = mkComponent({
    name,
    tplTree: root,
    type: ComponentType.Plain,
  });
  site.components.push(component);
  ensureBaseVariantSetting(component, root);
  const children = childValues.map((values, i) => {
    const child = mkTplTagX("div", { name: `${name}Child${i}` });
    root.children.push(child);
    child.parent = root;
    Object.assign(ensureBaseVariantSetting(component, child).rs.values, values);
    return child;
  });
  return Object.assign(component, { children });
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

const names = (xs: ReadonlyArray<{ name: string }>) => xs.map((x) => x.name);

describe("used style tokens", () => {
  it("lists the base token, then its alias chain, per rule set value", () => {
    const { site, tokens } = mkSite();
    const comp = addComponent(site, "c", [
      { color: mkTokenRef(tokens.tokC) },
      { "border-color": `1px solid ${mkTokenRef(tokens.tokD)}` },
      { background: mkTokenRef(tokens.depAlias) },
    ]);
    expect(names(componentToUsedTokens(site, comp))).toEqual([
      "tokC",
      "tokB",
      "tokA",
      "tokD",
      "depAlias",
      "depBase",
    ]);
    const used = componentToUsedTokens(site, comp);
    expect(used[0]).toBe(tokens.tokC);
    expect(used[5]).toBe(tokens.depBase);
  });

  it("keeps first-use order across rule sets and dedupes", () => {
    const { site, tokens } = mkSite();
    const comp = addComponent(site, "c", [
      { color: mkTokenRef(tokens.tokA) },
      { color: mkTokenRef(tokens.tokC) },
      { color: mkTokenRef(tokens.tokA) },
    ]);
    expect(names(componentToUsedTokens(site, comp))).toEqual([
      "tokA",
      "tokC",
      "tokB",
    ]);
  });

  it("ignores refs to ids that are not tokens", () => {
    const { site } = mkSite();
    const comp = addComponent(site, "c", [
      { color: "var(--token-doesNotExist)" },
      { color: "red" },
    ]);
    expect(componentToUsedTokens(site, comp)).toEqual([]);
  });

  it("builds the all-deps token dict once per rule set with a ref, and not otherwise", () => {
    const { site, tokens } = mkSite();
    const noRefs = addComponent(site, "noRefs", [
      { color: "red" },
      { opacity: "0.5" },
    ]);
    const manyRefs = addComponent(site, "manyRefs", [
      { color: mkTokenRef(tokens.tokC) },
      { "border-color": mkTokenRef(tokens.tokD) },
      { background: mkTokenRef(tokens.depAlias) },
    ]);
    expect(allDepsWalks(() => componentToUsedTokens(site, noRefs))).toBe(0);
    expect(allDepsWalks(() => componentToUsedTokens(site, manyRefs))).toBe(
      manyRefs.children.length,
    );
  });
});

describe("used image assets", () => {
  it("lists assets referenced from backgrounds, in order, and skips unknown ids", () => {
    const { site, asset, depAsset } = mkSite();
    const comp = addComponent(site, "c", [
      { background: `url(x), ${mkImageAssetRef(depAsset)}` },
      { background: mkImageAssetRef(asset) },
      { background: "var(--image-doesNotExist)" },
      { background: mkImageAssetRef(depAsset) },
    ]);
    const used = componentToUsedImageAssets(site, comp);
    expect(names(used)).toEqual(["depAsset", "asset"]);
    expect(used[0]).toBe(depAsset);
    expect(used[1]).toBe(asset);
  });

  it("builds the all-deps asset dict once per tpl with a ref, and not otherwise", () => {
    const { site, asset } = mkSite();
    const noRefs = addComponent(site, "noRefs", [
      { color: "red" },
      { background: "none" },
    ]);
    const refs = addComponent(site, "refs", [
      { background: mkImageAssetRef(asset) },
      { background: mkImageAssetRef(asset) },
    ]);
    expect(allDepsWalks(() => componentToUsedImageAssets(site, noRefs))).toBe(
      0,
    );
    expect(allDepsWalks(() => componentToUsedImageAssets(site, refs))).toBe(
      refs.children.length,
    );
  });
});

describe("site invariants over tokens and assets", () => {
  const usageErrors = (site: Site) =>
    Array.from(genSiteErrors(site))
      .map((e) => e.message)
      .filter((m) => m.includes("references an invalid"));

  it("reports no usage errors when every ref resolves", () => {
    const { site, tokens, asset } = mkSite();
    addComponent(site, "c", [
      { color: mkTokenRef(tokens.tokC), background: mkImageAssetRef(asset) },
    ]);
    expect(usageErrors(site)).toEqual([]);
  });

  it("reports an asset that a picture tpl uses but the site no longer has", () => {
    const { site, asset } = mkSite();
    const comp = addComponent(site, "c", []);
    const pic = mkTplTagX("img", {
      name: "pic",
      type: TplTagType.Image,
      baseVariant: ensureBaseVariant(comp),
      attrs: { src: new ImageAssetRef({ asset }) },
    });
    (comp.tplTree as TplTag).children.push(pic);
    pic.parent = comp.tplTree as TplTag;
    ensureBaseVariantSetting(comp, pic);
    expect(usageErrors(site)).toEqual([]);
    site.imageAssets.splice(site.imageAssets.indexOf(asset), 1);
    const message =
      "Cannot save project - Component c references an invalid asset asset";
    expect(usageErrors(site)).toEqual([message]);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => assertSiteInvariants(site)).toThrow(message);
    } finally {
      spy.mockRestore();
    }
  });

  it("throws the first error from assertSiteInvariants", () => {
    const { site } = mkSite();
    addComponent(site, "c", [{ color: "var(--token-constructor)" }]);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => assertSiteInvariants(site)).toThrow(TypeError);
    } finally {
      spy.mockRestore();
    }
  });
});
