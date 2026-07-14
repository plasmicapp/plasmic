import { ControlExtras } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { SvgIcon } from "@/wab/client/components/widgets/Icon";
import {
  DataQueryIcon,
  DataTokenIcon,
  PropIcon,
  StateIcon,
  UrlIcon,
} from "@/wab/client/icons";
import BracesIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Braces";
import BracketsIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Brackets";
import FunctionSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__FunctionSvg";
import HashtagSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__HashtagSvg";
import NullIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Null";
import SquareCheckSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__SquareCheckSvg";
import TextSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__TextSvg";
import {
  UiId,
  mkModelUiId,
  mkSectionUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { getAncestorTplSlot } from "@/wab/shared/SlotUtils";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { StudioPropType } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert, ensure, isNonNil } from "@/wab/shared/common";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import {
  getComponentDataQueryByVarName,
  getComponentServerQueryByVarName,
  getRealParams,
  isCodeComponent,
  isPageComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import {
  StatefulQueryResult,
  unwrapStatefulQueryResult,
} from "@/wab/shared/core/custom-functions";
import { omittedKeysIfEmpty } from "@/wab/shared/core/exprs";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  findStateIn$State,
  getStateByVarName,
  getStateVarName,
} from "@/wab/shared/core/states";
import { isTplComponent } from "@/wab/shared/core/tpls";
import type {
  DataPickerOpts,
  DataPickerSupportedVariableType,
  VariableType,
} from "@/wab/shared/data-picker/data-picker-types";
import {
  dataPickerShouldHideKey,
  getVariableType,
  isListType,
  isTypeSupported,
} from "@/wab/shared/data-picker/data-picker-types";
import { tryEvalExpr } from "@/wab/shared/eval";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import {
  Component,
  Site,
  State,
  TplNode,
  VariantGroup,
  isKnownNamedState,
} from "@/wab/shared/model/classes";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import { ChoiceValue, DataMeta, mkMetaName } from "@plasmicapp/host";
import { isArray, isPlainObject } from "lodash";

export {
  dataPickerShouldHideKey,
  getVariableType,
  isListType,
  isTypeSupported,
};
export type { DataPickerOpts, DataPickerSupportedVariableType, VariableType };

export type ColumnItem = {
  name: string;
  value: any;
  pathPrefix: (string | number)[];
  label?: string;
  /** Shown in place of the item's fields when its data failed to resolve. */
  errorMessage?: string;
};

export type Column = {
  selectedItem: number | undefined;
  columnItems: ColumnItem[];
  errorMessage?: string;
};

type keyInfo = {
  key: string;
  label?: string;
};

