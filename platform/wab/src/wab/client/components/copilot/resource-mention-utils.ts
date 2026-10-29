import { matchScore } from "@/wab/client/components/mentions/mention-query";

import { mkMentionRaw } from "@/wab/client/components/mentions/mention-parse";
import { MIXIN_LOWER } from "@/wab/shared/Labels";
import {
  getBaseVariant,
  getVariantGroupName,
  isScreenVariantGroup,
  makeVariantName,
} from "@/wab/shared/Variants";
import { isNonNil } from "@/wab/shared/common";
import {
  allComponentVariants,
  getParamDisplayName,
  isPageComponent,
  isPlasmicComponent,
} from "@/wab/shared/core/components";
import { isIcon } from "@/wab/shared/core/image-assets";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { getStateDisplayName } from "@/wab/shared/core/states";
import {
  flattenTpls,
  getTplNodeLabel,
  getTplNodeName,
  getTplType,
  isTplComponent,
  type TplType,
} from "@/wab/shared/core/tpls";
import { getEffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  ComponentScopedMentionTag,
  SiteScopedMentionTag,
} from "@/wab/shared/mentions";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Component,
  ProjectDependency,
  Site,
  TplNode,
  isKnownPropParam,
} from "@/wab/shared/model/classes";
import { naturalSortByName } from "@/wab/shared/sort";
import { partition } from "lodash";

type BaseMentionableResource = {
  uuid: string;
  name: string;
  /** Additional data about the resource */
  detail?: string;
  /** Display name of the imported project this came from; unset for local ones. */
  fromProject?: string;
};

type ComponentMentionableResource = BaseMentionableResource & {
  tag: "Component";
  isPage: boolean;
};

export type TplMentionableResource = BaseMentionableResource & {
  tag: "Tpl";
  /** Narrows the search scope on lookup. */
  componentUuid: string;
  tplType: TplType;
};

export type MentionableResource =
  | ComponentMentionableResource
  | (BaseMentionableResource & {
      tag: Exclude<SiteScopedMentionTag, "Component">;
    })
  | TplMentionableResource
  | (BaseMentionableResource & {
      tag: Exclude<ComponentScopedMentionTag, "Tpl">;
      componentUuid: string;
    });

export interface MentionableResources {
  selection?: {
    component: ComponentMentionableResource;
    elements: TplMentionableResource[];
  };
  searchable: MentionableResource[];
}

/**
 * Composes all resources available for @-mentions
 */
export function mkMentionableResources({
  site,
  focusedComponent,
  selectedTpls,
  getDepName,
}: {
  site: Site;
  focusedComponent: Component | undefined;
  selectedTpls: TplNode[];
  getDepName: (dep: ProjectDependency) => string;
}): MentionableResources {
  const searchable: MentionableResource[] = [];
  if (focusedComponent) {
    searchable.push(...mkComponentScopedResources(focusedComponent, site));
  }
  // Local resources come first: on a tie they should outrank an imported
  // project's resources
  searchable.push(...mkSiteScopedResources(site));
  // Direct deps only, matching what the `read` copilot tool can fetch.
  for (const dep of walkDependencyTree(site, "direct")) {
    searchable.push(...mkSiteScopedResources(dep.site, getDepName(dep)));
  }
  return {
    selection: mkCanvasSelectionResources(focusedComponent, selectedTpls),
    searchable,
  };
}

function mkComponentScopedResources(
  component: Component,
  site: Site,
): MentionableResource[] {
  const baseVariant = getBaseVariant(component);
  const resources: MentionableResource[] = [];
  const componentUuid = component.uuid;

  const tpls: MentionableResource[] = [];
  for (const tpl of flattenTpls(component.tplTree)) {
    const name = getTplNodeName(tpl);
    if (!name) {
      continue;
    }
    tpls.push({
      tag: "Tpl",
      uuid: tpl.uuid,
      componentUuid,
      name,
      tplType: getTplType(tpl, getEffectiveVariantSetting(tpl, [baseVariant])),
      // For an instance, show which component it is an instance of.
      detail: isTplComponent(tpl) ? tpl.component.name : undefined,
    });
  }
  resources.push(...naturalSortByName(tpls));

  const props = component.params.filter(isKnownPropParam).map((param) => ({
    tag: "PropParam" as const,
    uuid: param.uuid,
    componentUuid,
    name: getParamDisplayName(component, param),
  }));
  resources.push(...naturalSortByName(props));

  const states = component.states
    .filter((state) => state.variableType !== "variant")
    .map((state) => ({
      tag: "StateParam" as const,
      uuid: state.param.uuid,
      componentUuid,
      name: getStateDisplayName(state, "short"),
      detail: state.tplNode
        ? getTplNodeLabel(
            state.tplNode,
            getEffectiveVariantSetting(state.tplNode, [baseVariant]).rsh(),
          )
        : undefined,
    }));
  resources.push(...naturalSortByName(states));

  const queries = component.serverQueries.map((query) => ({
    tag: "ComponentServerQuery" as const,
    uuid: query.uuid,
    componentUuid,
    name: query.name,
  }));
  resources.push(...naturalSortByName(queries));

  const legacyQueries = component.dataQueries.map((query) => ({
    tag: "ComponentDataQuery" as const,
    uuid: query.uuid,
    componentUuid,
    name: query.name,
  }));
  resources.push(...naturalSortByName(legacyQueries));

  const variants = allComponentVariants(component).map((variant) => ({
    tag: "Variant" as const,
    uuid: variant.uuid,
    componentUuid,
    name: makeVariantName({ variant, site }),
    detail:
      getVariantGroupName(variant) ??
      (variant.forTpl
        ? getTplNodeLabel(
            variant.forTpl,
            getEffectiveVariantSetting(variant.forTpl, [baseVariant]).rsh(),
          )
        : undefined),
  }));
  resources.push(...naturalSortByName(variants));

  return resources;
}

