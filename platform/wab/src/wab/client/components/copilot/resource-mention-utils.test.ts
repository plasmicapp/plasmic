import {
  findMissingMentions,
  getMentionUiId,
  getResourceMatchScore,
  mkMentionRaw,
  mkMentionableResources,
  parseMention,
  type MentionableResource,
} from "@/wab/client/components/copilot/resource-mention-utils";
import {
  mkModelUiId,
  mkTplUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { FREE_CONTAINER_LOWER } from "@/wab/shared/Labels";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  VariantGroupType,
  mkGlobalVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";
import { ensure, mkShortId } from "@/wab/shared/common";
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
  opts: { projectDependencies?: ProjectDependency[] } = {}
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

describe("parseMention", () => {
  it("parses a mention that carries no uuid", () => {
    expect(parseMention("@<component:Comp>")).toEqual({
      kind: "component",
      uuid: undefined,
      label: "Comp",
    });
  });

  it("parses a mention that carries a uuid", () => {
    expect(parseMention("@<component:c1|Comp>")).toEqual({
      kind: "component",
      uuid: "c1",
      label: "Comp",
    });
  });

  it("parses a tpl mention with a composite uuid", () => {
    expect(parseMention("@<tpl:comp1/tpl1|Header>")).toEqual({
      kind: "tpl",
      uuid: "comp1/tpl1",
      label: "Header",
    });
  });

  it("returns undefined for non-mention text", () => {
    expect(parseMention("just text")).toBeUndefined();
  });

  it("returns undefined for an unrecognized kind", () => {
    expect(parseMention("@<widget:Comp>")).toBeUndefined();
  });
});

describe("mkMentionRaw", () => {
  it("stores the uuid, so a later rename can't break the mention", () => {
    expect(mkMentionRaw({ kind: "token", uuid: "t1", name: "primary" })).toBe(
      "token:t1|primary"
    );
  });

  it("escapes the grammar's delimiters in the label", () => {
    // `/` is not a delimiter of this grammar, so it stays readable.
    expect(mkMentionRaw({ kind: "token", uuid: "t1", name: "a|b>c/d%e" })).toBe(
      "token:t1|a%7Cb%3Ec/d%25e"
    );
  });

  it("scopes a tpl uuid by its component", () => {
    expect(
      mkMentionRaw({
        kind: "tpl",
        uuid: "tpl1",
        componentUuid: "comp1",
        tplType: "text",
        name: "Title",
      })
    ).toBe("tpl:comp1/tpl1|Title");
  });

  it("scopes a component variant uuid by its component", () => {
    expect(
      mkMentionRaw({
        kind: "componentVariant",
        uuid: "v1",
        componentUuid: "comp1",
        name: "Large",
      })
    ).toBe("componentVariant:comp1/v1|Large");
  });

  it("round-trips through parseMention", () => {
    const raw = mkMentionRaw({
      kind: "token",
      uuid: "t1",
      name: "brand/primary | dark",
    });
    expect(parseMention(`@<${raw}>`)).toEqual({
      kind: "token",
      uuid: "t1",
      label: "brand/primary | dark",
    });
  });
});

describe("findMissingMentions", () => {
  let site: ReturnType<typeof mkTestSite>["site"];
  let component: ReturnType<typeof mkTestSite>["component"];
  let tpl: ReturnType<typeof mkTestSite>["tpl"];
  let token: ReturnType<typeof mkTestSite>["token"];
  beforeEach(() => {
    ({ site, component, tpl, token } = mkTestSite());
  });

  it("returns nothing when every mention still resolves", () => {
    // Covers both uuid shapes: plain, and scoped by the owning component.
    const text =
      `use @<token:${token.uuid}|primary> in ` +
      `@<component:${component.uuid}|Card> and tweak ` +
      `@<tpl:${component.uuid}/${tpl.uuid}|MyElement>`;
    expect(findMissingMentions(text, site)).toEqual([]);
  });

  it("returns the label of every mention whose resource is gone", () => {
    const text =
      // token is gone
      `use @<token:deleted|primary>, ` +
      // tpl is gone
      `tweak @<tpl:${component.uuid}/gone|MissingElement> ` +
      // component is gone
      `and @<tpl:gone/${tpl.uuid}|OrphanElement>`;
    expect(findMissingMentions(text, site)).toEqual([
      "primary",
      "MissingElement",
      "OrphanElement",
    ]);
  });

  it("flags a hand-typed mention that carries no uuid", () => {
    expect(findMissingMentions("use @<token:primary>", site)).toEqual([
      "primary",
    ]);
  });

  it("accepts a mention of a directly imported project's resource", () => {
    const { site: s, imported } = mkTestSite();
    const text = `restyle @<component:${imported.component.uuid}|ImportedCard> with @<token:${imported.token.uuid}|Imported-primary>`;
    expect(findMissingMentions(text, s)).toEqual([]);
  });

  it("flags a mention of a transitively imported resource", () => {
    const { site: s, transitive } = mkTestSite();
    expect(
      findMissingMentions(
        `use @<token:${transitive.token.uuid}|Transitive-primary>`,
        s
      )
    ).toEqual(["Transitive-primary"]);
  });

  it("ignores text that looks like a mention of an unknown kind", () => {
    expect(findMissingMentions("use @<widget:Thing>", site)).toEqual([]);
  });

  it("returns empty for text without mentions", () => {
    expect(findMissingMentions("no mentions here", site)).toEqual([]);
  });
});

describe("getMentionUiId", () => {
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

  it("returns a Model UiId for a component", () => {
    expect(getMentionUiId("component", component.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Component", uuid: component.uuid })
    );
  });

  it("returns a Model UiId for a page", () => {
    expect(getMentionUiId("page", page.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Component", uuid: page.uuid })
    );
  });

  it("returns a Model UiId for a token", () => {
    expect(getMentionUiId("token", token.uuid, site)).toBe(
      mkModelUiId({ typeTag: "StyleToken", uuid: token.uuid })
    );
  });

  it("returns a Model UiId for a global variant", () => {
    expect(getMentionUiId("globalVariant", variant.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Variant", uuid: variant.uuid })
    );
  });

  it("returns a Model UiId for an animation", () => {
    expect(getMentionUiId("animation", animation.uuid, site)).toBe(
      mkModelUiId({ typeTag: "AnimationSequence", uuid: animation.uuid })
    );
  });

  it("returns a Model UiId for a component variant", () => {
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
      getMentionUiId("componentVariant", `${comp.uuid}/${cv.uuid}`, s)
    ).toBe(mkModelUiId({ typeTag: "Variant", uuid: cv.uuid }));
  });

  it("returns a Tpl UiId for a tpl (composite uuid)", () => {
    expect(getMentionUiId("tpl", `${component.uuid}/${tpl.uuid}`, site)).toBe(
      mkTplUiId(component.uuid, tpl.uuid)
    );
  });

  it("returns undefined when the resource no longer exists", () => {
    expect(getMentionUiId("component", "nope", site)).toBeUndefined();
    expect(
      getMentionUiId("tpl", `${component.uuid}/nope`, site)
    ).toBeUndefined();
  });

  it("resolves a directly imported animation", () => {
    expect(getMentionUiId("animation", imported.animation.uuid, site)).toBe(
      mkModelUiId({
        typeTag: "AnimationSequence",
        uuid: imported.animation.uuid,
      })
    );
  });

  it("resolves a directly imported global variant", () => {
    expect(getMentionUiId("globalVariant", imported.variant.uuid, site)).toBe(
      mkModelUiId({ typeTag: "Variant", uuid: imported.variant.uuid })
    );
  });

  it("does not resolve a transitively imported resource", () => {
    // Mentions stop at direct deps, matching what the `read` tool can fetch.
    expect(
      getMentionUiId("component", transitive.component.uuid, site)
    ).toBeUndefined();
    expect(
      getMentionUiId("token", transitive.token.uuid, site)
    ).toBeUndefined();
    expect(
      getMentionUiId("animation", transitive.animation.uuid, site)
    ).toBeUndefined();
    expect(
      getMentionUiId("globalVariant", transitive.variant.uuid, site)
    ).toBeUndefined();
  });
});

const fixture = mkTestSite();
const depName = (dep: ProjectDependency) => `${dep.name} (nice)`;
const mkResources = (
  fx: ReturnType<typeof mkTestSite>,
  focusedComponent?: Component,
  selectedTpls: TplNode[] = []
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
      { kind: "component", uuid: component.uuid, name: "Card" },
      { kind: "page", uuid: page.uuid, name: "HomePage" },
      { kind: "token", uuid: token.uuid, name: "primary" },
      { kind: "token", uuid: registeredToken.uuid, name: "registered" },
      {
        kind: "globalVariant",
        uuid: variant.uuid,
        name: "Dark",
        detail: "Theme",
      },
      {
        kind: "globalVariant",
        uuid: screenVariant.uuid,
        name: "Mobile",
        detail: "Screen",
      },
      { kind: "animation", uuid: animation.uuid, name: "FadeIn" },
      // An imported project contributes no pages, code components, registered
      // tokens or screen variants
      {
        kind: "component",
        uuid: imported.component.uuid,
        name: "ImportedCard",
        fromProject,
      },
      {
        kind: "token",
        uuid: imported.token.uuid,
        name: "Imported-primary",
        fromProject,
      },
      {
        kind: "globalVariant",
        uuid: imported.variant.uuid,
        name: "ImportedDark",
        detail: "ImportedTheme",
        fromProject,
      },
      {
        kind: "animation",
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
      expect.objectContaining({ uuid: own.imported.registeredToken.uuid })
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
      kind: "globalVariant",
      uuid: own.imported.screenVariant.uuid,
      name: "ImportedTablet",
      detail: "Screen",
    });
    // The site's own screen variant group is no longer the active one
    expect(resources).not.toContainEqual(
      expect.objectContaining({ uuid: own.screenVariant.uuid })
    );
  });

  it("puts local resources ahead of imported ones, so ties favour local", () => {
    const { searchable } = mkResources(fixture);
    const firstImported = searchable.findIndex((r) => r.fromProject);
    expect(firstImported).toBeGreaterThan(0);
    // Nothing local appears after the imports begin.
    expect(searchable.slice(firstImported).every((r) => r.fromProject)).toBe(
      true
    );
  });

  it("mentions direct dependencies only, matching what `read` can fetch", () => {
    const { searchable } = mkResources(fixture);
    expect(
      searchable.some((r) => r.uuid === fixture.imported.component.uuid)
    ).toBe(true);
    // The transitive dep is reachable from the imported one, but out of scope.
    expect(
      searchable.some((r) => r.uuid === fixture.transitive.component.uuid)
    ).toBe(false);
  });

  it("adds the open component's named elements and its variants", () => {
    const { searchable } = mkResources(fixture, fixture.component, [
      fixture.tpl,
    ]);
    expect(searchable).toContainEqual(
      expect.objectContaining({ kind: "tpl", uuid: fixture.tpl.uuid })
    );
    expect(searchable).toContainEqual({
      kind: "componentVariant",
      uuid: fixture.componentVariant.uuid,
      componentUuid: fixture.component.uuid,
      name: "Large",
      detail: "Size",
    });
    // An unnamed element is not searchable, so it is left out of `searchable`.
    expect(searchable).not.toContainEqual(
      expect.objectContaining({ uuid: fixture.unnamedTpl.uuid })
    );
  });

  it("leaves out component-scoped resources when nothing is open", () => {
    const { searchable } = mkResources(fixture);
    expect(searchable.some((r) => r.kind === "tpl")).toBe(false);
    expect(searchable.some((r) => r.kind === "componentVariant")).toBe(false);
  });
});

