import { Arg, Component, Expr, Mixin, Param, Site, Theme } from "@/wab/classes";
import { arrayEqIgnoreOrder, ensure } from "@/wab/common";
import { makeVariantComboSorter } from "@/wab/shared/variant-sort";
import { VariantCombo } from "@/wab/shared/Variants";
import { TplVisibility } from "@/wab/shared/visibility-utils";
import { SlotSelection } from "@/wab/slots";
import L from "lodash";

// The stack of variant settings (from lowest priority to highest) and the
// the value in each variant setting. Must be non empty.
export type VariantSettingSourceStack = Array<VariantSettingSource>;

export type VariantSettingSource =
  | ThemeSource
  | ThemeTagSource
  | ArgSource
  | MixinSource
  | StyleSource
  | AttrSource
  | VisibilitySource
  | SlotSource
  | SlotSelectionSource
  | TextSource
  | ColumnsConfigSource;

export interface ThemeSource {
  type: "theme";
  theme: Theme;
  prop: string;
  value: string;
}

export interface ThemeTagSource {
  type: "themeTag";
  theme: Theme;
  selector: string;
  prop: string;
  value: string;
}

export interface ArgSource {
  type: "arg";
  combo: VariantCombo;
  component: Component;
  value: Arg;
}

export interface VisibilitySource {
  type: "visibility";
  combo: VariantCombo;
  value: TplVisibility;
}

export interface MixinSource {
  type: "mixin";
  combo: VariantCombo;
  mixin: Mixin;
  prop: string;
  value: string;
}

export interface StyleSource {
  type: "style";
  combo: VariantCombo;
  value: string;
  prop: string;
  isDerived?: boolean;
}

export interface AttrSource {
  type: "attr";
  combo: VariantCombo;
  value: Expr;
  attr: string;
}

export interface TextSource {
  type: "text";
  combo: VariantCombo;
  value: string;
}

export interface SlotSource {
  type: "slot";
  combo: VariantCombo;
  value: string;
  prop: string;
  mixin?: Mixin;
  param: Param;
}

export interface SlotSelectionSource {
  type: "sel";
  value: string;
  prop: string;
  sel: SlotSelection;
  slotCombo: VariantCombo;
}

export interface ColumnsConfigSource {
  type: "columnsConfig";
  combo: VariantCombo;
  value: string;
}

export type DefinedIndicatorType =
  // Used for frame settings or Mixin settings, which is not bound to variants at all.
  | {
      source: "setNonVariable";
      prop: string;
      value: string;
      isDefaultTheme?: boolean;
    }
  | {
      // Value set in the current target variant is the highest priority
      source: "set";
      stack: VariantSettingSourceStack;

      // targetSource is always the last item of the `stack`
      targetSource: VariantSettingSource;
    }
  | {
      // Value derived from some other value set in the stack
      source: "derived";
      stack: VariantSettingSourceStack;

      // targetSource is always the last item of the `stack`
      targetSource: VariantSettingSource;
    }
  // string[] | Mixin for css prop
  // Expr for Element's attr
  // Arg for TplComponent's arg
  | {
      // "otherVariants" is used when the prop is not set in target, or the
      // target doesn't have highest priority.
      source: "otherVariants";
      // The stack of variant settings (from lowest priority to highest) and the
      // the value in each variant setting. Must be non empty.
      stack: VariantSettingSourceStack;
      // The member of VariantSettingSourceStack that belongs to the
      // current target
      targetSource: VariantSettingSource | undefined;
      // Whether the target variants has highest priority, in which case, we
      // can say the property is "inherited" from a variant. Otherwise, we
      // should just say "set".
      targetHasHighestPriority: boolean;
    }
  | {
      // Set by a mixin used in the target variant, which has the
      // highest priority
      source: "mixin";
      mixin: Mixin;
      stack: VariantSettingSourceStack;
      targetSource: VariantSettingSource | undefined;
    }
  | {
      // Set by theme; no other value is set for any other variant.   stack
      // is a single-item list with just the ThemeSource.
      source: "theme";
      theme: Theme;
      stack: VariantSettingSourceStack;
    }
  | {
      // Inherited via TplSlot or SlotSelection
      source: "slot";
      stack: VariantSettingSourceStack;
    }
  | { source: "none" }
  | {
      // Value is always set
      source: "invariantable";
    };

export function isIndicatorExplicitlySet(indicator: DefinedIndicatorType) {
  return indicator.source === "set" || indicator.source === "setNonVariable";
}

export const computeDefinedIndicator = (
  site: Site,
  component: Component,
  sources: VariantSettingSourceStack | undefined,
  currentCombo: VariantCombo
): DefinedIndicatorType => {
  if (sources === undefined || sources.length === 0) {
    return { source: "none" };
  } else {
    const targetSource = L.last(
      sources.filter(
        (s) =>
          s.type !== "theme" &&
          s.type !== "themeTag" &&
          s.type !== "slot" &&
          s.type !== "sel" &&
          arrayEqIgnoreOrder(s.combo, currentCombo)
      )
    );
    const lastSource = ensure(L.last(sources), "sources is empty");
    if (lastSource.type === "theme" || lastSource.type === "themeTag") {
      return { source: "theme", theme: lastSource.theme, stack: sources };
    } else if (lastSource.type === "slot" || lastSource.type === "sel") {
      return {
        source: "slot",
        stack: sources,
      };
    }
    if (arrayEqIgnoreOrder(lastSource.combo, currentCombo)) {
      if (lastSource.type === "mixin") {
        return {
          source: "mixin",
          mixin: lastSource.mixin,
          stack: sources,
          targetSource,
        };
      } else if (lastSource.type === "style" && lastSource.isDerived) {
        return {
          source: "derived",
          stack: sources,
          targetSource: ensure(targetSource, "expected a target source"),
        };
      } else {
        return {
          source: "set",
          stack: sources,
          targetSource: ensure(targetSource, "expected a target source"),
        };
      }
    }
    const sorter = makeVariantComboSorter(site, component);
    return {
      source: "otherVariants",
      stack: sources,
      targetSource,
      targetHasHighestPriority:
        sorter(currentCombo) >= sorter(lastSource.combo),
    };
  }
};

/**
 * Returns true if some DefinedIndicatorType states that the source of the
 * value is from some other variant that is blocking the target variant
 */
export function isTargetOverwritten(types: DefinedIndicatorType[]) {
  return types.some(
    (type) =>
      type.source === "otherVariants" &&
      type.targetSource &&
      !type.targetHasHighestPriority
  );
}

/**
 * Returns true if some DefinedIndicatorType states that the source of the
 * value is from some other variant that is blocking the target variant
 */
export function getTargetBlockingCombo(types: DefinedIndicatorType[]) {
  const blocking = types.find(
    (type) => type.source === "otherVariants" && !type.targetHasHighestPriority
  );
  if (blocking && blocking.source === "otherVariants") {
    const lastSource = L.last(blocking.stack);
    if (
      lastSource &&
      lastSource.type !== "theme" &&
      lastSource.type !== "themeTag" &&
      lastSource.type !== "sel"
    ) {
      return lastSource.combo;
    }
  }
  return undefined;
}
