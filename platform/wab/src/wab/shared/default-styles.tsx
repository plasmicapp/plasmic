import { DEVFLAGS } from "../devflags";
import { AddItemKey, WrapItemKey } from "./add-item-keys";
import { CONTENT_LAYOUT, CONTENT_LAYOUT_FULL_BLEED } from "./core/style-props";

const DEFAULT_STYLES = {
  sizing: {
    width: "stretch",
    height: "wrap",
    maxWidth: "100%",
  },
  text: {},
  vstacks: {
    justifyContent: "flex-start",
    alignItems: "center",
  },
  container: {
    paddingLeft: "8px",
    paddingRight: "8px",
    paddingBottom: "8px",
    paddingTop: "8px",
  },
};

export const CONTENT_LAYOUT_INITIALS = {
  display: CONTENT_LAYOUT,
  "align-content": "flex-start",
  "justify-items": "center",
};

const DEFAULT_STYLES_BY_ITEM: Partial<Record<AddItemKey | WrapItemKey, any>> = {
  [AddItemKey.box]: {
    position: "relative",
    display: "block",
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.container,
  },
  [AddItemKey.hstack]: {
    display: "flex",
    flexDirection: "row",
    position: "relative",
    alignItems: "stretch",
    justifyContent: "flex-start",
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.container,
  },
  [AddItemKey.vstack]: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.container,
    ...DEFAULT_STYLES.vstacks,
  },
  [AddItemKey.grid]: {
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.container,
  },
  [AddItemKey.section]: {
    position: "relative",
    width: CONTENT_LAYOUT_FULL_BLEED,
    ...CONTENT_LAYOUT_INITIALS,
    ...DEFAULT_STYLES.container,
    paddingLeft: "0",
    paddingRight: "0",
  },
  [AddItemKey.stack]: {
    display: "flex",
    position: "relative",
    alignItems: "stretch",
    justifyContent: "flex-start",
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.container,
  },
  [AddItemKey.text]: {
    position: "relative",
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.text,
  },
  [AddItemKey.image]: {},
  [AddItemKey.icon]: {},
  [AddItemKey.link]: {},
  [AddItemKey.button]: {},
  [AddItemKey.textbox]: {
    ...DEFAULT_STYLES.sizing,
  },
  [AddItemKey.textarea]: {
    ...DEFAULT_STYLES.sizing,
  },
  [AddItemKey.password]: {
    ...DEFAULT_STYLES.sizing,
  },
  [AddItemKey.heading]: {
    ...DEFAULT_STYLES.sizing,
    ...DEFAULT_STYLES.text,
  },
  [AddItemKey.columns]: {
    ...DEFAULT_STYLES.container,
  },
  [AddItemKey.componentFrame]: {
    ...DEFAULT_STYLES.vstacks,
    width: "stretch",
    height: "wrap",
  },
  [AddItemKey.pageFrame]: {
    ...DEFAULT_STYLES.vstacks,
  },
  [WrapItemKey.hstack]: {
    display: "flex",
    flexDirection: "row",
    position: "relative",
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  [WrapItemKey.vstack]: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-start",
  },
};

export const getSimplifiedStyles = (itemKey: AddItemKey | WrapItemKey) => {
  if (!DEVFLAGS.simplifiedLayout) {
    return {};
  }
  return getDefaultStyles(itemKey);
};

export function getDefaultStyles(itemKey: AddItemKey | WrapItemKey) {
  const sty = DEFAULT_STYLES_BY_ITEM[itemKey] || {};
  if (itemKey === AddItemKey.text || itemKey === AddItemKey.heading) {
    sty.maxWidth = "100%";
  }
  return sty;
}
