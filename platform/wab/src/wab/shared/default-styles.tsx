import { DEVFLAGS } from "@/wab/shared/devflags";
import { AddItemKey, WrapItemKey } from "@/wab/shared/add-item-keys";
import {
  CONTENT_LAYOUT,
  CONTENT_LAYOUT_FULL_BLEED,
} from "@/wab/shared/core/style-props";
import { RuleSet } from "@/wab/shared/model/classes";
import { camelCase, isEmpty, mapKeys } from "lodash";

const DEFAULT_INITIAL_STYLES = {
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

export type AddItemPrefs = Record<AddItemKey, RuleSet>;

function ruleSetToStyles(rs: RuleSet) {
  return mapKeys(rs.values, (_, key) => camelCase(key));
}

function makeDefaultStylesByItem(
  prefs: AddItemPrefs | undefined
): Partial<Record<AddItemKey | WrapItemKey, any>> {
  const maybeStyles = (key: AddItemKey, defaults: Record<string, string>) => {
    if (prefs?.[key]) {
      const styles = ruleSetToStyles(prefs[key]);
      if (!isEmpty(styles)) {
        return styles;
      }
    }
    return defaults;
  };
  return {
    [AddItemKey.box]: {
      position: "relative",
      display: "block",
      ...maybeStyles(AddItemKey.box, {
        ...DEFAULT_INITIAL_STYLES.sizing,
        ...DEFAULT_INITIAL_STYLES.container,
      }),
    },
    [AddItemKey.hstack]: {
      display: "flex",
      flexDirection: "row",
      position: "relative",
      alignItems: "stretch",
      justifyContent: "flex-start",
      ...maybeStyles(AddItemKey.hstack, {
        ...DEFAULT_INITIAL_STYLES.sizing,
        ...DEFAULT_INITIAL_STYLES.container,
      }),
    },
    [AddItemKey.vstack]: {
      display: "flex",
      flexDirection: "column",
      position: "relative",
      ...maybeStyles(AddItemKey.vstack, {
        ...DEFAULT_INITIAL_STYLES.sizing,
        ...DEFAULT_INITIAL_STYLES.container,
        ...DEFAULT_INITIAL_STYLES.vstacks,
      }),
    },
    [AddItemKey.grid]: {
      display: "grid",
      ...maybeStyles(AddItemKey.grid, {
        ...DEFAULT_INITIAL_STYLES.sizing,
        ...DEFAULT_INITIAL_STYLES.container,
      }),
    },
    [AddItemKey.section]: {
      position: "relative",
      width: CONTENT_LAYOUT_FULL_BLEED,
      ...CONTENT_LAYOUT_INITIALS,
      ...maybeStyles(AddItemKey.section, {
        paddingLeft: "0",
        paddingRight: "0",
      }),
    },
    [AddItemKey.stack]: {
      display: "flex",
      position: "relative",
      alignItems: "stretch",
      justifyContent: "flex-start",
      ...maybeStyles(AddItemKey.stack, {
        ...DEFAULT_INITIAL_STYLES.sizing,
        ...DEFAULT_INITIAL_STYLES.container,
      }),
    },
    [AddItemKey.text]: {
      position: "relative",
      ...DEFAULT_INITIAL_STYLES.sizing,
      ...DEFAULT_INITIAL_STYLES.text,
    },
    [AddItemKey.image]: {},
    [AddItemKey.icon]: {},
    [AddItemKey.link]: {},
    [AddItemKey.button]: {},
    [AddItemKey.textbox]: {
      ...DEFAULT_INITIAL_STYLES.sizing,
    },
    [AddItemKey.textarea]: {
      ...DEFAULT_INITIAL_STYLES.sizing,
    },
    [AddItemKey.password]: {
      ...DEFAULT_INITIAL_STYLES.sizing,
    },
    [AddItemKey.heading]: {
      ...DEFAULT_INITIAL_STYLES.sizing,
      ...DEFAULT_INITIAL_STYLES.text,
    },
    [AddItemKey.columns]: {
      ...maybeStyles(AddItemKey.columns, {
        ...DEFAULT_INITIAL_STYLES.sizing,
        ...DEFAULT_INITIAL_STYLES.container,
      }),
    },
    [AddItemKey.componentFrame]: {
      ...DEFAULT_INITIAL_STYLES.vstacks,
      width: "stretch",
      height: "wrap",
    },
    [AddItemKey.pageFrame]: {
      ...DEFAULT_INITIAL_STYLES.vstacks,
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
}

export const getSimplifiedStyles = (
  itemKey: AddItemKey | WrapItemKey,
  prefs: AddItemPrefs | undefined
) => {
  if (!DEVFLAGS.simplifiedLayout) {
    return {};
  }
  return getDefaultStyles(itemKey, prefs);
};

export function getDefaultStyles(
  itemKey: AddItemKey | WrapItemKey,
  prefs: AddItemPrefs | undefined
) {
  return makeDefaultStylesByItem(prefs)[itemKey] || {};
}
