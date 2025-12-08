import { VariantCombo } from "@/wab/shared/Variants";
import { arrayEqIgnoreOrder, ensure } from "@/wab/shared/common";
import {
  Animation,
  Arg,
  Component,
  Expr,
  Mixin,
  Param,
  Site,
  Theme,
  TplComponent,
  TplNode,
  TplSlot,
} from "@/wab/shared/model/classes";
import { makeVariantComboSorter } from "@/wab/shared/variant-sort";
import { TplVisibility } from "@/wab/shared/visibility-utils";
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
  | TextSource
  | ColumnsConfigSource
  | ParentTplStyleSource;

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
  animations?: Animation[];
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

export interface ColumnsConfigSource {
  type: "columnsConfig";
  combo: VariantCombo;
  value: string;
}

export interface ParentTplStyleSource {
  type: "parentTplStyle";
  parentTpl: TplNode;
  prop: string;
  value: string;
  activeVariants: VariantCombo;
  // The TplComponent that brings in the external component containing parentTpl
  // undefined if parentTpl is in the current component hierarchy
  tplComponent?: TplComponent;
}

export interface SlotSource {
  type: "slot";
  parentTpl: TplSlot;
  value: string;
  prop: string;
  activeVariants: VariantCombo;
  tplComponent?: TplComponent;
  param: Param;
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
      // Inherited via Parent Tpl Styles (includes slot inheritance)
      source: "parentTplStyle";
      stack: VariantSettingSourceStack;
    }
  | { source: "none" }
  | {
      // Value is always set
      source: "invariantable";
    };

export function isIndicatorExplicitlySet(indicator: DefinedIndicatorType) {
  return ["set", "setNonVariable"].includes(indicator.source);
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
          s.type !== "parentTplStyle" &&
          arrayEqIgnoreOrder(s.combo, currentCombo)
      )
    );
    const lastSource = ensure(L.last(sources), "sources is empty");
    if (lastSource.type === "theme" || lastSource.type === "themeTag") {
      return { source: "theme", theme: lastSource.theme, stack: sources };
    } else if (
      lastSource.type === "parentTplStyle" ||
      lastSource.type === "slot"
    ) {
      return {
        source: "parentTplStyle",
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
      lastSource.type !== "slot" &&
      lastSource.type !== "parentTplStyle"
    ) {
      return lastSource.combo;
    }
  }
  return undefined;
}

/**
 * Retrieves a property from targetSource when the source is "set".
 */
export const getPropertyFromSetTypeSource = (
  indicatorType: DefinedIndicatorType,
  propertyName: string
) => indicatorType.source === "set" && indicatorType.targetSource[propertyName];

/**
 * Retrieves the `prop` and `value` attributes from an indicator.
 * If the indicator's source is "set", it fetches the properties from `targetSource`.
 * Otherwise, if the source is "setNonVariable", it directly uses `prop` and `value` from the indicator.
 *
 * @param indicatorType - The indicator object to extract properties from.
 * @returns An object containing `prop` and `value` attributes, if available.
 */
export function getPropAndValueFromIndicator(
  indicatorType: DefinedIndicatorType
) {
  const prop =
    getPropertyFromSetTypeSource(indicatorType, "prop") ||
    (indicatorType.source === "setNonVariable" && indicatorType.prop);
  const value =
    getPropertyFromSetTypeSource(indicatorType, "value") ||
    (indicatorType.source === "setNonVariable" && indicatorType.value);
  return { prop, value };
}
