function tagRegexp(tag: string) {
  // The character after the tag must be either '>' or a space.
  return `(<${tag}(>|\\s[^>]*>))`;
}

const htmlTag = tagRegexp("html");
const headTag = tagRegexp("head");

// This regular expression attempts to match the opening <head> tag in an HTML document.
// In Next.js 13, the <head> tag may not be included in the document
// (see https://beta.nextjs.org/docs/routing/pages-and-layouts#root-layout-required).
// Therefore, we match the <html> tag and optionally the <head> tag.
//
// "s" flag allows dots to match newlines.
export const headRegexp = new RegExp(`${htmlTag}(.*?${headTag})?`, "s");
