import { ApiComment, UserId } from "@/wab/shared/ApiSchema";
import { MENTION_REGEX } from "@/wab/shared/mentions";
import { pattern, regex } from "regex";

/* https://github.github.com/gfm/#email-address
 */
const pEmailLocal = pattern`[a-zA-Z0-9.!#$%&'+*\/=?^_\`\{\|\}~\-]+`; // letters, numbers, and email-safe symbols
const pDomainPart = pattern`[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?`; // Domain segment (letters, numbers, hyphens)
const pDot = pattern`\.`;

export const USER_MENTION_REGEX = regex`
  ^
  ${pEmailLocal}                 # Local part before @
  @                              # Separator
  ${pDomainPart}                 # First domain segment
  (?: ${pDot} ${pDomainPart} )*  # Zero or more additional domain segments
  $
`;

// Reactions using unicode emojis hex codes
export const REACTIONS = {
  "1f44d": "👍",
  "1f44f": "👏",
  "1f4af": "💯",
  "2705": "✅",
  "1f525": "🔥",
  "274c": "❌",
  "1f44e": "👎",
};

export function extractMentionedEmails(body: string): string[] {
  return [...body.matchAll(MENTION_REGEX)]
    .map((match) => match.groups!.raw)
    .filter((raw) => USER_MENTION_REGEX.test(raw));
}

export function hasUserParticipatedInThread(
  userId: UserId,
  threadComments: ApiComment[],
): boolean {
  return threadComments.some((tc) => tc.createdById === userId);
}
