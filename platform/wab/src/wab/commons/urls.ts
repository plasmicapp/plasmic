/**
 * https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
 */
export function isAbsoluteUrl(url: string) {
  return url.match(/^(?:[a-z]+:)?\/\//i);
}

/**
 * https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
 */
export function isSameOriginUrl(url: string) {
  return (
    new URL(document.baseURI).origin === new URL(url, document.baseURI).origin
  );
}

/**
 * Encodes a list of key-value params as a URI friendly string.
 * Can be readily used as a query or hash string by appending ? or # before it.
 */
export function encodeUriParams(
  params: [key: string, value: unknown][]
): string {
  // Note we purposely use encodeUriComponent instead of URLSearchParams
  // https://stackoverflow.com/questions/59889140/different-output-from-encodeuricomponent-vs-urlsearchparams
  return params
    .map(([key, value]) => `${key}=${encodeURIComponent(`${value}`)}`)
    .join("&");
}
