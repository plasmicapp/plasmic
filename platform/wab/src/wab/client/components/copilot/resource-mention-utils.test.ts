import {
  getResourceMatchScore,
  mkMentionableResources,
  mkResourceMentionRaw,
  type MentionableResource,
} from "@/wab/client/components/copilot/resource-mention-utils";
import { parseMention } from "@/wab/client/components/mentions/mention-parse";
import {
  ComponentScopedTag,
  ModelUiId,
  SiteScopedTag,
  mkComponentScopedUiId,
  mkModelUiId,
  mkSiteScopedUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import {
  resolveResource,
  resolveResourceLabel,
} from "@/wab/client/studio-ctx/ui/studio-ui-resources";
import { mkDataToken } from "@/wab/commons/DataToken";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { FREE_CONTAINER_LOWER } from "@/wab/shared/Labels";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  VariantGroupType,
  getBaseVariant,
  mkGlobalVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";
import { assert, ensure, mkShortId } from "@/wab/shared/common";
import {
  ComponentType,
  mkComponent,
  mkPageMeta,
} from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { mkImageAsset } from "@/wab/shared/core/image-assets";
import { mkParam, mkParamsForState } from "@/wab/shared/core/lang";
import { createSite, writeable } from "@/wab/shared/core/sites";
import { mkImplicitState, mkState } from "@/wab/shared/core/states";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { deepTrackComponents, mkSlot, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  AnimationSequence,
  CodeComponentMeta,
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  HostLessPackageInfo,
  Mixin,
  ProjectDependency,
  TplNode,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { runInAction } from "mobx";

function mkTestSite() {
  const site = createSite();
  const unnamedTpl = mkTplTagX("div");
  const slotParam = mkParam({
    name: "children",
    type: typeFactory.renderable(),
    paramType: "slot",
  });
  const slot = mkSlot(slotParam);
  const tpl = mkTplTagX("div", { name: "MyElement" }, [unnamedTpl, slot]);
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
  const dataToken = mkDataToken({ name: "apiUrl", value: "https://x.test" });
  const image = mkTestImage("Hero");
  const icon = mkTestImage("Logo", ImageAssetType.Icon);
  const dataUrilessImage = mkTestImage("Pending");
  dataUrilessImage.dataUri = null;
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
  const mixin = mkTestMixin("Elevated");
  const transitive = mkTestDep("Transitive");
  const imported = mkTestDep("Imported", {
    projectDependencies: [transitive.dep],
  });
  // Named differently from how it is listed, to tell the two apart.
  const propParam = mkParam({
    name: "title",
    displayName: "Title",
    type: typeFactory.text(),
    paramType: "prop",
  });
  const { valueParam: stateParam, onChangeParam } = mkParamsForState({
    name: "item count",
    variableType: "number",
    accessType: "private",
    onChangeProp: "onItemCountChange",
  });
  const state = mkState({
    param: stateParam,
    onChangeParam,
    variableType: "number",
  });
  // MyElement exposes a `value` state of its own, as a text input would;
  // Studio names the backing param "<element> <state>".
  const innerState = mkParamsForState({
    name: "value",
    variableType: "text",
    accessType: "writable",
    onChangeProp: "onChange",
  });
  const implicitParams = mkParamsForState({
    name: "MyElement value",
    variableType: "text",
    accessType: "private",
    onChangeProp: "MyElement onChange",
  });
  const implicitState = mkImplicitState(
    mkState({
      param: innerState.valueParam,
      onChangeParam: innerState.onChangeParam,
      variableType: "text",
    }),
    tpl,
    implicitParams.valueParam,
    implicitParams.onChangeParam,
  );
  const serverQuery = new ComponentServerQuery({
    uuid: mkShortId(),
    name: "fetchUsers",
    op: null,
  });
  const legacyQuery = new ComponentDataQuery({
    uuid: mkShortId(),
    name: "listUsers",
    op: null,
  });
  // A style variant carries no name of its own, as `TplMgr` creates it.
  const elementState = mkVariant({
    name: "",
    selectors: [":hover"],
    forTpl: tpl,
  });
  const interactionVariant = mkVariant({ name: "", selectors: [":active"] });
  runInAction(() => {
    site.components = [...site.components, component, page, codeComponent];
    site.styleTokens = [...site.styleTokens, token, registeredToken];
    site.dataTokens = [...site.dataTokens, dataToken];
    site.imageAssets = [...site.imageAssets, image, icon, dataUrilessImage];
    screenGroup.variants = [...screenGroup.variants, screenVariant];
    site.globalVariantGroups = [...site.globalVariantGroups, variantGroup];
    site.animationSequences = [...site.animationSequences, animation];
    site.mixins = [...site.mixins, mixin];
    site.projectDependencies = [...site.projectDependencies, imported.dep];
    component.params = [
      ...component.params,
      propParam,
      slotParam,
      stateParam,
      onChangeParam,
      implicitParams.valueParam,
      implicitParams.onChangeParam,
    ];
    component.states = [...component.states, state, implicitState];
    component.serverQueries = [...component.serverQueries, serverQuery];
    component.dataQueries = [...component.dataQueries, legacyQuery];
    component.variants = [
      ...component.variants,
      elementState,
      interactionVariant,
    ];
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
    slot,
    slotParam,
    propParam,
    stateParam,
    state,
    implicitState,
    serverQuery,
    legacyQuery,
    elementState,
    interactionVariant,
    token,
    registeredToken,
    dataToken,
    image,
    icon,
    dataUrilessImage,
    mixin,
    variant,
    variantGroup,
    screenGroup,
    screenVariant,
    animation,
    imported,
    transitive,
  };
}

/** A picture needs its data to be listed, as `read` lists it. */
function mkTestImage(name: string, type = ImageAssetType.Picture) {
  return mkImageAsset({
    name,
    type,
    dataUri: "data:image/png;base64,iVBORw0KGgo=",
    width: 10,
    height: 10,
  });
}

function mkTestMixin(name: string) {
  return new Mixin({
    uuid: mkShortId(),
    name,
    rs: mkRuleSet({}),
    preview: undefined,
    forTheme: false,
    variantedRs: [],
  });
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
  const dataToken = mkDataToken({
    name: `${name}ApiUrl`,
    value: "https://y.test",
  });
  const image = mkTestImage(`${name}Hero`);
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
  const screenGroup = site.globalVariantGroups[0];
  const screenVariant = mkVariant({
    name: `${name}Tablet`,
    parent: screenGroup,
  });
  const mixin = mkTestMixin(`${name}Elevated`);
  // What an imported component owns is never mentionable, so the exact
  // listing assertion fails if any of it leaks in.
  const propParam = mkParam({
    name: `${name}Title`,
    type: typeFactory.text(),
    paramType: "prop",
  });
  const { valueParam: stateParam, onChangeParam } = mkParamsForState({
    name: `${name}Count`,
    variableType: "number",
    accessType: "private",
    onChangeProp: `${name}OnCountChange`,
  });
  const state = mkState({
    param: stateParam,
    onChangeParam,
    variableType: "number",
  });
  const serverQuery = new ComponentServerQuery({
    uuid: mkShortId(),
    name: `${name}FetchUsers`,
    op: null,
  });
  const legacyQuery = new ComponentDataQuery({
    uuid: mkShortId(),
    name: `${name}ListUsers`,
    op: null,
  });
  const elementState = mkVariant({
    name: "",
    selectors: [":hover"],
    forTpl: tpl,
  });
  runInAction(() => {
    site.components = [...site.components, component, page, codeComponent];
    site.styleTokens = [...site.styleTokens, token, registeredToken];
    site.dataTokens = [...site.dataTokens, dataToken];
    site.imageAssets = [...site.imageAssets, image];
    site.animationSequences = [...site.animationSequences, animation];
    site.mixins = [...site.mixins, mixin];
    site.globalVariantGroups = [...site.globalVariantGroups, variantGroup];
    site.globalVariantGroups[0].variants = [
      ...site.globalVariantGroups[0].variants,
      screenVariant,
    ];
    component.params = [
      ...component.params,
      propParam,
      stateParam,
      onChangeParam,
    ];
    component.states = [...component.states, state];
    component.serverQueries = [...component.serverQueries, serverQuery];
    component.dataQueries = [...component.dataQueries, legacyQuery];
    component.variants = [...component.variants, elementState];
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
    dataToken,
    image,
    mixin,
    animation,
    propParam,
    stateParam,
    serverQuery,
    legacyQuery,
    elementState,
    variant,
    variantGroup,
    screenGroup,
    screenVariant,
  };
}

describe("mkResourceMentionRaw", () => {
  it("keeps only the tag and uuid", () => {
    expect(
      mkResourceMentionRaw({ tag: "StyleToken", uuid: "t1", name: "primary" }),
    ).toBe("StyleToken:t1");
  });

  it("scopes a uuid by its component", () => {
    expect(
      mkResourceMentionRaw({
        tag: "Tpl",
        uuid: "tpl1",
        componentUuid: "comp1",
        tplType: "text",
        name: "Title",
      }),
    ).toBe("Tpl:comp1/tpl1");
    expect(
      mkResourceMentionRaw({
        tag: "StateParam",
        uuid: "s1",
        componentUuid: "comp1",
        name: "count",
      }),
    ).toBe("StateParam:comp1/s1");
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

describe("resolveResource: the site-wide resources", () => {
  const fx = mkTestSite();
  const siteScoped = (typeTag: SiteScopedTag, uuid: string) =>
    resolveResource(fx.site, mkSiteScopedUiId({ typeTag, uuid }))?.resource;

  it("resolves a data token", () => {
    expect(siteScoped("DataToken", fx.dataToken.uuid)).toBe(fx.dataToken);
  });

  it("resolves a directly imported data token", () => {
    expect(siteScoped("DataToken", fx.imported.dataToken.uuid)).toBe(
      fx.imported.dataToken,
    );
  });

  it("does not resolve a transitively imported data token", () => {
    expect(
      siteScoped("DataToken", fx.transitive.dataToken.uuid),
    ).toBeUndefined();
  });

  it("resolves an image and an icon", () => {
    expect(siteScoped("ImageAsset", fx.image.uuid)).toBe(fx.image);
    expect(siteScoped("ImageAsset", fx.icon.uuid)).toBe(fx.icon);
  });

  it("does not resolve a transitively imported image", () => {
    expect(siteScoped("ImageAsset", fx.transitive.image.uuid)).toBeUndefined();
  });

  it("resolves a mixin", () => {
    expect(siteScoped("Mixin", fx.mixin.uuid)).toBe(fx.mixin);
  });

  it("resolves a directly imported mixin", () => {
    expect(siteScoped("Mixin", fx.imported.mixin.uuid)).toBe(fx.imported.mixin);
  });

  it("does not resolve a transitively imported mixin", () => {
    expect(siteScoped("Mixin", fx.transitive.mixin.uuid)).toBeUndefined();
  });

  it("resolves a global variant group", () => {
    expect(siteScoped("GlobalVariantGroup", fx.variantGroup.uuid)).toBe(
      fx.variantGroup,
    );
  });

  it("resolves the project's active screen variant group", () => {
    expect(siteScoped("GlobalVariantGroup", fx.screenGroup.uuid)).toBe(
      fx.screenGroup,
    );
  });

  it("does not resolve a screen variant group that is not the active one", () => {
    expect(
      siteScoped("GlobalVariantGroup", fx.imported.screenGroup.uuid),
    ).toBeUndefined();
  });

  it("resolves the active screen variant group when an imported project owns it", () => {
    const own = mkTestSite();
    const imported = own.imported.screenGroup;
    runInAction(() => {
      own.site.activeScreenVariantGroup = imported;
    });
    expect(
      resolveResource(
        own.site,
        mkSiteScopedUiId({
          typeTag: "GlobalVariantGroup",
          uuid: imported.uuid,
        }),
      )?.resource,
    ).toBe(imported);
  });
});

describe("resolveResource: the resources a component owns", () => {
  const fx = mkTestSite();
  const scoped = (typeTag: ComponentScopedTag, uuid: string) =>
    resolveResource(
      fx.site,
      mkComponentScopedUiId({ typeTag, uuid }, fx.component.uuid),
    )?.resource;

  it("resolves a prop", () => {
    expect(scoped("PropParam", fx.propParam.uuid)).toBe(fx.propParam);
  });

  it("resolves a state through its param", () => {
    expect(scoped("StateParam", fx.stateParam.uuid)).toBe(fx.stateParam);
  });

  it("resolves a data query and a legacy data query", () => {
    expect(scoped("ComponentServerQuery", fx.serverQuery.uuid)).toBe(
      fx.serverQuery,
    );
    expect(scoped("ComponentDataQuery", fx.legacyQuery.uuid)).toBe(
      fx.legacyQuery,
    );
  });

  it("resolves a slot as the element it is", () => {
    expect(scoped("Tpl", fx.slot.uuid)).toBe(fx.slot);
  });

  it("resolves an element state and an interaction variant", () => {
    expect(scoped("Variant", fx.elementState.uuid)).toBe(fx.elementState);
    expect(scoped("Variant", fx.interactionVariant.uuid)).toBe(
      fx.interactionVariant,
    );
  });
});

describe("resolveResourceLabel", () => {
  const fx = mkTestSite();
  const label = (uiId: ModelUiId) => resolveResourceLabel(fx.site, uiId);
  const scoped = (typeTag: ComponentScopedTag, uuid: string) =>
    label(mkComponentScopedUiId({ typeTag, uuid }, fx.component.uuid));

  it("names a mixin and a global variant group", () => {
    expect(label(mkSiteScopedUiId(fx.mixin))).toBe("Elevated");
    expect(label(mkSiteScopedUiId(fx.variantGroup))).toBe("Theme");
  });

  it("names a slot by the param it fills in", () => {
    expect(scoped("Tpl", fx.slot.uuid)).toBe("children");
  });

  it("names a prop and a state as the sidebar does, an implicit state by its element too", () => {
    expect(scoped("PropParam", fx.propParam.uuid)).toBe("Title");
    expect(scoped("StateParam", fx.stateParam.uuid)).toBe("Item count");
    expect(scoped("StateParam", fx.implicitState.param.uuid)).toBe(
      "MyElement: Value",
    );
    expect(scoped("ComponentServerQuery", fx.serverQuery.uuid)).toBe(
      "fetchUsers",
    );
  });

  it("names a group variant by itself", () => {
    expect(scoped("Variant", fx.componentVariant.uuid)).toBe("Large");
  });

  it("names a style variant by its selectors, an element state by its element too", () => {
    expect(scoped("Variant", fx.interactionVariant.uuid)).toBe("Pressed");
    expect(scoped("Variant", fx.elementState.uuid)).toBe("MyElement: Hover");
  });

  it("has no label left once the resource is gone", () => {
    expect(label(mkSiteScopedUiId({ typeTag: "Mixin", uuid: "nope" }))).toBe(
      undefined,
    );
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
      dataToken,
      image,
      icon,
      mixin,
      variantGroup,
      screenGroup,
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
      { tag: "DataToken", uuid: dataToken.uuid, name: "apiUrl" },
      { tag: "ImageAsset", uuid: image.uuid, name: "Hero" },
      { tag: "ImageAsset", uuid: icon.uuid, name: "Logo", detail: "icon" },
      { tag: "Mixin", uuid: mixin.uuid, name: "Elevated" },
      {
        tag: "GlobalVariantGroup",
        uuid: screenGroup.uuid,
        name: "Screen",
      },
      {
        tag: "GlobalVariantGroup",
        uuid: variantGroup.uuid,
        name: "Theme",
      },
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
        tag: "DataToken",
        uuid: imported.dataToken.uuid,
        name: "ImportedApiUrl",
        fromProject,
      },
      {
        tag: "ImageAsset",
        uuid: imported.image.uuid,
        name: "ImportedHero",
        fromProject,
      },
      {
        tag: "Mixin",
        uuid: imported.mixin.uuid,
        name: "ImportedElevated",
        fromProject,
      },
      {
        tag: "GlobalVariantGroup",
        uuid: imported.variantGroup.uuid,
        name: "ImportedTheme",
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

  it("lists everything the open component owns", () => {
    const {
      component,
      tpl,
      slot,
      propParam,
      stateParam,
      implicitState,
      serverQuery,
      legacyQuery,
      componentVariant,
      elementState,
      interactionVariant,
    } = fixture;
    const componentUuid = component.uuid;
    const { searchable } = mkResources(fixture, component);
    // Exact, so a resource that should have been dropped fails here.
    expect(
      searchable.filter(
        (r) => "componentUuid" in r && r.componentUuid === componentUuid,
      ),
    ).toEqual([
      // A slot is listed as the element it is, named by its param.
      {
        tag: "Tpl",
        uuid: slot.uuid,
        componentUuid,
        name: "children",
        tplType: "slot",
      },
      {
        tag: "Tpl",
        uuid: tpl.uuid,
        componentUuid,
        name: "MyElement",
        tplType: "freeContainer",
      },
      { tag: "PropParam", uuid: propParam.uuid, componentUuid, name: "Title" },
      // Not the variant group's own state, which is reached through the group.
      {
        tag: "StateParam",
        uuid: stateParam.uuid,
        componentUuid,
        name: "Item count",
      },
      // An implicit state is qualified by the element it is on.
      {
        tag: "StateParam",
        uuid: implicitState.param.uuid,
        componentUuid,
        name: "Value",
        detail: "MyElement",
      },
      {
        tag: "ComponentServerQuery",
        uuid: serverQuery.uuid,
        componentUuid,
        name: "fetchUsers",
      },
      {
        tag: "ComponentDataQuery",
        uuid: legacyQuery.uuid,
        componentUuid,
        name: "listUsers",
      },
      {
        tag: "Variant",
        uuid: getBaseVariant(component).uuid,
        componentUuid,
        name: "base",
      },
      // An element state is qualified by the element it is on.
      {
        tag: "Variant",
        uuid: elementState.uuid,
        componentUuid,
        name: "Hover",
        detail: "MyElement",
      },
      {
        tag: "Variant",
        uuid: componentVariant.uuid,
        componentUuid,
        name: "Large",
        detail: "Size",
      },
      {
        tag: "Variant",
        uuid: interactionVariant.uuid,
        componentUuid,
        name: "Pressed",
      },
    ]);
    // An unnamed element is not searchable, so it is left out of `searchable`.
    expect(searchable).not.toContainEqual(
      expect.objectContaining({ uuid: fixture.unnamedTpl.uuid }),
    );
  });

  it("names every row as its chip will read once picked", () => {
    const { component, site } = fixture;
    const { searchable } = mkResources(fixture, component);
    for (const r of searchable) {
      if (!("componentUuid" in r)) {
        continue;
      }
      const uiId = mkComponentScopedUiId(
        { typeTag: r.tag, uuid: r.uuid },
        r.componentUuid,
      );
      // A chip joins an element state's element in; the row has it as `detail`.
      const chip = resolveResourceLabel(site, uiId);
      expect(chip === r.name || chip === `${r.detail}: ${r.name}`).toBe(true);
    }
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
