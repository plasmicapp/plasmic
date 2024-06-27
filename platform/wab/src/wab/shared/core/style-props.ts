import { DeepReadonly } from "@/wab/commons/types";
import {
  FAKE_CSS_PROPS,
  PLASMIC_DISPLAY_NONE,
  tryGetCssInitial,
} from "@/wab/shared/css";
import { standardCorners, standardSides } from "@/wab/shared/geom";
import { RuleSet } from "@/wab/shared/model/classes";
import L from "lodash";

export const POSITIONING_PROPS = [
  "position",
  "top",
  "left",
  "bottom",
  "right",
  "z-index",
  "align-self",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "order",
];

export const SIZE_PROPS = [
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
];

export const POSITIONING_SIZE_PROPS = [...POSITIONING_PROPS, ...SIZE_PROPS];

export const GRID_CHILD_PROPS = [
  "grid-row-start",
  "grid-row-end",
  "grid-column-start",
  "grid-column-end",
];

// Props to extract from root to TplComponent when extracting component
export const EXTRACT_COMPONENT_PROPS = [
  ...POSITIONING_PROPS,
  ...GRID_CHILD_PROPS,
];

const TRANSFORM_PROPS = [
  "transform",
  "transform-origin",
  "perspective-origin",
  "backface-visibility",
  "perspective",
];

const TRANSITION_PROPS = [
  "transition-property",
  "transition-timing-function",
  "transition-duration",
  "transition-delay",
];

// Valid props to have on a TplComponent
export const TPL_COMPONENT_PROPS = [
  ...POSITIONING_SIZE_PROPS,
  "align-self",
  "flex-grow",
  "flex-shrink",
  ...GRID_CHILD_PROPS,
  "opacity",
  PLASMIC_DISPLAY_NONE, // for setting `display: none`
  // Transform is another form of positioning
  ...TRANSFORM_PROPS,

  // If we can tweak transform and opacity, we should allow transition
  // to animate the effect
  ...TRANSITION_PROPS,
];

// When we want to wrap a node with another node, the new parent node
// should take over these style props from the child node
export const WRAP_AS_PARENT_PROPS = POSITIONING_PROPS;

export const GAP_PROPS = ["flex-column-gap", "flex-row-gap"];

export const FAKE_FLEX_CONTAINER_PROPS = [
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-content",
];

export const inheritableTypographyCssProps = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "color",
  "text-align",
  "text-transform",
  "line-height",
  "letter-spacing",
  "white-space",
  "user-select",
];

export const nonInheritableTypographCssProps = [
  "text-decoration-line",
  "text-overflow",
];

export const typographyCssProps = [
  ...inheritableTypographyCssProps,
  ...nonInheritableTypographCssProps,
];

export const transitionProps = [
  "transition-property",
  "transition-timing-function",
  "transition-duration",
  "transition-delay",
];

export const listStyleCssProps = ["list-style-type", "list-style-position"];

// Slots can take all the typography styles, as well as "overflow" to
// make sure text-overflow works, transitions, and opacity.
export const slotCssProps = [
  ...typographyCssProps,
  "overflow",
  "opacity",
  ...transitionProps,
];
export const inheritableCssProps = [...inheritableTypographyCssProps];

export const imageCssProps = ["object-fit", "object-position"];

// css props to reset at component boundaries.
// We are excluding user-select, as it is often relied upon for global effects
// like disabling text selection during drag and drop.
export const componentRootResetProps = [
  ...L.without(inheritableTypographyCssProps, "user-select"),
];
export const defaultCopyableStyleNames = [
  ...SIZE_PROPS,
  ...standardSides.map((s) => `margin-${s}`),
  ...standardSides.map((s) => `padding-${s}`),
  ...standardSides.map((s) => `border-${s}-style`),
  ...standardSides.map((s) => `border-${s}-width`),
  ...standardSides.map((s) => `border-${s}-color`),
  ...standardCorners.map((c) => `border-${c}-radius`),
  ...typographyCssProps,
  "background",
  "box-shadow",
  "opacity",
  "cursor",
  "flex-column-gap",
  "flex-row-gap",
  ...FAKE_FLEX_CONTAINER_PROPS,
];
export const nonExtractableStyleNames = new Set([
  "left",
  "right",
  "top",
  "bottom",
  "position",
]);
export const nonResettableStyleNames = new Set([
  "left",
  "right",
  "top",
  "bottom",
  "position",
]);

