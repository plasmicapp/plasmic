import { ParsedEmailAddress } from "@/wab/shared/email-address";

export function hasBlockedEmailDomain(
  _parsedEmail: ParsedEmailAddress,
): boolean {
  return false;
}