export function hasAdvancedFields(data: any, seen: Set<any> = new Set()) {
  if (data) {
    if (isPlainObject(data) && !data.$$typeof) {
      for (const [key, value] of Object.entries(data as Record<string, any>)) {
        if (key.startsWith("__plasmic_meta")) {
          if ("advanced" in value && value.advanced) {
            return true;
          }
        } else if (
          !seen.has(value) &&
          hasAdvancedFields(value, seen.add(value))
        ) {
          return true;
        }
      }
    } else if (isArray(data)) {
      if (
        data.some(
          (item) => !seen.has(item) && hasAdvancedFields(item, seen.add(item))
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function getSupportedObjectKeys(
  object: Record<string, any> | null | undefined,
  opts: DataPickerOpts,
  seen: Set<any> = new Set(),
  pathPrefix?: (string | number)[]
): keyInfo[] {
  return object != null
    ? Object.keys(object)
        .filter((key) => {
          if (dataPickerShouldHideKey(key, object, pathPrefix, opts)) {
            return false;
          }
          const variableType = getVariableType(object[key]);
          if (isListType(variableType) && !seen.has(object[key])) {
            if (
              !omittedKeysIfEmpty.has([...(pathPrefix ?? []), key].join("."))
            ) {
              return true;
            }
            const children = getSupportedObjectKeys(
              object[key],
              opts,
              seen.add(object[key]),
              pathPrefix ? [...pathPrefix, key] : [key]
            );
            return children.length > 0;
          }
          return true;
        })
        .map((key) => {
          const meta: DataMeta | undefined = object[mkMetaName(key)];
          if (isNonNil(meta)) {
            return { key, label: meta.label };
          }
          return { key };
        })
    : [];
}

/** Items shown in a column for `data` at `pathPrefix`, one per supported key. */
export function mkColumnItems(
  data: Record<string, any>,
  pathPrefix: (string | number)[],
  opts: DataPickerOpts
): ColumnItem[] {
  return getSupportedObjectKeys(data, opts, undefined, pathPrefix).map(
    ({ key, label }) => ({
      name: key,
      label,
      value: data[key],
      pathPrefix,
    })
  );
}

export function getItemPath(item: ColumnItem): (string | number)[] {
  const key = isNaN(Number(item.name)) ? item.name : Number(item.name);
  return item.pathPrefix.concat(key);
}

/**
 * Columns to show if item is selected.
 *
 * Could be sub-items or an error message.
 */
export function getItemChildColumns(
  item: ColumnItem,
  opts: DataPickerOpts
): Column[] {
  // An errored item shows its message instead of empty fields.
  if (item.errorMessage !== undefined) {
    return [
      {
        selectedItem: undefined,
        columnItems: [],
        errorMessage: item.errorMessage,
      },
    ];
  }
  return mkListColumn(item.value, getItemPath(item), opts);
}

/**
 * Formats an error into a readable message for display in the picker.
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2) ?? String(error);
  } catch {
    return String(error);
  }
}

/** Column shown after selecting `value` at `path`: its fields, or none for a leaf. */
function mkListColumn(
  value: any,
  path: (string | number)[],
  opts: DataPickerOpts
): Column[] {
  if (!isListType(getVariableType(value))) {
    return [];
  }
  const columnItems = mkColumnItems(value, path, opts);
  return columnItems.length > 0
    ? [{ selectedItem: undefined, columnItems }]
    : [];
}

const dataPickerSupportedVariableTypes = {
  null: { previewVariant: "undefined", icon: NullIcon },
  undefined: { previewVariant: "undefined", icon: NullIcon },
  boolean: { previewVariant: "boolean", icon: SquareCheckSvgIcon },
  number: { previewVariant: "number", icon: HashtagSvgIcon },
  string: { previewVariant: "string", icon: TextSvgIcon },
  object: { previewVariant: "object", icon: BracesIcon },
  array: { previewVariant: "array", icon: BracketsIcon },
  function: { previewVariant: "func", icon: FunctionSvgIcon },
} as const satisfies Record<
  DataPickerSupportedVariableType,
  { previewVariant: string; icon: SvgIcon }
>;

export function toDataPickerPreviewVariant(
  variableType: DataPickerSupportedVariableType
) {
  return dataPickerSupportedVariableTypes[variableType].previewVariant;
}

export function variableTypeToIcon(
  variableType: DataPickerSupportedVariableType
): SvgIcon {
  return dataPickerSupportedVariableTypes[variableType].icon;
}

export function evalExpr(path: (string | number)[], data: Record<string, any>) {
  const expr = pathToString(path);
  const evaluatedValue = tryEvalExpr(
    expr,
    ensure(data, "Should only be called if canvasEnv exists")
  ).val;
  try {
    return JSON.stringify(evaluatedValue);
  } catch {
    return undefined;
  }
}

export function getExpectedValuesForVariantGroup(group: VariantGroup) {
  return isStandaloneVariantGroup(group)
    ? `true, false, "${toVarName(group.variants[0].name)}"`
    : group.variants.map((v) => `"${toVarName(v.name)}"`).join(", ");
}

export function prepareEnvForDataPicker(
  viewCtx: ViewCtx | undefined,
  data: Record<string, any>,
  component: Component | undefined,
  tpl?: TplNode | null,
  opts?: {
    /** Leave $q entries as raw StatefulQueryResult instances instead of
     * unwrapping them to {data, error} snapshots. The copilot data-context
     * exporter uses this so it can preserve each query's isLoading state. */
    keepStatefulQueries?: boolean;
  }
): Record<string, any> {
  if (!component) {
    return data;
  }
  const { dataTokensEnv, ...fixedData } = data;

  const isFocusedTplInTplSlot = tpl ? getAncestorTplSlot(tpl, true) : false;
  if (!isFocusedTplInTplSlot) {
    if ("$props" in fixedData) {
      const realParams = getRealParams(component);
      realParams.forEach((param) => {
        const name = toVarName(param.variable.name);
        if (!(name in data["$props"])) {
          data["$props"][name] = undefined;
        }
      });
    }
    if ("$state" in fixedData && viewCtx) {
      fixedData.$state = { ...fixedData.$state };
      for (const state of component.states) {
        if (state.tplNode) {
          const { hidden, advanced } =
            getContextDependentValuesForImplicitState(viewCtx, state);
          if (advanced || hidden) {
            for (const { obj, key } of findStateIn$State(
              state,
              fixedData.$state
            )) {
              obj[mkMetaName(key)] = { advanced, hidden };
            }
          }
        }
      }
    }
  }
  if (dataTokensEnv) {
    fixedData[mkMetaName("$dataTokens")] = { label: "Data Tokens" };
    fixedData.$dataTokens = dataTokensEnv;
  }
  // Omit fields from StatefulQueryResult instances in $q.
  // Only expose the fields in the PlasmicQueryResult interface.
  if (!opts?.keepStatefulQueries && "$q" in fixedData && fixedData.$q) {
    fixedData.$q = Object.fromEntries(
      Object.entries(fixedData.$q as Record<string, any>).map(
        ([name, query]: [string, StatefulQueryResult]) => [
          name,
          unwrapStatefulQueryResult(query),
        ]
      )
    );
  }
  return fixedData;
}

export function getContextDependentValuesForImplicitState(
  viewCtx: ViewCtx,
  state: State
) {
  assert(state.tplNode, `Must be an implicit state`);
  const tpl = ensure(state.tplNode, `Must be an implicit state`);
  if (!isTplComponent(tpl) || !isKnownNamedState(state.implicitState)) {
    return { hidden: false, advanced: false };
  }
  const comp = tpl.component;
  if (!isCodeComponent(comp) && !isPlumeComponent(comp)) {
    return { hidden: false, advanced: false };
  }
  const { componentPropValues, ccContextData } =
    viewCtx.getComponentEvalContext(state.tplNode);
  const controlExtras: ControlExtras = {
    path: [state.implicitState.name],
  };
  const ccState = state.implicitState;
  const stateMeta = isCodeComponent(comp)
    ? comp._meta?.states?.[ccState.name]
    : getPlumeEditorPlugin(comp)?.codeComponentMeta?.(comp).states?.[
        ccState.name
      ];
  const advanced = getContextDependentValue(
    stateMeta?.advanced,
    componentPropValues,
    ccContextData,
    controlExtras
  );
  const hidden = getContextDependentValue(
    stateMeta?.hidden,
    componentPropValues,
    ccContextData,
    controlExtras
  );
  return { advanced, hidden };
}

export function extractExpectedValues(
  propType: StudioPropType<any>,
  enumValues: ChoiceValue[] | undefined
) {
  if (typeof propType === "object") {
    if ("exprHint" in propType) {
      return propType.exprHint;
    } else if (propType.type === "target") {
      return `Should return "_blank" for new tab or undefined for the default behavior`;
    }
  }
  return enumValues?.toString();
}

// getSourceUiId and getDollarVarIcon are only necessary because we currently
// pass around env: Record<string, any>. If we passed around a more structured
// env with direct references to modes, we wouldn't need this lookup from
// itemPath to model.
// TODO: Obviate getSourceUiId, getDollarVarIcon

/**
 * Given the path of a data picker row (e.g. `["$q", "myQuery", "data"]`),
 * finds the relevant model in the Site and returns its UiId.
 */
export function getSourceUiId(
  itemPath: (string | number)[],
  site: Site,
  component?: Component
): UiId | undefined {
  if (itemPath.length < 2) {
    return undefined;
  }

  const dollarVar = itemPath[0];
  const name = itemPath[1];
  switch (dollarVar) {
    case "$dataTokens": {
      if (itemPath.length === 2) {
        const token = site.dataTokens.find((t) => toVarName(t.name) === name);
        return token ? mkModelUiId(token) : undefined;
      } else if (itemPath.length === 3) {
        const tokenName = itemPath[2];
        const dep = walkDependencyTree(site, "direct").find(
          (d) => toVarName(d.name) === name
        );
        const token = dep?.site.dataTokens.find(
          (t) => toVarName(t.name) === tokenName
        );
        return token ? mkModelUiId(token) : undefined;
      }
      return undefined;
    }
    case "$ctx": {
      if (!component || !isPageComponent(component) || itemPath.length !== 2) {
        return undefined;
      } else if (name === "pagePath" || name === "pageRoute") {
        return mkSectionUiId("PageMetaUrl");
      } else if (name === "params" && itemPath.length === 2) {
        // TODO: Link to specific param
        return mkSectionUiId("PageMetaUrlParams");
      } else {
        return undefined;
      }
    }
    case "$props": {
      if (!component || itemPath.length !== 2 || typeof name !== "string") {
        return undefined;
      }
      const param = getRealParams(component).find(
        (p) => toVarName(p.variable.name) === name
      );
      return param ? mkModelUiId(param) : undefined;
    }
    case "$q": {
      // Accept `$q.<name>` or `$q.<name>.data`
      const isQueryPath =
        typeof name === "string" &&
        (itemPath.length === 2 ||
          (itemPath.length === 3 && itemPath[2] === "data"));
      if (!component || !isQueryPath) {
        return undefined;
      }
      const query = getComponentServerQueryByVarName(component, name);
      return query ? mkModelUiId(query) : undefined;
    }
    case "$queries": {
      if (!component || itemPath.length !== 2 || typeof name !== "string") {
        return undefined;
      }
      const query = getComponentDataQueryByVarName(component, name);
      return query ? mkModelUiId(query) : undefined;
    }
    case "$state": {
      if (!component || typeof name !== "string") {
        return undefined;
      }
      // Accept `$state.<componentState>`
      if (itemPath.length === 2) {
        const state = getStateByVarName(component, name);
        return state ? mkModelUiId(state.param) : undefined;
      }
      // Accept `$state.<element>.<elementState>`
      if (itemPath.length === 3 && typeof itemPath[2] === "string") {
        const varName = `${name}.${itemPath[2]}`;
        const state = component.states.find(
          (s) => getStateVarName(s) === varName
        );
        return state ? mkModelUiId(state.param) : undefined;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Given the path of a data picker row (e.g. `["$q", "myQuery", "data"]`),
 * chooses the corresponding icon.
 */
export function getDollarVarIcon(
  itemPath: (string | number)[]
): SvgIcon | undefined {
  const dollarVar = itemPath[0];
  switch (dollarVar) {
    case "$dataTokens":
      return DataTokenIcon;
    case "$q":
    case "$queries":
      return DataQueryIcon;
    case "$props":
      return PropIcon;
    case "$state":
      return StateIcon;
    case "$ctx": {
      const name = itemPath[1];
      return name === "params" ||
        name === "query" ||
        name === "pagePath" ||
        name === "pageRoute"
        ? UrlIcon
        : undefined;
    }
    default:
      return undefined;
  }
}
