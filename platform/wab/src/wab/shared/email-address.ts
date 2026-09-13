export interface ParsedEmailAddress {
  /** Exactly what the user submitted, but with whitespace trimmed. */
  original: string;
  normalized: string;
  normalizedLocalPart: string;
  normalizedDomain: string;
}

export function parseEmailAddress(input: string): ParsedEmailAddress | null {
  const original = input.trim();
  if (original.length > 254) {
    return null;
  }

  const match = original.match(/^(\S+)@(\S+\.\S*[^\s.])$/);
  if (!match) {
    return null;
  }

  const normalizedLocalPart = match[1].toLowerCase();
  const normalizedDomain = match[2].toLowerCase();
  return {
    original,
    normalized: `${normalizedLocalPart}@${normalizedDomain}`,
    normalizedLocalPart,
    normalizedDomain,
  };
}
