import { matchScore } from "@/wab/client/components/mentions/mention-query";

import { mkMentionRaw } from "@/wab/client/components/mentions/mention-parse";
import {
  getBaseVariant,
  getVariantGroupName,
  isScreenVariantGroup,
} from "@/wab/shared/Variants";
import { isNonNil } from "@/wab/shared/common";
import {
  allComponentVariants,
  isPageComponent,
  isPlasmicComponent,
} from "@/wab/shared/core/components";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import {
  flattenTpls,
  getTplType,
  isTplComponent,
  isTplNamable,
  summarizeTpl,
  summarizeTplNamable,
  type TplType,
} from "@/wab/shared/core/tpls";
import { getEffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { MentionTag } from "@/wab/shared/mentions";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Component,
  ProjectDependency,
  Site,
  TplNode,
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

type VariantMentionableResource = BaseMentionableResource & {
  tag: "Variant";
  componentUuid: string;
};

export type MentionableResource =
  | ComponentMentionableResource
  | (BaseMentionableResource & {
      tag: Exclude<MentionTag, "Component" | "Tpl" | "Variant">;
    })
  | VariantMentionableResource
  | TplMentionableResource;

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
    searchable.push(...mkComponentMentionableResources(focusedComponent));
  }
  // Local resources come first: on a tie they should outrank an imported
  // project's resources
  searchable.push(...mkSiteMentionableResources(site));
  // Direct deps only, matching what the `read` copilot tool can fetch.
  for (const dep of walkDependencyTree(site, "direct")) {
    searchable.push(...mkSiteMentionableResources(dep.site, getDepName(dep)));
  }
  return {
    selection: mkCanvasSelectionResources(focusedComponent, selectedTpls),
    searchable,
  };
}

function mkComponentMentionableResources(
  component: Component,
): MentionableResource[] {
  const baseVariant = getBaseVariant(component);
  const resources: MentionableResource[] = [];

  const tpls: MentionableResource[] = [];
  for (const tpl of flattenTpls(component.tplTree)) {
    if (isTplNamable(tpl) && tpl.name) {
      tpls.push({
        tag: "Tpl",
        uuid: tpl.uuid,
        componentUuid: component.uuid,
        name: tpl.name,
        tplType: getTplType(
          tpl,
          getEffectiveVariantSetting(tpl, [baseVariant]),
        ),
        // For an instance, show which component it is an instance of.
        detail: isTplComponent(tpl) ? tpl.component.name : undefined,
      });
    }
  }
  resources.push(...naturalSortByName(tpls));

  for (const variant of naturalSortByName(allComponentVariants(component))) {
    resources.push({
      tag: "Variant",
      uuid: variant.uuid,
      componentUuid: component.uuid,
      name: variant.name,
      detail: getVariantGroupName(variant),
    });
  }
  return resources;
}

const mkSiteMentionableResources = maybeComputedFn(
  function mkSiteMentionableResources(
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

    // Of the screen variant groups, only the project's active one is mentionable (stored as `site.activeScreenVariantGroup`)
    const globalVariantGroups = site.globalVariantGroups.filter(
      (group) => !isScreenVariantGroup(group),
    );
    if (!isImported && site.activeScreenVariantGroup) {
      globalVariantGroups.push(site.activeScreenVariantGroup);
    }
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
  },
);

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
        name: isTplNamable(tpl)
          ? summarizeTplNamable(tpl, vs.rsh())
          : summarizeTpl(tpl, vs.rsh()),
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
      mentionSearchKeyword(resource),
      resource.fromProject,
    ].filter(isNonNil),
    query,
  );
}

function mentionSearchKeyword(resource: MentionableResource): string {
  switch (resource.tag) {
    case "Component":
      return resource.isPage ? "page" : "component";
    case "StyleToken":
      return "token";
    case "AnimationSequence":
      return "animation";
    case "Variant":
    case "GlobalVariant":
      return "variant";
    case "Tpl":
      return "element";
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
