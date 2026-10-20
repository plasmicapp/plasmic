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

const SITE_SCOPED_TAGS = [
  "Component",
  "StyleToken",
  "AnimationSequence",
  "GlobalVariant",
] as const satisfies readonly SiteScopedTag[];

export const COMPONENT_SCOPED_MENTION_TAGS = [
  "Variant",
  "Tpl",
] as const satisfies readonly ComponentScopedTag[];

export const MENTION_TAGS = [
  ...SITE_SCOPED_TAGS,
  ...COMPONENT_SCOPED_MENTION_TAGS,
];
export type MentionTag = (typeof MENTION_TAGS)[number];

export function isMentionTag(tag: string): tag is MentionTag {
  return includes(MENTION_TAGS, tag);
}

export function isComponentScopedMentionTag(
  tag: MentionTag,
): tag is Extract<MentionTag, ComponentScopedTag> {
  return includes(COMPONENT_SCOPED_MENTION_TAGS, tag);
}