export const gridCssProps = [
  "grid-template-rows",
  "grid-template-columns",
  "grid-row-gap",
  "grid-column-gap",
  "grid-auto-rows",
  "grid-auto-columns",
];

export const gridChildProps = [
  "grid-row-start",
  "grid-row-end",
  "grid-column-start",
  "grid-column-end",
];

export const flexChildProps = ["align-self"];

export const contentLayoutProps = ["justify-items", "align-content"];
export const contentLayoutChildProps = ["justify-self"];

export const plasmicImgAttrStyles = [
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
];

// Style props that we use in the canvas when rendering `ValNode`s
export const styleNamesForValNodes = [
  "display",

  // We use styles like `width` and `height` for passing `displayWidth` and
  // `displayHeight` to the PlasmicImg
  ...plasmicImgAttrStyles,

  ...gridCssProps,
];

// Props to ignore when checking if a text node can be converted
// into a plaintext node
export const ignoredConvertablePlainTextProps = [
  "top",
  "left",
  "bottom",
  "right",
  "width",
  "height",
  "position",
];

export const colorProps = [
  "color",
  "border-left-color",
  "border-right-color",
  "border-top-color",
  "border-bottom-color",
];

export const spacingProps = [
  "left",
  "top",
  "right",
  "bottom",
  "width",
  "height",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "padding-bottom",
  "flex-column-gap",
  "flex-row-gap",
];

export const opacityProps = ["opacity"];

export const fontSizeProps = ["font-size"];

export const lineHeightProps = ["line-height"];

export function filterExtractableStyles(styleNames: string[]) {
  return styleNames.filter((s) => !nonExtractableStyleNames.has(s));
}

export function filterResettableStyles(styleNames: string[]) {
  return styleNames.filter((s) => !nonResettableStyleNames.has(s));
}

export function getAllDefinedStyles(rs: DeepReadonly<RuleSet>) {
  return Object.keys(rs.values);
}

// Mixin props that are always directly resolved instead of referenced
// as css props
export const ALWAYS_RESOLVE_MIXIN_PROPS = [
  "flex-column-gap",
  "flex-row-gap",
  "background",
];

/**
 * Checks that the style prop is something Plasmic can handle (reflect correctly
 * in style controls, update correctly, etc.).
 *
 * E.g., text-decoration is not, but text-decoration-line is.
 *
 * For now, this simply checks that the style prop is something we can find a
 * CSS initial for. This excludes most shorthand (compound) style props.
 */
export function isValidStyleProp(prop: string) {
  return (
    FAKE_CSS_PROPS.includes(prop) ||
    ["-webkit-mask-image", "-webkit-mask-size", "-webkit-mask-repeat"].includes(
      prop
    ) ||
    tryGetCssInitial(prop, undefined) !== undefined
  );
}

export function crossGapProp(prop: "flex-column-gap" | "flex-row-gap") {
  return prop === "flex-column-gap" ? "flex-row-gap" : "flex-column-gap";
}

/*
 * Constants for content layout
 */
// value for `display:` to turn on content layout mode
export const CONTENT_LAYOUT = "plasmic-content-layout";

// values for `width` as a content layout child
export const CONTENT_LAYOUT_WIDE = "plasmic-layout-wide";
export const CONTENT_LAYOUT_FULL_BLEED = "plasmic-layout-full-bleed";

export const CONTENT_LAYOUT_WIDTH_OPTIONS = [
  CONTENT_LAYOUT_WIDE,
  CONTENT_LAYOUT_FULL_BLEED,
];

// These prop values are only props in ThemeLayoutSettings.rs
export const CONTENT_LAYOUT_STANDARD_WIDTH_PROP = "plasmic-standard-width";
export const CONTENT_LAYOUT_WIDE_WIDTH_PROP = "plasmic-wide-width";
export const CONTENT_LAYOUT_VIEWPORT_GAP_PROP = "plasmic-viewport-gap";
export const CONTENT_LAYOUT_CONTAINER_PADDING_PROP =
  "plasmic-container-padding";
export const CONTENT_LAYOUT_DEFAULTS = {
  [CONTENT_LAYOUT_STANDARD_WIDTH_PROP]: "800px",
  [CONTENT_LAYOUT_WIDE_WIDTH_PROP]: "1280px",
  [CONTENT_LAYOUT_VIEWPORT_GAP_PROP]: "16px",
  [CONTENT_LAYOUT_CONTAINER_PADDING_PROP]: "8px",
};
