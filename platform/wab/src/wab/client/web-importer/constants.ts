import { ALL_CONTAINER_TAGS } from "@/wab/client/components/sidebar-tabs/HTMLAttributesSection";

export const BASE_VARIANT = "base";
export const SELF_SELECTOR = "self";

/**
 * Import these tags as the same tag. Everything else is imported as a div.
 */
export const tagsToImportAsSameTag = new Set([
  ...ALL_CONTAINER_TAGS,
  "img",
  "svg",
]);

/**
 * Skip these tags.
 */
export const ignoredTags = new Set([
  "script",
  "style",
  "head",
  "noscript",
  "source",
  "iframe",
  "br",
]);

/**
 * Do not try to nest divs under these or treat them as having flow layout.
 *
 * If you try to import a `p > div` via innerHTML, then you'll get two `p` tags
 * and a `div` that is hoisted outside the `p`!
 *
 * NOTE: I don't really know what counts as a paragraph - here are just some
 * common cases I can think of.
 */
export const paragraphTags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
]);

export const textStylesKeys = new Set<string>([
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textDecorationLine",
]);

export const containerStylesKeys = new Set<string>([
  "alignItems",
  "alignSelf",
  "background",
  // "backgroundColor",
  // "backgroundImage",
  "borderBottomColor",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderBottomStyle",
  "borderBottomWidth",
  "borderLeftColor",
  "borderLeftStyle",
  "borderLeftWidth",
  "borderRightColor",
  "borderRightStyle",
  "borderRightWidth",
  "borderTopColor",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderTopStyle",
  "borderTopWidth",
  "boxShadow",
  "cursor",
  "display",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "flexWrap",
  "rowGap",
  "columnGap",
  "justifyContent",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "textTransform",
  "objectFit",
  "opacity",
  "overflow",
  "overflowX",
  "overflowY",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "userSelect",
  "visibility",
  "zIndex",
]);

export const recognizedStylesKeys = new Set<string>([
  "display",
  "position",
  "flexDirection",
  "width",
  "height",
  "minHeight",
  "maxHeight",
  "minWidth",
  "maxWidth",
  "top",
  "left",
  "bottom",
  "right",
  ...textStylesKeys.values(),
  ...containerStylesKeys.values(),
]);

export const translationTable = {
  rowGap: "flexRowGap",
  columnGap: "flexColumnGap",
  paddingInlineStart: "paddingLeft",
  paddingInlineEnd: "paddingRight",
};

export const ignoredStyles = new Set<string>([
  "content",
  "boxSizing",
  "webkitBoxAlign",
  "webkitBoxPack",
  "webkitBoxFlex",
  "transition",
  "transformOrigin",
  "transitionProperty",
  "transitionDuration",
  "transform",
  "willChange",
  "objectPosition",
  "listStyle",
  "whiteSpace",
  "overflowAnchor",
  "textDecoration",
  "pointerEvents",
  "outline",
  "verticalAlign",
]);
