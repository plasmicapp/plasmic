import type {
  ComponentScopedTag,
  SiteScopedTag,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { includes } from "lodash";
import { regex } from "regex";

export const MENTION_REGEX = regex("g")`
  @<                        # Start of mention @<
  (?<raw> [^>]+ )           # What the mention stores
  >                         # Ends at closing angle bracket >
`;

export const SITE_SCOPED_MENTION_TAGS = [
  "Component",
  "StyleToken",
  "DataToken",
  "ImageAsset",
  "Mixin",
  "AnimationSequence",
  "GlobalVariantGroup",
  "GlobalVariant",
] as const satisfies readonly SiteScopedTag[];

export type SiteScopedMentionTag = (typeof SITE_SCOPED_MENTION_TAGS)[number];

export const COMPONENT_SCOPED_MENTION_TAGS = [
  "Variant",
  "PropParam",
  "StateParam",
  "ComponentServerQuery",
  "ComponentDataQuery",
  "Tpl",
] as const satisfies readonly ComponentScopedTag[];

export type ComponentScopedMentionTag =
  (typeof COMPONENT_SCOPED_MENTION_TAGS)[number];

export const MENTION_TAGS = [
  ...SITE_SCOPED_MENTION_TAGS,
  ...COMPONENT_SCOPED_MENTION_TAGS,
];
export type MentionTag = (typeof MENTION_TAGS)[number];

export function isMentionTag(tag: string): tag is MentionTag {
  return includes(MENTION_TAGS, tag);
}

export function isComponentScopedMentionTag(
  tag: MentionTag,
): tag is ComponentScopedMentionTag {
  return includes(COMPONENT_SCOPED_MENTION_TAGS, tag);
}