const mkSiteScopedResources = maybeComputedFn(function mkSiteScopedResources(
  site: Site,
  fromProject?: string,
): ReadonlyArray<MentionableResource> {
  const isImported = fromProject !== undefined;
  const resources: MentionableResource[] = [];

  // Code components and arena frames aren't things a user would refer to by
  // name in a prompt.
  const [pages, components] = partition<Component>(
    site.components.filter(isPlasmicComponent),
    isPageComponent,
  );
  for (const comp of naturalSortByName(components)) {
    resources.push({
      tag: "Component",
      isPage: false,
      uuid: comp.uuid,
      name: comp.name,
      fromProject,
    });
  }
  if (!isImported) {
    for (const page of naturalSortByName(pages)) {
      resources.push({
        tag: "Component",
        isPage: true,
        uuid: page.uuid,
        name: page.name,
      });
    }
  }

  const styleTokens =
    isImported && !isHostLessPackage(site)
      ? site.styleTokens.filter((token) => !token.isRegistered)
      : site.styleTokens;
  for (const token of naturalSortByName(styleTokens)) {
    resources.push({
      tag: "StyleToken",
      uuid: token.uuid,
      name: token.name,
      fromProject,
    });
  }

  for (const token of naturalSortByName(site.dataTokens)) {
    resources.push({
      tag: "DataToken",
      uuid: token.uuid,
      name: token.name,
      fromProject,
    });
  }

  const imageAssets = site.imageAssets.filter((asset) => !!asset.dataUri);
  for (const asset of naturalSortByName(imageAssets)) {
    resources.push({
      tag: "ImageAsset",
      uuid: asset.uuid,
      name: asset.name,
      detail: isIcon(asset) ? "icon" : undefined,
      fromProject,
    });
  }

  for (const mixin of naturalSortByName(site.mixins)) {
    resources.push({
      tag: "Mixin",
      uuid: mixin.uuid,
      name: mixin.name,
      fromProject,
    });
  }

  // Of the screen variant groups, only the project's active one is mentionable (stored as `site.activeScreenVariantGroup`)
  const globalVariantGroups = site.globalVariantGroups.filter(
    (group) => !isScreenVariantGroup(group),
  );
  if (!isImported && site.activeScreenVariantGroup) {
    globalVariantGroups.push(site.activeScreenVariantGroup);
  }
  const groups = globalVariantGroups.map((group) => ({
    tag: "GlobalVariantGroup" as const,
    uuid: group.uuid,
    name: group.param.variable.name,
    fromProject,
  }));
  resources.push(...naturalSortByName(groups));
  for (const variant of naturalSortByName(
    globalVariantGroups.flatMap((group) => group.variants),
  )) {
    resources.push({
      tag: "GlobalVariant",
      uuid: variant.uuid,
      name: variant.name,
      detail: getVariantGroupName(variant),
      fromProject,
    });
  }

  for (const animation of naturalSortByName(site.animationSequences)) {
    resources.push({
      tag: "AnimationSequence",
      uuid: animation.uuid,
      name: animation.name,
      fromProject,
    });
  }

  return resources;
});

/**
 * The user's current canvas selection as mentionable resources.
 */
function mkCanvasSelectionResources(
  currentComponent: Component | undefined,
  selectedTpls: TplNode[],
): MentionableResources["selection"] {
  if (!currentComponent || !isPlasmicComponent(currentComponent)) {
    return undefined;
  }
  const baseVariant = getBaseVariant(currentComponent);
  return {
    component: {
      tag: "Component",
      isPage: isPageComponent(currentComponent),
      uuid: currentComponent.uuid,
      name: currentComponent.name,
    },
    elements: selectedTpls.map((tpl) => {
      const vs = getEffectiveVariantSetting(tpl, [baseVariant]);
      return {
        tag: "Tpl" as const,
        uuid: tpl.uuid,
        componentUuid: currentComponent.uuid,
        tplType: getTplType(tpl, vs),
        name: getTplNodeLabel(tpl, vs.rsh()),
      };
    }),
  };
}

export function getResourceMatchScore(
  resource: MentionableResource,
  query: string,
): number | undefined {
  return matchScore(
    [
      resource.name,
      resource.detail,
      ...mentionSearchKeywords(resource),
      resource.fromProject,
    ].filter(isNonNil),
    query,
  );
}

function mentionSearchKeywords(resource: MentionableResource): string[] {
  switch (resource.tag) {
    case "Component":
      return [resource.isPage ? "page" : "component"];
    case "StyleToken":
      return ["token"];
    case "DataToken":
      return ["data token", "token"];
    case "ImageAsset":
      return ["image", "icon"];
    case "Mixin":
      return ["mixin", MIXIN_LOWER];
    case "AnimationSequence":
      return ["animation"];
    case "Variant":
    case "GlobalVariant":
      return ["variant"];
    case "GlobalVariantGroup":
      return ["variant group"];
    case "PropParam":
      return ["prop"];
    case "StateParam":
      return ["state", "variable"];
    case "ComponentServerQuery":
    case "ComponentDataQuery":
      return ["data query"];
    case "Tpl":
      return ["element"];
  }
}

export function mkResourceMentionRaw(resource: MentionableResource): string {
  return mkMentionRaw(
    "componentUuid" in resource
      ? {
          type: "ComponentScoped",
          tag: resource.tag,
          componentUuid: resource.componentUuid,
          uuid: resource.uuid,
        }
      : { type: "SiteScoped", tag: resource.tag, uuid: resource.uuid },
  );
}
