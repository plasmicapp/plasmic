import type {
  ParsedComponentScopedUiId,
  ParsedSiteScopedUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { USER_MENTION_REGEX } from "@/wab/shared/comments-utils";
import {
  MENTION_TAGS,
  MentionTag,
  isComponentScopedMentionTag,
  isMentionTag,
} from "@/wab/shared/mentions";
import { regex } from "regex";

type ParsedMention =
  | { type: "user"; email: string }
  | ParsedSiteScopedUiId
  | ParsedComponentScopedUiId;

export function mkMentionRaw(mention: ParsedMention): string {
  switch (mention.type) {
    case "user":
      return mention.email;
    case "SiteScoped":
      return `${mention.tag}:${mention.uuid}`;
    case "ComponentScoped":
      return `${mention.tag}:${mention.componentUuid}/${mention.uuid}`;
  }
}

export function parseMention(raw: string): ParsedMention | undefined {
  if (USER_MENTION_REGEX.test(raw)) {
    return { type: "user", email: raw };
  }

  const modelMentionRaw = MODEL_MENTION_REGEX.exec(raw);
  if (!modelMentionRaw) {
    return undefined;
  }
  const { tag, key } = modelMentionRaw.groups!;
  return isMentionTag(tag) ? parseModelMention(tag, key) : undefined;
}

const MODEL_MENTION_REGEX = regex`
  ^ (?<tag> ${new RegExp(MENTION_TAGS.join("|"))} ) : (?<key> .+ ) $
`;

function parseModelMention(
  tag: MentionTag,
  key: string,
): ParsedSiteScopedUiId | ParsedComponentScopedUiId | undefined {
  const parts = key.split("/");
  if (isComponentScopedMentionTag(tag)) {
    const [componentUuid, uuid] = parts;
    return parts.length === 2 && componentUuid && uuid
      ? { type: "ComponentScoped", tag, componentUuid, uuid }
      : undefined;
  }
  const [uuid] = parts;
  return parts.length === 1 && uuid
    ? { type: "SiteScoped", tag, uuid }
    : undefined;
}