const selectionOf = (
  fx: ReturnType<typeof mkTestSite>,
  focusedComponent?: Component,
  selectedTpls: TplNode[] = []
) => mkResources(fx, focusedComponent, selectedTpls).selection;

describe("mkMentionableResources: the canvas selection", () => {
  it("reports the open component and the element selected in it", () => {
    expect(selectionOf(fixture, fixture.component, [fixture.tpl])).toEqual({
      component: {
        kind: "component",
        uuid: fixture.component.uuid,
        name: "Card",
      },
      elements: [
        {
          kind: "tpl",
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
      "a component is open"
    );
    expect(elements[0].name).toBe(`(unnamed ${FREE_CONTAINER_LOWER})`);
  });

  it("reports a page as a page", () => {
    expect(selectionOf(fixture, fixture.page)).toEqual({
      component: { kind: "page", uuid: fixture.page.uuid, name: "HomePage" },
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
      "a component is open"
    );
    expect(elements.map((el) => el.uuid)).toEqual([
      fixture.tpl.uuid,
      fixture.unnamedTpl.uuid,
    ]);
  });

  it("mentions the selected element as the resource it resolves to", () => {
    const { elements } = ensure(
      selectionOf(fixture, fixture.component, [fixture.unnamedTpl]),
      "a component is open"
    );
    const content = mkMentionRaw(elements[0]);
    expect(findMissingMentions(`tweak @<${content}>`, fixture.site)).toEqual(
      []
    );
    const { kind, uuid } = ensure(
      parseMention(`@<${content}>`),
      "must parse back"
    );
    expect(
      getMentionUiId(kind, ensure(uuid, "must carry a uuid"), fixture.site)
    ).toBe(`Tpl:${fixture.component.uuid}/${fixture.unnamedTpl.uuid}`);
  });
});

describe("getResourceMatchScore", () => {
  const token: MentionableResource = {
    kind: "token",
    uuid: "t1",
    name: "primary",
    detail: "Colors",
  };

  it("matches by name, detail and kind", () => {
    expect(getResourceMatchScore(token, "prim")).toBeDefined();
    expect(getResourceMatchScore(token, "Colors")).toBeDefined();
    expect(getResourceMatchScore(token, "token")).toBeDefined();
    expect(getResourceMatchScore(token, "nope")).toBeUndefined();
  });

  it("ranks a prefix match above a substring match", () => {
    const other: MentionableResource = {
      kind: "token",
      uuid: "t2",
      name: "the-primary",
    };
    expect(
      ensure(getResourceMatchScore(token, "prim"), "matches")
    ).toBeGreaterThan(
      ensure(getResourceMatchScore(other, "prim"), "also matches")
    );
  });

  it("matches an imported resource by the project it came from", () => {
    expect(
      getResourceMatchScore(
        { ...token, fromProject: "Design system" },
        "Design"
      )
    ).toBeDefined();
  });

  it("scores everything on a bare `@`, leaving the choice to the caller", () => {
    // Which rows a bare `@` offers is decided by which set is handed to the
    // dropdown, not by scoring.
    expect(getResourceMatchScore(token, "")).toBeDefined();
  });
});
