// The following code was copied/adapted from:
// https://github.com/facebook/react/blob/cb3404a0ccd8b5edf5d2b90bd844742090e38f42/packages/react-dom-bindings/src/client/validateDOMNesting.js#L436

export const ANCESTOR_INFO_KEYS = [
  "current",
  "formTag",
  "aTagInScope",
  "buttonTagInScope",
  "nobrTagInScope",
  "pTagInButtonScope",
  "listItemTagAutoclosing",
  "dlItemTagAutoclosing",
  "containerTagInScope",
];

export interface AncestorInfo<InfoType> {
  tag?: string | null;
  current?: InfoType | null;
  formTag?: InfoType | null;
  aTagInScope?: InfoType | null;
  buttonTagInScope?: InfoType | null;
  nobrTagInScope?: InfoType | null;
  pTagInButtonScope?: InfoType | null;
  listItemTagAutoclosing?: InfoType | null;
  dlItemTagAutoclosing?: InfoType | null;
  containerTagInScope?: InfoType | null;
}

// https://html.spec.whatwg.org/multipage/syntax.html#special
const specialTags = [
  "address",
  "applet",
  "area",
  "article",
  "aside",
  "base",
  "basefont",
  "bgsound",
  "blockquote",
  "body",
  "br",
  "button",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dir",
  "div",
  "dl",
  "dt",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "iframe",
  "img",
  "input",
  "isindex",
  "li",
  "link",
  "listing",
  "main",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "nav",
  "noembed",
  "noframes",
  "noscript",
  "object",
  "ol",
  "p",
  "param",
  "plaintext",
  "pre",
  "script",
  "section",
  "select",
  "source",
  "style",
  "summary",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
  "wbr",
  "xmp",
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
const inScopeTags = [
  "applet",
  "caption",
  "html",
  "table",
  "td",
  "th",
  "marquee",
  "object",
  "template",

  // https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
  // TODO: Distinguish by namespace here -- for <title>, including it here
  // errs on the side of fewer warnings
  "foreignObject",
  "desc",
  "title",
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope
const buttonScopeTags = [...inScopeTags, "button"];

// https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags
const impliedEndTags = [
  "dd",
  "dt",
  "li",
  "option",
  "optgroup",
  "p",
  "rp",
  "rt",
];

export function updatedAncestorInfo<InfoType>(
  oldInfo: AncestorInfo<InfoType>,
  info: InfoType,
  tag: string
) {
  const newInfo = { ...oldInfo, tag };

  if (inScopeTags.indexOf(tag) !== -1) {
    newInfo.aTagInScope = null;
    newInfo.buttonTagInScope = null;
    newInfo.nobrTagInScope = null;
  }
  if (buttonScopeTags.indexOf(tag) !== -1) {
    newInfo.pTagInButtonScope = null;
  }

  // See rules for 'li', 'dd', 'dt' start tags in
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
  if (
    specialTags.indexOf(tag) !== -1 &&
    tag !== "address" &&
    tag !== "div" &&
    tag !== "p"
  ) {
    newInfo.listItemTagAutoclosing = null;
    newInfo.dlItemTagAutoclosing = null;
  }

  newInfo.current = info;
  if (tag === "form") {
    newInfo.formTag = info;
  }
  if (tag === "a") {
    newInfo.aTagInScope = info;
  }
  if (tag === "button") {
    newInfo.buttonTagInScope = info;
  }
  if (tag === "nobr") {
    newInfo.nobrTagInScope = info;
  }
  if (tag === "p") {
    newInfo.pTagInButtonScope = info;
  }
  if (tag === "li") {
    newInfo.listItemTagAutoclosing = info;
  }
  if (tag === "dd" || tag === "dt") {
    newInfo.dlItemTagAutoclosing = info;
  }
  return newInfo;
}

export function getInvalidAncestor<InfoType>(
  childTag: string,
  ancestorInfo: AncestorInfo<InfoType>
) {
  if (ancestorInfo.tag && !isTagValidWithParent(childTag, ancestorInfo.tag)) {
    return ancestorInfo.current;
  }
  return findInvalidAncestorForTag(childTag, ancestorInfo);
}

export function isTagValidWithParent(tag: string, parentTag: string): boolean {
  // First, let's check if we're in an unusual parsing mode...
  switch (parentTag) {
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
    case "select":
      return tag === "option" || tag === "optgroup" || tag === "#text";
    case "optgroup":
      return tag === "option" || tag === "#text";
    // Strictly speaking, seeing an <option> doesn't mean we're in a <select>
    // but
    case "option":
      return tag === "#text";
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
    // No special behavior since these rules fall back to "in body" mode for
    // all except special table nodes which cause bad parsing behavior anyway.

    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
    case "tr":
      return (
        tag === "th" ||
        tag === "td" ||
        tag === "style" ||
        tag === "script" ||
        tag === "template"
      );
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
    case "tbody":
    case "thead":
    case "tfoot":
      return (
        tag === "tr" ||
        tag === "style" ||
        tag === "script" ||
        tag === "template"
      );
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
    case "colgroup":
      return tag === "col" || tag === "template";
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
    case "table":
      return (
        tag === "caption" ||
        tag === "colgroup" ||
        tag === "tbody" ||
        tag === "tfoot" ||
        tag === "thead" ||
        tag === "style" ||
        tag === "script" ||
        tag === "template"
      );
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
    case "head":
      return (
        tag === "base" ||
        tag === "basefont" ||
        tag === "bgsound" ||
        tag === "link" ||
        tag === "meta" ||
        tag === "title" ||
        tag === "noscript" ||
        tag === "noframes" ||
        tag === "style" ||
        tag === "script" ||
        tag === "template"
      );
    // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
    case "html":
      return tag === "head" || tag === "body" || tag === "frameset";
    case "frameset":
      return tag === "frame";
    case "#document":
      return tag === "html";
  }

  // Probably in the "in body" parsing mode, so we outlaw only tag combos
  // where the parsing rules cause implicit opens or closes to be added.
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return (
        parentTag !== "h1" &&
        parentTag !== "h2" &&
        parentTag !== "h3" &&
        parentTag !== "h4" &&
        parentTag !== "h5" &&
        parentTag !== "h6"
      );

    case "rp":
    case "rt":
      return impliedEndTags.indexOf(parentTag) === -1;

    case "body":
    case "caption":
    case "col":
    case "colgroup":
    case "frameset":
    case "frame":
    case "head":
    case "html":
    case "tbody":
    case "td":
    case "tfoot":
    case "th":
    case "thead":
    case "tr":
      // These tags are only valid with a few parents that have special child
      // parsing rules -- if we're down here, then none of those matched and
      // so we allow it only if we don't know what the parent is, as all other
      // cases are invalid.
      return parentTag == null;
  }

  return true;
}

export function findInvalidAncestorForTag<InfoType>(
  tag: string,
  ancestorInfo: AncestorInfo<InfoType>
): InfoType | null | undefined {
  switch (tag) {
    case "address":
    case "article":
    case "aside":
    case "blockquote":
    case "center":
    case "details":
    case "dialog":
    case "dir":
    case "div":
    case "dl":
    case "fieldset":
    case "figcaption":
    case "figure":
    case "footer":
    case "header":
    case "hgroup":
    case "main":
    case "menu":
    case "nav":
    case "ol":
    case "p":
    case "section":
    case "summary":
    case "ul":
    case "pre":
    case "listing":
    case "table":
    case "hr":
    case "xmp":
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return ancestorInfo.pTagInButtonScope;

    case "form":
      return ancestorInfo.formTag || ancestorInfo.pTagInButtonScope;

    case "li":
      return ancestorInfo.listItemTagAutoclosing;

    case "dd":
    case "dt":
      return ancestorInfo.dlItemTagAutoclosing;

    case "button":
      return ancestorInfo.buttonTagInScope;

    case "a":
      // Spec says something about storing a list of markers, but it sounds
      // equivalent to this check.
      return ancestorInfo.aTagInScope;

    case "nobr":
      return ancestorInfo.nobrTagInScope;
  }

  return null;
}
