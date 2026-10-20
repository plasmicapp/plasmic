import {
  getResourceMatchScore,
  mkMentionableResources,
  mkResourceMentionRaw,
  type MentionableResource,
} from "@/wab/client/components/copilot/resource-mention-utils";
import { parseMention } from "@/wab/client/components/mentions/mention-parse";
import {
  ComponentScopedTag,
  SiteScopedTag,
  mkComponentScopedUiId,
  mkModelUiId,
  mkSiteScopedUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { resolveResource } from "@/wab/client/studio-ctx/ui/studio-ui-resources";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { FREE_CONTAINER_LOWER } from "@/wab/shared/Labels";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  VariantGroupType,
  mkGlobalVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";
import { assert, ensure, mkShortId } from "@/wab/shared/common";
import {
  ComponentType,
  mkComponent,
  mkPageMeta,
} from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite, writeable } from "@/wab/shared/core/sites";
import { deepTrackComponents, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  AnimationSequence,
  CodeComponentMeta,
  Component,
  HostLessPackageInfo,
  ProjectDependency,
  TplNode,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { runInAction } from "mobx";

function mkTestSite() {
  const site = createSite();
  const unnamedTpl = mkTplTagX("div");
  const tpl = mkTplTagX("div", { name: "MyElement" }, unnamedTpl);
  const component = mkComponent({
    name: "Card",
    type: ComponentType.Plain,
    tplTree: tpl,
  });
  const page = mkComponent({
    name: "HomePage",
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
    pageMeta: mkPageMeta({ path: "/home" }),
  });
  const token = mkStyleToken({
    name: "primary",
    type: "Color",
    value: "#1500FF",
  });
  const registeredToken = mkStyleToken({
    name: "registered",
    type: "Color",
    value: "#00FFFF",
  });
  registeredToken.isRegistered = true;
  const codeComponent = mkComponent({
    name: "Widget",
    type: ComponentType.Code,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: {} as CodeComponentMeta,
  });
  const screenGroup = site.globalVariantGroups[0];
  const screenVariant = mkVariant({ name: "Mobile", parent: screenGroup });
  const variant = mkVariant({ name: "Dark" });
  const variantGroup = mkGlobalVariantGroup({
    param: mkParam({
      name: "Theme",
      paramType: "globalVariantGroup",
      type: typeFactory.text(),
    }),
    variants: [variant],
    type: VariantGroupType.GlobalUserDefined,
  });
  const animation = new AnimationSequence({
    uuid: mkShortId(),
    name: "FadeIn",
    keyframes: [],
  });
  const transitive = mkTestDep("Transitive");
  const imported = mkTestDep("Imported", {
    projectDependencies: [transitive.dep],
  });
  runInAction(() => {
    site.components.push(component, page, codeComponent);
    site.styleTokens.push(token, registeredToken);
    screenGroup.variants.push(screenVariant);
    site.globalVariantGroups.push(variantGroup);
    site.animationSequences.push(animation);
    site.projectDependencies.push(imported.dep);
  });
  // Registers the components in the maps `getOwnerSite` reads, which a site
  // built by hand misses; without it `getEffectiveVariantSetting` throws.
  deepTrackComponents(site);
  const tplMgr = new TplMgr({ site });
  const componentVariant = runInAction(() => {
    const group = tplMgr.createVariantGroup({ component, name: "Size" });
    return tplMgr.createVariant(component, group, "Large");
  });
  return {
    site,
    component,
    componentVariant,
    page,
    codeComponent,
    tpl,
    unnamedTpl,
    token,
    registeredToken,
    variant,
    screenVariant,
    animation,
    imported,
    transitive,
  };
}

/** A project dependency whose site holds one of each mentionable resource. */
function mkTestDep(
  name: string,
  opts: { projectDependencies?: ProjectDependency[] } = {},
) {
  const site = createSite(opts);
  const tpl = mkTplTagX("div", { name: `${name}Element` });
  const component = mkComponent({
    name: `${name}Card`,
    type: ComponentType.Plain,
    tplTree: tpl,
  });
  const page = mkComponent({
    name: `${name}Page`,
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
    pageMeta: mkPageMeta({ path: `/${name.toLowerCase()}` }),
  });
  const codeComponent = mkComponent({
    name: `${name}Widget`,
    type: ComponentType.Code,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: {} as CodeComponentMeta,
  });
  const token = mkStyleToken({
    name: `${name}-primary`,
    type: "Color",
    value: "#00FF00",
  });
  const registeredToken = mkStyleToken({
    name: `${name}-registered`,
    type: "Color",
    value: "#0000FF",
  });
  registeredToken.isRegistered = true;
  const animation = new AnimationSequence({
    uuid: mkShortId(),
    name: `${name}Fade`,
    keyframes: [],
  });
  const variant = mkVariant({ name: `${name}Dark` });
  const variantGroup = mkGlobalVariantGroup({
    param: mkParam({
      name: `${name}Theme`,
      paramType: "globalVariantGroup",
      type: typeFactory.text(),
    }),
    variants: [variant],
    type: VariantGroupType.GlobalUserDefined,
  });
  // createSite() seeds a screen variant group; give it a breakpoint of its own.
  const screenVariant = mkVariant({
    name: `${name}Tablet`,
    parent: site.globalVariantGroups[0],
  });
  runInAction(() => {
    site.components.push(component, page, codeComponent);
    site.styleTokens.push(token, registeredToken);
    site.animationSequences.push(animation);
    site.globalVariantGroups.push(variantGroup);
    site.globalVariantGroups[0].variants.push(screenVariant);
  });
  const dep = new ProjectDependency({
    name: `${name} project`,
    pkgId: `${name}-pkg-id`,
    projectId: `${name}-project-id`,
    version: "0.0.1",
    uuid: `${name}-uuid`,
    site,
  });
  return {
    dep,
    site,
    component,
    page,
    codeComponent,
    tpl,
    token,
    registeredToken,
    animation,
    variant,
    screenVariant,
  };
}

describe("mkResourceMentionRaw", () => {
  it("keeps only the tag and uuid", () => {
    expect(
      mkResourceMentionRaw({ tag: "StyleToken", uuid: "t1", name: "primary" }),
    ).toBe("StyleToken:t1");
  });

  it("scopes a tpl uuid by its component", () => {
    expect(
      mkResourceMentionRaw({
        tag: "Tpl",
        uuid: "tpl1",
        componentUuid: "comp1",
        tplType: "text",
        name: "Title",
      }),
    ).toBe("Tpl:comp1/tpl1");
  });

  it("scopes a component variant to its owner", () => {
    expect(
      mkResourceMentionRaw({
        tag: "Variant",
        uuid: "v1",
        componentUuid: "comp1",
        name: "Large",
      }),
    ).toBe("Variant:comp1/v1");
  });
});

describe("resolveResource", () => {
  const {
    site,
    component,
    page,
    tpl,
    token,
    variant,
    animation,
    imported,
    transitive,
  } = mkTestSite();

  const siteScoped = (typeTag: SiteScopedTag, uuid: string) =>
    resolveResource(site, mkSiteScopedUiId({ typeTag, uuid }))?.resource;
  const componentScoped = (
    typeTag: ComponentScopedTag,
    componentUuid: string,
    uuid: string,
  ) =>
    resolveResource(
      site,
      mkComponentScopedUiId({ typeTag, uuid }, componentUuid),
    )?.resource;

  it("resolves a component", () => {
    expect(siteScoped("Component", component.uuid)).toBe(component);
  });

  it("resolves a page", () => {
    expect(siteScoped("Component", page.uuid)).toBe(page);
  });

  it("resolves a token", () => {
    expect(siteScoped("StyleToken", token.uuid)).toBe(token);
  });

  it("resolves a global variant", () => {
    expect(siteScoped("GlobalVariant", variant.uuid)).toBe(variant);
  });

  it("resolves an animation", () => {
    expect(siteScoped("AnimationSequence", animation.uuid)).toBe(animation);
  });

  it("resolves a component variant through its owner", () => {
    const { site: s, component: comp } = mkTestSite();
    const tplMgr = new TplMgr({ site: s });
    const cv = runInAction(() => {
      const group = tplMgr.createVariantGroup({
        component: comp,
        name: "Size",
      });
      return tplMgr.createVariant(comp, group, "Large");
    });
    expect(
      resolveResource(
        s,
        mkComponentScopedUiId({ typeTag: "Variant", uuid: cv.uuid }, comp.uuid),
      )?.resource,
    ).toBe(cv);
  });

  it("does not resolve a component variant against the wrong owner", () => {
    expect(componentScoped("Variant", page.uuid, variant.uuid)).toBeUndefined();
  });

  it("resolves a tpl through its owner", () => {
    expect(componentScoped("Tpl", component.uuid, tpl.uuid)).toBe(tpl);
  });

  it("returns undefined when the resource no longer exists", () => {
    expect(siteScoped("Component", "nope")).toBeUndefined();
    expect(componentScoped("Tpl", component.uuid, "nope")).toBeUndefined();
    expect(componentScoped("Tpl", "nope", tpl.uuid)).toBeUndefined();
  });

  it("resolves a directly imported animation", () => {
    expect(siteScoped("AnimationSequence", imported.animation.uuid)).toBe(
      imported.animation,
    );
  });

  it("resolves a directly imported global variant", () => {
    expect(siteScoped("GlobalVariant", imported.variant.uuid)).toBe(
      imported.variant,
    );
  });

  it("does not resolve a transitively imported resource", () => {
    // Mentions stop at direct deps, matching what the `read` tool can fetch.
    expect(siteScoped("Component", transitive.component.uuid)).toBeUndefined();
    expect(siteScoped("StyleToken", transitive.token.uuid)).toBeUndefined();
    expect(
      siteScoped("AnimationSequence", transitive.animation.uuid),
    ).toBeUndefined();
    expect(
      siteScoped("GlobalVariant", transitive.variant.uuid),
    ).toBeUndefined();
  });
});

const fixture = mkTestSite();
const depName = (dep: ProjectDependency) => `${dep.name} (nice)`;
const mkResources = (
  fx: ReturnType<typeof mkTestSite>,
  focusedComponent?: Component,
  selectedTpls: TplNode[] = [],
) =>
  mkMentionableResources({
    site: fx.site,
    focusedComponent,
    selectedTpls,
    getDepName: depName,
  });
/** What an imported project contributed to the searchable list. */
const importedResources = (fx: ReturnType<typeof mkTestSite>) =>
  mkResources(fx).searchable.filter((resource) => resource.fromProject);

describe("mkMentionableResources", () => {
  it("lists the project's own resources, then its direct dependencies'", () => {
    const {
      component,
      page,
      token,
      registeredToken,
      variant,
      screenVariant,
      animation,
      imported,
    } = fixture;
    const fromProject = depName(imported.dep);
    // Exact, so a resource that should have been dropped fails here even if it
    // leaked in unstamped — a page carries no `fromProject` to filter on.
    expect(mkResources(fixture).searchable).toEqual([
      { tag: "Component", isPage: false, uuid: component.uuid, name: "Card" },
      { tag: "Component", isPage: true, uuid: page.uuid, name: "HomePage" },
      { tag: "StyleToken", uuid: token.uuid, name: "primary" },
      { tag: "StyleToken", uuid: registeredToken.uuid, name: "registered" },
      {
        tag: "GlobalVariant",
        uuid: variant.uuid,
        name: "Dark",
        detail: "Theme",
      },
      {
        tag: "GlobalVariant",
        uuid: screenVariant.uuid,
        name: "Mobile",
        detail: "Screen",
      },
      { tag: "AnimationSequence", uuid: animation.uuid, name: "FadeIn" },
      // An imported project contributes no pages, code components, registered
      // tokens or screen variants
      {
        tag: "Component",
        isPage: false,
        uuid: imported.component.uuid,
        name: "ImportedCard",
        fromProject,
      },
      {
        tag: "StyleToken",
        uuid: imported.token.uuid,
        name: "Imported-primary",
        fromProject,
      },
      {
        tag: "GlobalVariant",
        uuid: imported.variant.uuid,
        name: "ImportedDark",
        detail: "ImportedTheme",
        fromProject,
      },
      {
        tag: "AnimationSequence",
        uuid: imported.animation.uuid,
        name: "ImportedFade",
        fromProject,
      },
    ]);
  });

  it("keeps the registered tokens of a hostless package, which the tokens panel lists", () => {
    const own = mkTestSite();
    runInAction(() => {
      writeable(own.imported.site).hostLessPackageInfo =
        new HostLessPackageInfo({
          name: "plasmic-rich-components",
          npmPkg: [],
          cssImport: [],
          deps: [],
          registerCalls: [],
          minimumReactVersion: null,
        });
    });

    expect(importedResources(own)).toContainEqual(
      expect.objectContaining({ uuid: own.imported.registeredToken.uuid }),
    );
  });

  it("takes the breakpoints from the active screen variant group, even when an imported project owns it", () => {
    const own = mkTestSite();
    runInAction(() => {
      own.site.activeScreenVariantGroup =
        own.imported.site.globalVariantGroups[0];
    });

    const resources = mkResources(own).searchable;
    expect(resources).toContainEqual({
      tag: "GlobalVariant",
      uuid: own.imported.screenVariant.uuid,
      name: "ImportedTablet",
      detail: "Screen",
    });
    // The site's own screen variant group is no longer the active one
    expect(resources).not.toContainEqual(
      expect.objectContaining({ uuid: own.screenVariant.uuid }),
    );
  });

  it("puts local resources ahead of imported ones, so ties favour local", () => {
    const { searchable } = mkResources(fixture);
    const firstImported = searchable.findIndex((r) => r.fromProject);
    expect(firstImported).toBeGreaterThan(0);
    // Nothing local appears after the imports begin.
    expect(searchable.slice(firstImported).every((r) => r.fromProject)).toBe(
      true,
    );
  });

  it("mentions direct dependencies only, matching what `read` can fetch", () => {
    const { searchable } = mkResources(fixture);
    expect(
      searchable.some((r) => r.uuid === fixture.imported.component.uuid),
    ).toBe(true);
    // The transitive dep is reachable from the imported one, but out of scope.
    expect(
      searchable.some((r) => r.uuid === fixture.transitive.component.uuid),
    ).toBe(false);
  });

  it("adds the open component's named elements and its variants", () => {
    const { searchable } = mkResources(fixture, fixture.component, [
      fixture.tpl,
    ]);
    expect(searchable).toContainEqual(
      expect.objectContaining({ tag: "Tpl", uuid: fixture.tpl.uuid }),
    );
    expect(searchable).toContainEqual({
      tag: "Variant",
      uuid: fixture.componentVariant.uuid,
      componentUuid: fixture.component.uuid,
      name: "Large",
      detail: "Size",
    });
    // An unnamed element is not searchable, so it is left out of `searchable`.
    expect(searchable).not.toContainEqual(
      expect.objectContaining({ uuid: fixture.unnamedTpl.uuid }),
    );
  });

  it("leaves out component-scoped resources when nothing is open", () => {
    const { searchable } = mkResources(fixture);
    expect(searchable.some((r) => r.tag === "Tpl")).toBe(false);
    expect(
      searchable.some((r) => r.uuid === fixture.componentVariant.uuid),
    ).toBe(false);
  });
});

const selectionOf = (
  fx: ReturnType<typeof mkTestSite>,
  focusedComponent?: Component,
  selectedTpls: TplNode[] = [],
) => mkResources(fx, focusedComponent, selectedTpls).selection;

describe("mkMentionableResources: the canvas selection", () => {
  it("reports the open component and the element selected in it", () => {
    expect(selectionOf(fixture, fixture.component, [fixture.tpl])).toEqual({
      component: {
        tag: "Component",
        isPage: false,
        uuid: fixture.component.uuid,
        name: "Card",
      },
      elements: [
        {
          tag: "Tpl",
          uuid: fixture.tpl.uuid,
          componentUuid: fixture.component.uuid,
          tplType: "freeContainer",
          name: "MyElement",
        },
      ],
    });
  });

  it("describes a selected element that has no name", () => {
    const { elements } = ensure(
      selectionOf(fixture, fixture.component, [fixture.unnamedTpl]),
      "a component is open",
    );
    expect(elements[0].name).toBe(`(unnamed ${FREE_CONTAINER_LOWER})`);
  });

  it("reports a page as a page", () => {
    expect(selectionOf(fixture, fixture.page)).toEqual({
      component: {
        tag: "Component",
        isPage: true,
        uuid: fixture.page.uuid,
        name: "HomePage",
      },
      elements: [],
    });
  });

  it("reports nothing when no component is open", () => {
    expect(selectionOf(fixture, undefined, [fixture.tpl])).toBeUndefined();
  });

  it("reports every selected element, in selection order", () => {
    const { elements } = ensure(
      selectionOf(fixture, fixture.component, [
        fixture.tpl,
        fixture.unnamedTpl,
      ]),
      "a component is open",
    );
    expect(elements.map((el) => el.uuid)).toEqual([
      fixture.tpl.uuid,
      fixture.unnamedTpl.uuid,
    ]);
  });

  it("mentions the selected element as the resource it resolves to", () => {
    const { elements } = ensure(
      selectionOf(fixture, fixture.component, [fixture.unnamedTpl]),
      "a component is open",
    );
    const content = mkResourceMentionRaw(elements[0]);
    const target = ensure(parseMention(content), "must parse back");
    assert(target.type !== "user", "a resource mention");
    const uiId = mkModelUiId(target);
    expect(uiId).toBe(
      `Model:Tpl:${fixture.component.uuid}/${fixture.unnamedTpl.uuid}`,
    );
    expect(resolveResource(fixture.site, uiId)?.resource).toBe(
      fixture.unnamedTpl,
    );
  });
});

describe("getResourceMatchScore", () => {
  const token: MentionableResource = {
    tag: "StyleToken",
    uuid: "t1",
    name: "primary",
    detail: "Colors",
  };

  it("matches by name, detail and tag", () => {
    expect(getResourceMatchScore(token, "prim")).toBeDefined();
    expect(getResourceMatchScore(token, "Colors")).toBeDefined();
    expect(getResourceMatchScore(token, "token")).toBeDefined();
    expect(getResourceMatchScore(token, "nope")).toBeUndefined();
  });

  it("ranks a prefix match above a substring match", () => {
    const other: MentionableResource = {
      tag: "StyleToken",
      uuid: "t2",
      name: "the-primary",
    };
    expect(
      ensure(getResourceMatchScore(token, "prim"), "matches"),
    ).toBeGreaterThan(
      ensure(getResourceMatchScore(other, "prim"), "also matches"),
    );
  });

  it("matches an imported resource by the project it came from", () => {
    expect(
      getResourceMatchScore(
        { ...token, fromProject: "Design system" },
        "Design",
      ),
    ).toBeDefined();
  });

  it("scores everything on a bare `@`, leaving the choice to the caller", () => {
    // Which rows a bare `@` offers is decided by which set is handed to the
    // dropdown, not by scoring.
    expect(getResourceMatchScore(token, "")).toBeDefined();
  });
});
