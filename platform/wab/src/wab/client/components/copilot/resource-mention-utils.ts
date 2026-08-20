import {
  ModelTypeTag,
  UiId,
  mkModelUiId,
  mkTplUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import {
  getVariantGroupName,
  isScreenVariantGroup,
} from "@/wab/shared/Variants";
import { assertNever, isNonNil } from "@/wab/shared/common";
import {
  allComponentVariants,
  isPageComponent,
  isPlasmicComponent,
  tryGetComponentByUuid,
} from "@/wab/shared/core/components";
import { siteStyleTokensDirectDeps } from "@/wab/shared/core/site-style-tokens";
import {
  allAnimationSequences,
  allComponents,
  allGlobalVariants,
  isHostLessPackage,
} from "@/wab/shared/core/sites";
import { tryGetTplByUuid, type TplType } from "@/wab/shared/core/tpls";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { Component, Site } from "@/wab/shared/model/classes";
import { naturalSortByName } from "@/wab/shared/sort";
import { partition } from "lodash";
import { regex } from "regex";

export const MENTION_KIND_TYPE_TAG_MAP = {
  component: "Component",
  page: "Component",
  token: "StyleToken",
  globalVariant: "Variant",
  animation: "AnimationSequence",
  tpl: "tpl",
  componentVariant: "Variant",
} as const;

export type MentionableResourceKind = keyof typeof MENTION_KIND_TYPE_TAG_MAP;

/**
 * `componentUuid` is required for the kinds that live inside a component: it
 * narrows the search scope on lookup */
export type MentionableResource = {
  uuid: string;
  label: string;
  detail?: string;
  /** Display name of the imported project this came from; unset for local ones. */
  fromProject?: string;
} & (
  | { kind: Exclude<MentionableResourceKind, "tpl" | "componentVariant"> }
  | { kind: "tpl"; tplType: TplType; componentUuid: string }
  | { kind: "componentVariant"; componentUuid: string }
);

export const mkSiteMentionableResources = maybeComputedFn(
  function mkSiteMentionableResources(
    site: Site,
    fromProject?: string
  ): ReadonlyArray<MentionableResource> {
    const isImported = fromProject !== undefined;
    const resources: MentionableResource[] = [];

    // Code components and arena frames aren't things a user would refer to by
    // name in a prompt.
    const [pages, components] = partition<Component>(
      site.components.filter(isPlasmicComponent),
      isPageComponent
    );
    for (const comp of naturalSortByName(components)) {
      resources.push({
        kind: "component",
        uuid: comp.uuid,
        label: comp.name,
        fromProject,
      });
    }
    if (!isImported) {
      for (const page of naturalSortByName(pages)) {
        resources.push({ kind: "page", uuid: page.uuid, label: page.name });
      }
    }

    const styleTokens =
      isImported && !isHostLessPackage(site)
        ? site.styleTokens.filter((token) => !token.isRegistered)
        : site.styleTokens;
    for (const token of naturalSortByName(styleTokens)) {
      resources.push({
        kind: "token",
        uuid: token.uuid,
        label: token.name,
        fromProject,
      });
    }

    // Of the screen variant groups, only the project's active one is mentionable (stored as `site.activeScreenVariantGroup`)
    const globalVariantGroups = site.globalVariantGroups.filter(
      (group) => !isScreenVariantGroup(group)
    );
    if (!isImported && site.activeScreenVariantGroup) {
      globalVariantGroups.push(site.activeScreenVariantGroup);
    }
    for (const variant of naturalSortByName(
      globalVariantGroups.flatMap((group) => group.variants)
    )) {
      resources.push({
        kind: "globalVariant",
        uuid: variant.uuid,
        label: variant.name,
        detail: getVariantGroupName(variant),
        fromProject,
      });
    }

    for (const animation of naturalSortByName(site.animationSequences)) {
      resources.push({
        kind: "animation",
        uuid: animation.uuid,
        label: animation.name,
        fromProject,
      });
    }

    return resources;
  }
);

/** The uuid a mention stores: scoped by component where the kind needs it. */
function mentionUuid(resource: MentionableResource): string {
  return "componentUuid" in resource
    ? `${resource.componentUuid}/${resource.uuid}`
    : resource.uuid;
}

const MENTIONABLE_KINDS: string[] = Object.keys(MENTION_KIND_TYPE_TAG_MAP);

function isKnownKind(kind: string): kind is MentionableResourceKind {
  return MENTIONABLE_KINDS.includes(kind);
}

const kindPattern = new RegExp(MENTIONABLE_KINDS.join("|"));

/** Matches one whole mention, capturing its kind, optional uuid, and label. */
const mentionParseRegex = regex`
  ^ @<
    (?<kind> ${kindPattern} )
    :
    (?: (?<uuid> [^\|>]* ) \| )?   # optional, present only once resolved
    (?<label> [^>]* )
  > $
`;

const MENTION_ESCAPE_CODES: Record<string, string> = {
  "25": "%",
  "3E": ">",
  "7C": "|",
};

// Percent-encode the grammar's delimiters so a resource name containing them can't break parsing
function escapeMentionLabel(label: string): string {
  return label.replace(/%/g, "%25").replace(/>/g, "%3E").replace(/\|/g, "%7C");
}

function unescapeMentionLabel(label: string): string {
  return label.replace(/%(25|3E|7C)/g, (_, code) => MENTION_ESCAPE_CODES[code]);
}

/**
 * The raw text stored in a chip for a picked resource: `kind:uuid|label`.
 *
 * The uuid is known at pick time, so there is nothing to resolve later — the
 * chip hides it, and a mention keeps working even if the resource is renamed.
 */
export function mkMentionRaw(resource: MentionableResource): string {
  return `${resource.kind}:${mentionUuid(resource)}|${escapeMentionLabel(
    resource.label
  )}`;
}

/* Labels of mentions in @param text whose resource no longer exists in @param site */
export function findMissingMentions(text: string, site: Site): string[] {
  return text
    .split(mentionSplitRegex)
    .map((part) => parseMention(part))
    .filter(isNonNil)
    .filter(({ kind, uuid }) => !uuid || !getMentionUiId(kind, uuid, site))
    .map(({ label }) => label);
}

/** Matches and captures one whole mention */
export const mentionSplitRegex = regex`
  (?<mention> @< ${kindPattern} : [^>]* > )
`;

export interface ParsedMention {
  kind: MentionableResourceKind;
  uuid: string | undefined;
  label: string;
}

export function parseMention(text: string): ParsedMention | undefined {
  const match = mentionParseRegex.exec(text);
  if (!match) {
    return undefined;
  }
  const { kind, uuid, label } = match.groups!;
  if (!isKnownKind(kind)) {
    return undefined;
  }
  return { kind, uuid, label: unescapeMentionLabel(label) };
}

/** The Model UiId for `uuid` if a matching candidate exists, else undefined. */
function tryGetModelUiId(
  candidates: readonly { uuid: string }[],
  uuid: string,
  typeTag: ModelTypeTag
): UiId | undefined {
  return candidates.some((c) => c.uuid === uuid)
    ? mkModelUiId({ typeTag, uuid })
    : undefined;
}

/**
 * The UiActionBus UiId to jump to a mentioned resource, or undefined if it no
 * longer exists.
 */
export function getMentionUiId(
  kind: MentionableResourceKind,
  uuid: string,
  site: Site
): UiId | undefined {
  switch (kind) {
    case "component":
    case "page":
      return tryGetModelUiId(
        allComponents(site, { includeDeps: "direct" }),
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "token":
      return tryGetModelUiId(
        siteStyleTokensDirectDeps(site),
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "animation":
      return tryGetModelUiId(
        allAnimationSequences(site, { includeDeps: "direct" }),
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "globalVariant":
      return tryGetModelUiId(
        allGlobalVariants(site, { includeDeps: "direct" }),
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "componentVariant": {
      const [componentUuid, variantUuid] = uuid.split("/");
      const component = tryGetComponentByUuid(site, componentUuid);
      return component
        ? tryGetModelUiId(
            allComponentVariants(component),
            variantUuid,
            MENTION_KIND_TYPE_TAG_MAP[kind]
          )
        : undefined;
    }
    case "tpl": {
      const [componentUuid, tplUuid] = uuid.split("/");
      const component = tryGetComponentByUuid(site, componentUuid);
      return component && tryGetTplByUuid(component, tplUuid)
        ? mkTplUiId(componentUuid, tplUuid)
        : undefined;
    }
    default:
      return assertNever(kind);
  }
}
