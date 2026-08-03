import {
  ModelTypeTag,
  UiId,
  mkModelUiId,
  mkTplUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { getVariantGroupName } from "@/wab/shared/Variants";
import { assertNever } from "@/wab/shared/common";
import {
  allComponentVariants,
  isPlasmicComponent,
  tryGetComponentByName,
  tryGetComponentByUuid,
} from "@/wab/shared/core/components";
import { allGlobalVariants } from "@/wab/shared/core/sites";
import {
  tryGetTplByName,
  tryGetTplByUuid,
  type TplType,
} from "@/wab/shared/core/tpls";
import { Site, Variant } from "@/wab/shared/model/classes";
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

export type MentionableResource = {
  uuid: string;
  label: string;
  detail?: string;
  // The ownership path (outermost first) for kinds whose name is unique only
  // within an owner: a tpl → [component], a global variant → [group], a component
  // variant → [component, group]. Builds the mention body
  owners?: string[];
} & (
  | { kind: Exclude<MentionableResourceKind, "tpl"> }
  | { kind: "tpl"; tplType: TplType }
);

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

/** Matches an unresolved mention (no folded-in uuid), capturing kind and body. */
const unresolvedMentionRegex = regex("g")`
  @<
    (?<kind> ${kindPattern} )
    :
    (?<body> [^\|>]* )
  >
`;

const MENTION_ESCAPE_CODES: Record<string, string> = {
  "25": "%",
  "3E": ">",
  "7C": "|",
  "2F": "/",
};

// Percent-encode the grammar's delimiters so a resource name containing them can't break parsing
function escapeMentionLabel(
  label: string,
  opts: { escapeCompositeSeparator?: boolean } = {}
): string {
  const escaped = label
    .replace(/%/g, "%25")
    .replace(/>/g, "%3E")
    .replace(/\|/g, "%7C");
  return opts.escapeCompositeSeparator
    ? escaped.replace(/\//g, "%2F")
    : escaped;
}

function unescapeMentionLabel(label: string): string {
  return label.replace(
    /%(25|3E|7C|2F)/g,
    (_, code) => MENTION_ESCAPE_CODES[code]
  );
}

/** Split a composite `owner/name` body on its last `/` (both parts stay escaped). */
function splitCompositeBody(
  body: string
): { owner: string; name: string } | undefined {
  const sep = body.lastIndexOf("/");
  if (sep === -1) {
    return undefined;
  }
  return { owner: body.slice(0, sep), name: body.slice(sep + 1) };
}

function mkResolvedMention(kind: string, uuid: string, label: string): string {
  return `@<${kind}:${uuid}|${label}>`;
}

/** The mention content for a picked resource; `useMentions` wraps it as `<…> `. */
export function formatMentionInsert(resource: MentionableResource): string {
  // Body is `owner…/name`. The outermost owner keeps its folder `/`s; every
  // deeper segment escapes its own so the tiers stay unambiguous.
  const segments = [...(resource.owners ?? []), resource.label];
  return `${resource.kind}:${segments
    .map((s, i) => escapeMentionLabel(s, { escapeCompositeSeparator: i > 0 }))
    .join("/")}`;
}

/**
 * Rewrite each unresolved mention in the @param text to its resolved `@<kind:uuid|label>` form
 * by looking the resource up in the @param site. Mentions with no match are left as-is.
 */
export function resolveMentions(text: string, site: Site): string {
  return text.replace(unresolvedMentionRegex, (mention, kind, body) => {
    // Fold a resolved uuid into the mention, or bail to the original text.
    const fold = (uuid: string | undefined, label: string) =>
      uuid ? mkResolvedMention(kind, uuid, label) : mention;

    // A top-level resource named by the whole body.
    const resolve = (items: { name?: string | null; uuid: string }[]) =>
      fold(
        items.find((i) => i.name === unescapeMentionLabel(body))?.uuid,
        body
      );
    // A `site` component by name (component names keep their folder `/`s).
    const findComponent = (name: string) =>
      tryGetComponentByName(site, unescapeMentionLabel(name), {
        plasmicOnly: true,
      });

    const findVariant = (variants: Variant[], name: string, group: string) =>
      variants.find(
        (v) =>
          v.name === unescapeMentionLabel(name) &&
          getVariantGroupName(v) === unescapeMentionLabel(group)
      );

    switch (kind) {
      case "token":
        return resolve(site.styleTokens);
      case "animation":
        return resolve(site.animationSequences);
      case "page":
      case "component":
        return resolve(site.components.filter(isPlasmicComponent));
      case "globalVariant": {
        // Global variant: `groupName/variantName`.
        const parts = splitCompositeBody(body);
        if (!parts) {
          return mention;
        }
        return fold(
          findVariant(allGlobalVariants(site), parts.name, parts.owner)?.uuid,
          parts.name
        );
      }
      case "componentVariant": {
        // 3-tier `componentName/groupName/variantName` → `componentUuid/variantUuid`.
        // Split from the right so the component keeps its folder `/`s.
        const segments = body.split("/");
        const variantName = segments.pop();
        const groupName = segments.pop();
        if (!variantName || !groupName) {
          return mention;
        }
        const owner = findComponent(segments.join("/"));
        const variant =
          owner &&
          findVariant(allComponentVariants(owner), variantName, groupName);
        return fold(
          owner && variant ? `${owner.uuid}/${variant.uuid}` : undefined,
          variantName
        );
      }
      case "tpl": {
        // `componentName/tplName` → `componentUuid/tplUuid`.
        const parts = splitCompositeBody(body);
        if (!parts) {
          return mention;
        }
        const owner = findComponent(parts.owner);
        const tpl =
          owner && tryGetTplByName(owner, unescapeMentionLabel(parts.name));
        return fold(
          owner && tpl ? `${owner.uuid}/${tpl.uuid}` : undefined,
          parts.name
        );
      }
      default:
        return mention;
    }
  });
}

/** Labels of mentions in @param text that weren't resolved (e.g. the resource was deleted or renamed). */
export function findUnresolvedMentions(text: string): string[] {
  return [...text.matchAll(unresolvedMentionRegex)].map((m) =>
    unescapeMentionLabel(m.groups!.body)
  );
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
  candidates: { uuid: string }[],
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
        site.components,
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "token":
      return tryGetModelUiId(
        site.styleTokens,
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "animation":
      return tryGetModelUiId(
        site.animationSequences,
        uuid,
        MENTION_KIND_TYPE_TAG_MAP[kind]
      );
    case "globalVariant":
      return tryGetModelUiId(
        allGlobalVariants(site),
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
