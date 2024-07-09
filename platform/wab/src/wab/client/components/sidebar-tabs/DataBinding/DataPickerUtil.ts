import { ControlExtras } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { PlasmicDataPickerColumnItem__VariantMembers } from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerColumnItem";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { getAncestorTplSlot } from "@/wab/shared/SlotUtils";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert, ensure, isNonNil, isPrefixArray } from "@/wab/shared/common";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import {
  getRealParams,
  isCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import {
  alwaysOmitKeys,
  flattenedKeys,
  omittedKeysIfEmpty,
} from "@/wab/shared/core/exprs";
import { findStateIn$State } from "@/wab/shared/core/states";
import { isTplComponent } from "@/wab/shared/core/tpls";
import { tryEvalExpr } from "@/wab/shared/eval";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import {
  Component,
  State,
  TplNode,
  VariantGroup,
  isKnownNamedState,
} from "@/wab/shared/model/classes";
import {
  UNINITIALIZED_BOOLEAN,
  UNINITIALIZED_NUMBER,
  UNINITIALIZED_OBJECT,
  UNINITIALIZED_STRING,
} from "@/wab/shared/model/model-util";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import { DataMeta, mkMetaName } from "@plasmicapp/host";
import { isArray, isPlainObject, partition } from "lodash";

export type supportedTypes =
  PlasmicDataPickerColumnItem__VariantMembers["variableType"];
export const allowedTypes = [
  "string",
  "number",
  "boolean",
  "undefined",
  "object",
  "array",
  "func",
];

export const allowedSymbols = [
  UNINITIALIZED_NUMBER,
  UNINITIALIZED_STRING,
  UNINITIALIZED_BOOLEAN,
  UNINITIALIZED_OBJECT,
];

export type ColumnItem = {
  name: string;
  value: any;
  pathPrefix: (string | number)[];
  label?: string;
};

export type keyInfo = {
  key: string;
  label?: string;
};

export type DataPickerOpts = {
  showAdvancedFields: boolean;
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

export function dataPickerShouldHideKey(
  key: string,
  data: Record<string, any>,
  pathPrefix: (string | number)[] | undefined,
  opts: DataPickerOpts
) {
  if (key === "$$" && !pathPrefix?.length) {
    return true;
  }
  if (key.startsWith("__plasmic")) {
    return true;
  }
  if (data[key]?.isPlasmicUndefinedDataProxy) {
    return true;
  }
  const meta: DataMeta | undefined = data[mkMetaName(key)];
  if (isNonNil(meta)) {
    if (meta.hidden) {
      return true;
    }
    if (!opts.showAdvancedFields && meta.advanced) {
      return true;
    }
  }
  if (alwaysOmitKeys.has([...(pathPrefix ?? []), key].join("."))) {
    return true;
  }
  const variableType = getVariableType(data[key]);
  return !isTypeSupported(variableType) && !allowedSymbols.includes(data[key]);
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
            return { key: key, label: meta.label };
          }
          return { key: key };
        })
    : [];
}

export function mkColumnItems(
  data: Record<string, any>,
  pathPrefix: (string | number)[],
  opts: DataPickerOpts,
  flatten?: boolean,
  extraObjectPathsToFlat?: (string | number)[][]
): ColumnItem[] {
  const keys = getSupportedObjectKeys(data, opts, undefined, pathPrefix);
  if (flatten) {
    const [flattenKeys, normalKeys] = partition(
      keys,
      (x) =>
        flattenedKeys.has(x.key) ||
        extraObjectPathsToFlat?.some((objPath) =>
          isPrefixArray([...pathPrefix, x.key], objPath)
        )
    );
    return [
      ...flattenKeys.flatMap(({ key }) =>
        mkColumnItems(
          data[key],
          [...pathPrefix, key],
          opts,
          flatten,
          extraObjectPathsToFlat
        )
      ),
      ...normalKeys.map(({ key, label }) => {
        return {
          name: key,
          label: extraObjectPathsToFlat?.some(
            (objPath) =>
              isPrefixArray(pathPrefix, objPath) && pathPrefix.length > 0
          )
            ? [...pathPrefix.slice(1), label ?? key].join(" → ")
            : label,
          value: data[key],
          pathPrefix,
        };
      }),
    ];
  }
  return keys.map(({ key, label }) => {
    return {
      name: key,
      label: label,
      value: data[key],
      pathPrefix,
    };
  });
}

export function isTypeSupported(
  variableType: string
): variableType is supportedTypes {
  return allowedTypes.includes(variableType);
}

export function parseItem(key: string) {
  return isNaN(Number(key)) ? key : Number(key);
}

export function getItemPath(path: (string | number)[], key: string) {
  return path.concat(parseItem(key));
}

export function getVariableType(value: any) {
  if (!isNonNil(value)) {
    return "undefined";
  } else if (Array.isArray(value)) {
    return "array";
  } else if (typeof value === "object" && value.$$typeof) {
    // We make a special effort to detect React elements, which often come
    // in from $props with renderable params. Walking React elements can be
    // dangerous because their props can lead to canvas-rendering objects
    // we store in element props, which may lead to walking the Site data model
    // or even other DOM trees and the top `window`.
    return "react-element";
  } else if (value === UNINITIALIZED_STRING) {
    return "string";
  } else if (value === UNINITIALIZED_NUMBER) {
    return "number";
  } else if (value === UNINITIALIZED_BOOLEAN) {
    return "boolean";
  } else if (value === UNINITIALIZED_OBJECT) {
    return "object";
  }
  const valueType = typeof value;
  return valueType === "function" ? "func" : valueType;
}

export function isListType(type: string) {
  return type === "object" || type === "array";
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
  data?: Record<string, any>,
  component?: Component,
  tpl?: TplNode | null
) {
  if (!data || !component) {
    return data;
  }
  const fixedData = { ...data };
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
