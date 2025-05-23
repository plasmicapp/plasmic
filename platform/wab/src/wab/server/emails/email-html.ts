const reClass = / class="[^"]*"/g;
const reSvg = /(<svg|\.svg)/;

/** Remove classes, which don't work in email HTML. */
export function removeClassesFromEmailHtml(html: string) {
  return html.replace(reClass, "");
}

/** Verifies common email HTML issues. */
export function verifyEmailHtml(html: string) {
  // check no classes
  if (html.match(reClass)) {
    throw new Error("Email HTML should not have classes");
  }

  // check no SVGs
  if (html.match(reSvg)) {
    throw new Error("Email HTML should not have SVGs");
  }
}
