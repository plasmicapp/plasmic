import {
  findMissingMentions,
  getMentionUiId,
  mkMentionRaw,
  mkSiteMentionableResources,
  parseMention,
} from "@/wab/client/components/copilot/resource-mention-utils";
import {
  mkModelUiId,
  mkTplUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  VariantGroupType,
  mkGlobalVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";
import { mkShortId } from "@/wab/shared/common";
import {
  ComponentType,
  mkComponent,
  mkPageMeta,
} from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite, writeable } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  AnimationSequence,
  CodeComponentMeta,
  HostLessPackageInfo,
  ProjectDependency,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { runInAction } from "mobx";

function mkTestSite() {
  const site = createSite();
  const tpl = mkTplTagX("div", { name: "MyElement" });
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
  return {
    site,
    component,
    page,
    codeComponent,
    tpl,
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
  it("parses an unresolved mention", () => {
    expect(parseMention("@<component:Comp>")).toEqual({
      kind: "component",
      uuid: undefined,
      label: "Comp",
    });
  });

  it("parses a resolved mention", () => {
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
    expect(mkMentionRaw({ kind: "token", uuid: "t1", label: "primary" })).toBe(
      "token:t1|primary"
    );
  });

  it("escapes the grammar's delimiters in the label", () => {
    // `/` is not a delimiter of this grammar, so it stays readable.
    expect(
      mkMentionRaw({ kind: "token", uuid: "t1", label: "a|b>c/d%e" })
    ).toBe("token:t1|a%7Cb%3Ec/d%25e");
  });

  it("scopes a tpl uuid by its component", () => {
    expect(
      mkMentionRaw({
        kind: "tpl",
        uuid: "tpl1",
        componentUuid: "comp1",
        tplType: "text",
        label: "Title",
      })
    ).toBe("tpl:comp1/tpl1|Title");
  });

  it("scopes a component variant uuid by its component", () => {
    expect(
      mkMentionRaw({
        kind: "componentVariant",
        uuid: "v1",
        componentUuid: "comp1",
        label: "Large",
      })
    ).toBe("componentVariant:comp1/v1|Large");
  });

  it("round-trips through parseMention", () => {
    const raw = mkMentionRaw({
      kind: "token",
      uuid: "t1",
      label: "brand/primary | dark",
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
    const text = `use @<token:${token.uuid}|primary> in @<component:${component.uuid}|Card>`;
    expect(findMissingMentions(text, site)).toEqual([]);
  });

  it("returns the label of a mention whose resource is gone", () => {
    expect(findMissingMentions("use @<token:deleted|primary>", site)).toEqual([
      "primary",
    ]);
  });

  it("catches a hand-typed mention that carries no uuid", () => {
    expect(findMissingMentions("use @<token:primary>", site)).toEqual([
      "primary",
    ]);
  });

  it("resolves a mention whose uuid is scoped by its component", () => {
    const raw = mkMentionRaw({
      kind: "tpl",
      uuid: tpl.uuid,
      componentUuid: component.uuid,
      tplType: "text",
      label: "MyElement",
    });
    expect(findMissingMentions(`tweak @<${raw}>`, site)).toEqual([]);
  });

  it("returns the label of a component-scoped mention whose resource is gone", () => {
    expect(
      findMissingMentions(`tweak @<tpl:${component.uuid}/gone|MyElement>`, site)
    ).toEqual(["MyElement"]);
    expect(
      findMissingMentions(`tweak @<tpl:gone/${tpl.uuid}|MyElement>`, site)
    ).toEqual(["MyElement"]);
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
  const { site, component, page, tpl, token, variant, animation } =
    mkTestSite();

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

  describe("imported projects", () => {
    const { site: s, imported, transitive } = mkTestSite();

    // Component and token resolution is covered through findMissingMentions
    // above; these are the kinds that reach for a different accessor. The
    // component-scoped kinds are absent on purpose: they only ever name the
    // focused component, which Studio never lets be an imported one.
    it("resolves a directly imported animation", () => {
      expect(getMentionUiId("animation", imported.animation.uuid, s)).toBe(
        mkModelUiId({
          typeTag: "AnimationSequence",
          uuid: imported.animation.uuid,
        })
      );
    });

    it("resolves a directly imported global variant", () => {
      expect(getMentionUiId("globalVariant", imported.variant.uuid, s)).toBe(
        mkModelUiId({ typeTag: "Variant", uuid: imported.variant.uuid })
      );
    });

    it("does not resolve a transitively imported resource", () => {
      // Mentions stop at direct deps, matching what the `read` tool can fetch.
      expect(
        getMentionUiId("component", transitive.component.uuid, s)
      ).toBeUndefined();
      expect(getMentionUiId("token", transitive.token.uuid, s)).toBeUndefined();
      expect(
        getMentionUiId("animation", transitive.animation.uuid, s)
      ).toBeUndefined();
      expect(
        getMentionUiId("globalVariant", transitive.variant.uuid, s)
      ).toBeUndefined();
    });
  });
});

describe("mkSiteMentionableResources", () => {
  const {
    site,
    component,
    page,
    token,
    registeredToken,
    variant,
    screenVariant,
    animation,
  } = mkTestSite();
  const fromProject = "Design kit";

  it("lists everything mentionable in a site", () => {
    expect(mkSiteMentionableResources(site)).toEqual([
      { kind: "component", uuid: component.uuid, label: "Card" },
      { kind: "page", uuid: page.uuid, label: "HomePage" },
      { kind: "token", uuid: token.uuid, label: "primary" },
      { kind: "token", uuid: registeredToken.uuid, label: "registered" },
      {
        kind: "globalVariant",
        uuid: variant.uuid,
        label: "Dark",
        detail: "Theme",
      },
      {
        kind: "globalVariant",
        uuid: screenVariant.uuid,
        label: "Mobile",
        detail: "Screen",
      },
      { kind: "animation", uuid: animation.uuid, label: "FadeIn" },
    ]);
  });

  it("drops the pages, screen variants and registered tokens of an imported project, stamping the rest", () => {
    expect(mkSiteMentionableResources(site, fromProject)).toEqual([
      { kind: "component", uuid: component.uuid, label: "Card", fromProject },
      { kind: "token", uuid: token.uuid, label: "primary", fromProject },
      {
        kind: "globalVariant",
        uuid: variant.uuid,
        label: "Dark",
        detail: "Theme",
        fromProject,
      },
      { kind: "animation", uuid: animation.uuid, label: "FadeIn", fromProject },
    ]);
  });

  it("keeps the registered tokens of a hostless package, which the tokens panel lists", () => {
    const { imported } = mkTestSite();
    runInAction(() => {
      writeable(imported.site).hostLessPackageInfo = new HostLessPackageInfo({
        name: "plasmic-rich-components",
        npmPkg: [],
        cssImport: [],
        deps: [],
        registerCalls: [],
        minimumReactVersion: null,
      });
    });

    expect(
      mkSiteMentionableResources(imported.site, fromProject)
    ).toContainEqual(
      expect.objectContaining({ uuid: imported.registeredToken.uuid })
    );
  });

  it("takes the breakpoints from the active screen variant group, even when an imported project owns it", () => {
    const fixture = mkTestSite();
    runInAction(() => {
      fixture.site.activeScreenVariantGroup =
        fixture.imported.site.globalVariantGroups[0];
    });

    const resources = mkSiteMentionableResources(fixture.site);
    expect(resources).toContainEqual({
      kind: "globalVariant",
      uuid: fixture.imported.screenVariant.uuid,
      label: "ImportedTablet",
      detail: "Screen",
    });
    // The site's own screen variant group is no longer the active one
    expect(resources).not.toContainEqual(
      expect.objectContaining({ uuid: fixture.screenVariant.uuid })
    );
  });
});
