import { capitalize, decapitalize, underscored } from "underscore.string";

export function capitalizeFirst(text: string) {
  return capitalize(text);
}

export function decapitalizeFirst(text: string) {
  return decapitalize(text);
}

/**
 * From https://stackoverflow.com/questions/7930751/regexp-for-subdomain
 */
export function isValidSubdomainPart(subdomain: string) {
  return subdomain.match(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/);
}

/**
 * Converts a string like_this or or --like-this or likeThis to a human-friendly label "Like this".
 *
 * Similar to undercore.string.humanize, but doesn't remove _id/Id at the end.
 * Also, we fix "id" to be "ID".
 */
export function smartHumanize(text: string) {
  return capitalize(underscored(text).replace(/_/g, " ").trim()).replace(
    /\bid\b/gi,
    "ID"
  );
}
