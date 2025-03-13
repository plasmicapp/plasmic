import { pattern, regex } from "regex";

const pBoundary = pattern`(^ | \s)`; // Start of string or whitespace
const pEmailLocal = pattern`[\p{L}\p{N}._%+\-]+`; // Unicode letters, numbers, and email-safe symbols
const pDomainPart = pattern`[\p{L}\p{N}\-]+`; // Domain segment (letters, numbers, hyphens)
const pDot = pattern`\.`; // Strict dot (no extra whitespace)

const mentionEmailPattern = regex("g")`
  ${pBoundary}              # Preceding boundary (start or whitespace)
  @                         # Literal @ symbol
  (?<email>                 # Named capture group for the email
    ${pEmailLocal}          # Local part before @
    @                       # Separator
    ${pDomainPart}          # First domain segment
    (?: ${pDot} ${pDomainPart} )+  # One or more additional domain segments
  )
  (?= [\s .,!?] | $)        # Lookahead for ending boundary
`;

export function extractMentionedEmails(body: string) {
  return [...body.matchAll(mentionEmailPattern)].map(
    ([_whole, email]) => email
  );
}
