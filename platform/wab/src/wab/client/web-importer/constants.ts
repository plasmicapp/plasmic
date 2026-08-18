import { animationStyleKeys } from "@/wab/shared/css/animations";
import { textBlockTags, textInlineTags } from "@/wab/shared/html";

export const BASE_VARIANT = "base";
export const SELF_SELECTOR = "self";

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
 * Tags that can be imported as a text element (a text-type TplTag)
 */
export const textEligibleTags = new Set([
  ...textInlineTags,
  ...textBlockTags,
  "p",
]);

const textStylesKeys = new Set<string>([
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textDecorationLine",
]);

export const layoutStyleKeys = [
  "display",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "flexWrap",
  "rowGap",
  "columnGap",
  "gridRowGap",
  "gridColumnGap",
  "justifyContent",
  "alignItems",
];

const containerStylesKeys = new Set<string>([
  ...layoutStyleKeys,
  "alignSelf",
  "background",
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
  "transform",
  "transformOrigin",
  ...animationStyleKeys,
  ...textStylesKeys.values(),
  ...containerStylesKeys.values(),
]);

export const translationTable = {
  paddingInlineStart: "paddingLeft",
  paddingInlineEnd: "paddingRight",
};

// Keys here must be normalized (camelCase / translated), e.g. "webkitAnimation" not "-webkit-animation".
export const ignoredStyles = new Set<string>([
  "content",
  "boxSizing",
  "webkitAnimation",
  "webkitBoxAlign",
  "webkitBoxPack",
  "webkitBoxFlex",
  "transition",
  "transitionProperty",
  "transitionDuration",
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
