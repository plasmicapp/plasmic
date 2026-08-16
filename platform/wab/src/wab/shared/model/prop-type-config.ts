import type { PropTypeType } from "@/wab/shared/code-components/code-components";
import {
  Expr,
  Param,
  Type,
  isKnownDataSourceOpExpr,
  isKnownEventHandler,
  isKnownFunctionType,
  isKnownImageAssetRef,
  isKnownPageHref,
  isKnownStyleTokenRef,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { ChoiceObject, ChoiceOptions, ChoiceValue } from "@plasmicapp/host";

/**
 * Config keys that are not wab type names borrow the host prop-type name
 * for the same concept. For example "eventHandler" is one type of function that
 * represents a callback. We already have a name for it in the host prop types i.e "eventHandler".
 *
 * Nothing mechanical depends on this; the key is internal and could be any name.
 * Borrowing the host name is a convention to avoid a third naming scheme
 * next to the wab and host ones, and the Extract enforces it: a name
 * declared here must exist in the host types.
 */
type HostPropType = Extract<PropTypeType, "eventHandler">;

/**
 * The prop types a user can create in Studio, keyed by wab type name,
 * with the data needed to label and validate them.
 *
 * User props have no code registration behind them (unlike code component
 * props), and the model stores only the wab Type; no labels, no
 * validation rules. So this config is the single place where that
 * information lives, shared by the Component prop modal, and the copilot tools.
 *
 * Key order is the order the Studio type picker shows.
 */
export const COMPONENT_PARAM_TYPES_CONFIG = {
  text: { label: "Text", jsonType: "string" },
  num: { label: "Number", jsonType: "number" },
  bool: { label: "Toggle", jsonType: "boolean" },
  any: { label: "Object", jsonType: "any" }, // any / Object = JsonValue, NOT JsonObject
  choice: { label: "Choice", jsonType: "any" }, // string | number | boolean
  multiChoice: { label: "Multi-Choice", jsonType: "any" }, // string[] | number[] | boolean[]
  queryData: {
    label: "Query data",
    jsonType: "any",
    exprTypeGuard: isKnownDataSourceOpExpr,
  },
  eventHandler: {
    label: "Function",
    jsonType: false,
    exprTypeGuard: isKnownEventHandler,
  },
  href: {
    label: "Link URL",
    jsonType: "string", // can be external URL
    exprTypeGuard: isKnownPageHref, // can be local page href
  },
  dateString: { label: "Date", jsonType: "string" },
  dateRangeStrings: { label: "Date range", jsonType: "string[]" },
  color: {
    label: "Color",
    jsonType: "string", // can be CSS color
    exprTypeGuard: isKnownStyleTokenRef, // can be token
  },
  img: {
    label: "Image",
    jsonType: "string", // can be external image URL
    exprTypeGuard: isKnownImageAssetRef, // can be image asset
  },
} as const satisfies Partial<
  Record<Param["type"]["name"] | HostPropType, Omit<PropTypeData, "value">>
>;

export type ComponentParamTypeOptions =
  keyof typeof COMPONENT_PARAM_TYPES_CONFIG;

export type PropTypeData = {
  value: ComponentParamTypeOptions;
  label: string;
  /** The JSON type for the prop type, or false if it must be an Expr. */
  jsonType: false | "boolean" | "number" | "string" | "string[]" | "any";
  /** The Expr's typeguard check function like `isKnownPageHref`. */
  exprTypeGuard?: (expr: Expr) => boolean;
};

export const COMPONENT_PARAM_TYPES: PropTypeData[] = Object.entries(
  COMPONENT_PARAM_TYPES_CONFIG
).map(([value, data]) => ({
  value: value as ComponentParamTypeOptions,
  ...data,
}));

export function getComponentParamTypeOption(
  paramType: string
): PropTypeData | undefined {
  return COMPONENT_PARAM_TYPES.find((opt) => opt.value === paramType);
}

export function getPropTypeDataForType(type: Type): PropTypeData | undefined {
  return getComponentParamTypeOption(
    isKnownFunctionType(type) ? "eventHandler" : type.name
  );
}

/**
 * A choice option is either a plain value or a `{ label, value }` object;
 * returns the plain value.
 */
export const getChoiceValue = (item: ChoiceValue | ChoiceObject): ChoiceValue =>
  typeof item === "object" ? item.value : item;

/**
 * The kinds allowed as arguments of an eventHandler's function signature
 */
export type FuncArgTypeKind = {
  [K in ComponentParamTypeOptions]: (typeof COMPONENT_PARAM_TYPES_CONFIG)[K] extends {
    exprTypeGuard: (expr: Expr) => boolean;
  }
    ? never
    : (typeof COMPONENT_PARAM_TYPES_CONFIG)[K] extends { jsonType: false }
    ? never
    : K;
}[ComponentParamTypeOptions];

export const FUNC_ARG_TYPES: readonly PropTypeData[] =
  COMPONENT_PARAM_TYPES.filter(
    (data) => data.jsonType !== false && !data.exprTypeGuard
  );

function mkWabTypeForFuncArgKind(kind: FuncArgTypeKind) {
  switch (kind) {
    case "choice":
      return typeFactory.choice([]);
    case "multiChoice":
      return typeFactory.multiChoice([]);
    default:
      return typeFactory[kind]();
  }
}

/**
 * Builds the wab type for a given param type kind.
 */
export function mkWabTypeForPropKind(
  kind: ComponentParamTypeOptions,
  opts?: {
    options?: ChoiceOptions;
    funcArgs?: { name: string; type: FuncArgTypeKind }[];
  }
) {
  switch (kind) {
    case "choice":
      return typeFactory.choice(opts?.options ?? []);
    case "multiChoice":
      return typeFactory.multiChoice(opts?.options ?? []);
    case "eventHandler":
      return typeFactory.func(
        ...(opts?.funcArgs ?? []).map((arg) =>
          typeFactory.arg(arg.name, mkWabTypeForFuncArgKind(arg.type))
        )
      );
    default:
      return typeFactory[kind]();
  }
}
