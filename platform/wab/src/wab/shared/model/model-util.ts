import { Values } from "@/wab/commons/types";
import { StudioPropType } from "@/wab/shared/code-components/code-components";
import { jsLiteral } from "@/wab/shared/codegen/util";
import {
  assert,
  ensureInstance,
  objsEq,
  switchType,
} from "@/wab/shared/common";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { StateVariableType } from "@/wab/shared/core/states";
import {
  isTplComponent,
  isTplFromComponent,
  isTplTextBlock,
  resolveTplRoot,
} from "@/wab/shared/core/tpls";
import {
  AnyType,
  ArgType,
  BoolType,
  Choice,
  ClassNamePropType,
  ColorPropType,
  Component,
  ComponentInstance,
  DateRangeStrings,
  DateString,
  DefaultStylesClassNamePropType,
  DefaultStylesPropType,
  FunctionType,
  HrefType,
  Img,
  isKnownAnyType,
  isKnownArgType,
  isKnownBoolType,
  isKnownChoice,
  isKnownClassNamePropType,
  isKnownComponentInstance,
  isKnownDefaultStylesClassNamePropType,
  isKnownFunctionType,
  isKnownImg,
  isKnownNum,
  isKnownPlumeInstance,
  isKnownQueryData,
  isKnownRenderableType,
  isKnownRenderFuncType,
  isKnownStyleScopeClassNamePropType,
  isKnownText,
  LabeledSelector,
  Num,
  PlumeInstance,
  QueryData,
  RenderableType,
  RenderFuncType,
  StyleScopeClassNamePropType,
  TargetType,
  Text,
  TplNode,
  Type,
} from "@/wab/shared/model/classes";
import { instUtil as defaultInstUtil } from "@/wab/shared/model/InstUtil";
import { Type as ModelType } from "@/wab/shared/model/model-meta";
import { ChoiceOptions } from "@plasmicapp/host";
import L, {
  isArray,
  isBoolean,
  isEqual,
  isNil,
  isNumber,
  isString,
} from "lodash";

export const typeFactory = {
  text: () => new Text({ name: "text" }),
  bool: () => new BoolType({ name: "bool" }),
  num: () => new Num({ name: "num" }),
  img: () => new Img({ name: "img" }),
  any: () => new AnyType({ name: "any" }),
  func: (...params: ArgType[]) => new FunctionType({ name: "func", params }),
  arg: (argName: string, type: ArgType["type"], displayName?: string) =>
    new ArgType({
      name: "arg",
      argName,
      type,
      displayName: displayName ?? null,
    }),
  renderable: (opts?: {
    params: (ComponentInstance | PlumeInstance)[];
    allowRootWrapper: boolean | undefined | null;
  }) =>
    new RenderableType({
      name: "renderable",
      ...(opts ? opts : { params: [], allowRootWrapper: undefined }),
    }),
  renderFunc: (opts: {
    params: ArgType[];
    allowed: ComponentInstance[];
    allowRootWrapper: boolean | undefined | null;
  }) => new RenderFuncType({ name: "renderFunc", ...opts }),
  href: () => new HrefType({ name: "href" }),
  target: () => new TargetType({ name: "target" }),
  choice: (options: ChoiceOptions) => new Choice({ name: "choice", options }),
  instance: (component: Component) =>
    new ComponentInstance({ name: "instance", component }),
  plumeInstance: (plumeType: string) =>
    new PlumeInstance({ name: "plumeInstance", plumeType }),
  queryData: () => new QueryData({ name: "queryData" }),
  dateString: () => new DateString({ name: "dateString" }),
  dateRangeStrings: () => new DateRangeStrings({ name: "dateRangeStrings" }),
  classNamePropType: (
    selectors: {
      selector: string;
      label?: string | null;
      defaultStyles?: Record<string, string>;
    }[],
    defaultStyles: Record<string, string>
  ) =>
    new ClassNamePropType({
      name: "className",
      selectors: selectors.map(
        (s) =>
          new LabeledSelector({
            label: s.label,
            selector: s.selector,
            defaultStyles: { ...(s.defaultStyles ?? {}) },
          })
      ),
      defaultStyles: { ...defaultStyles },
    }),
  styleScopeClassNamePropType: (scope: string) =>
    new StyleScopeClassNamePropType({
      name: "styleScopeClassName",
      scopeName: scope,
    }),
  defaultStylesClassNamePropType: (includeTagStyles: boolean) =>
    new DefaultStylesClassNamePropType({
      name: "defaultStylesClassName",
      includeTagStyles,
    }),
  defaultStyles: () => new DefaultStylesPropType({ name: "defaultStyles" }),
  color: (opts?: { noDeref: boolean }) =>
    new ColorPropType({ name: "color", noDeref: opts ? !!opts.noDeref : true }),
};

export const genericTypes = [
  RenderableType,
  FunctionType,
  ArgType,
  RenderFuncType,
] as const;
export type GenericType = InstanceType<(typeof genericTypes)[number]>;
// | RenderableType
// | FunctionType
// | ArgType
// | RenderFuncType;

function isGenericType(type: Type): type is GenericType {
  const result = genericTypes.some((cls) => type instanceof cls);
  if (!result) {
    // If we add a new type that references other types, we should update the
    // list of generic types.
    assert(
      !("params" in type) && !("param" in type),
      "Unexpected parameters in Type marked as non-generic"
    );
  }
  return result;
}

export function isRenderFuncType(type: Type): type is RenderFuncType {
  return isKnownRenderFuncType(type);
}

export function isRenderableType(type: Type): type is RenderableType {
  return isKnownRenderableType(type) && type.name === "renderable";
}

export function isAnyType(type: Type) {
  return isKnownAnyType(type) && type.name === "any";
}

export function isNumType(type: Type) {
  return isKnownNum(type) && type.name === "num";
}

export function isTextType(type: Type): type is Text {
  return isKnownText(type) && type.name === "text";
}
export function isBoolType(type: Type) {
  return isKnownBoolType(type) && type.name === "bool";
}

export function isChoiceType(type: Type): type is Choice {
  return isKnownChoice(type) && type.name === "choice";
}

export function isImageType(type: Type): type is Img {
  return isKnownImg(type) && type.name === "img";
}

export function isQueryDataType(type: Type): type is QueryData {
  return isKnownQueryData(type) && type.name === "queryData";
}

export const isFuncType = (type: Type): type is FunctionType =>
  isKnownFunctionType(type) && L.startsWith(type.name, "func");

export const wabToTsTypeMap = {
  text: "string",
  num: "number",
  bool: "boolean",
  func: "Function",
  dateTime: "Date",
  img: "string",
  id: "string",
  collection: "Array<any>",
  renderable: "ReactNode",
  href: "string",
  target: "Target",
};

export function wabToTsType(type: Type, forCodeGen?: boolean): string {
  const typeName =
    type.name === "any"
      ? "any"
      : isKnownFunctionType(type)
      ? `(${type.params
          .map((p) => `${p.argName}: ${wabToTsType(p.type, forCodeGen)}`)
          .join(", ")}) => void`
      : isChoiceType(type)
      ? type.options.length > 0
        ? type.options.map((v) => jsLiteral(v)).join("|")
        : "string"
      : wabToTsTypeMap[type.name] || "any";
  return forCodeGen && typeName === wabToTsTypeMap.renderable
    ? "React.ReactNode"
    : typeName;
}

export const UNINITIALIZED_NUMBER = Symbol("plasmic.number");
export const UNINITIALIZED_STRING = Symbol("plasmic.string");
export const UNINITIALIZED_BOOLEAN = Symbol("plasmic.boolean");
export const UNINITIALIZED_OBJECT = Symbol("plasmic.object");

export const wabTypeToPlaceholderValueMap = {
  text: UNINITIALIZED_STRING,
  num: UNINITIALIZED_NUMBER,
  bool: UNINITIALIZED_BOOLEAN,
  any: UNINITIALIZED_OBJECT,
} as const;

export function isPlaceholderValue(
  x: any
): x is Values<typeof wabTypeToPlaceholderValueMap> {
  return Object.values(wabTypeToPlaceholderValueMap).includes(x);
}

export function getPlaceholderValueToWabType(type: Type) {
  return (
    wabTypeToPlaceholderValueMap[type.name] ?? wabTypeToPlaceholderValueMap.any
  );
}

const tsToWabTypeKey = {
  string: "text",
  number: "num",
  boolean: "bool",
  href: "href",
  target: "target",
  img: "img",
  dateString: "dateString",
  dateRangeStrings: "dateRangeStrings",
} as const;

export function convertTsToWabType(propType?: string) {
  return propType && propType.includes("ReactNode")
    ? typeFactory.renderable()
    : typeFactory[
        tsToWabTypeKey[(propType as keyof typeof tsToWabTypeKey) || ""] || ""
      ]?.() || typeFactory.any();
}

export const STATE_VARIABLE_TYPE_TO_WAB_TYPE_KEY = {
  text: "text",
  number: "num",
  boolean: "bool",
  array: "any",
  object: "any",
  dateString: "dateString",
  dateRangeStrings: "dateRangeStrings",
  variant: "any",
} as const;

export function convertVariableTypeToWabType(variableType: StateVariableType) {
  return (
    typeFactory[STATE_VARIABLE_TYPE_TO_WAB_TYPE_KEY[variableType]]?.() ||
    typeFactory.any()
  );
}

export const STATE_VARIABLE_TYPE_TO_PROP_TYPE: Record<
  StateVariableType,
  StudioPropType<any>
> = {
  text: "string",
  number: "number",
  boolean: "boolean",
  array: { type: "array" },
  object: { type: "object" },
  dateString: { type: "dateString" },
  dateRangeStrings: { type: "dateRangeStrings" },
  variant: { type: "variant" },
};

export function convertVariableTypeToPropType(
  variableType: StateVariableType
): StudioPropType<any> {
  return STATE_VARIABLE_TYPE_TO_PROP_TYPE[variableType];
}

export function typeDisplayName(type: Type, shortDescription?: boolean) {
  return switchType(type)
    .when(Text, () => "text")
    .when(BoolType, () => "toggle")
    .when(Num, () => "number")
    .when(Img, () => "image")
    .when(AnyType, () => "object")
    .when(Choice, (t) =>
      !shortDescription
        ? `choice of ${t.options.map((v) => jsLiteral(v)).join(", ")}`
        : `choice`
    )
    .when(
      ComponentInstance,
      (t) => `instance of ${getComponentDisplayName(t.component)}`
    )
    .when(PlumeInstance, (t) => `instance of ${t.plumeType}`)
    .when(RenderableType, (t) => {
      if (t.params.length === 0) {
        return `rendered content`;
      } else if (t.params.length === 1) {
        return typeDisplayName(t.params[0], shortDescription);
      } else {
        return `any of ${t.params
          .map((p) => typeDisplayName(p, shortDescription))
          .join(", ")}`;
      }
    })
    .when(HrefType, () => `link URL`)
    .when(TargetType, () => "target")
    .when(FunctionType, () => `function`)
    .when(DateRangeStrings, () => "date range")
    .when(DateString, () => "date")
    .when(QueryData, () => "query data")
    .when(ColorPropType, () => "color")
    .elseUnsafe(() => `${type.name} object`);
}

export function conformsToType(
  value: any,
  type: ModelType,
  instUtil = defaultInstUtil
) {
  switch (type.type) {
    case "String":
      return isString(value);
    case "StringLiteral":
      return isString(value) && value === type.params[0];
    case "Number":
      return isNumber(value);
    case "Bool":
      return isBoolean(value);
    case "Lit":
      return isNil(value) || isString(value) || isBoolean(value);
    case "List":
    case "Set":
      return (
        isArray(value) &&
        value.every((v) =>
          conformsToType(v, ensureInstance(type.params[0], ModelType), instUtil)
        )
      );
    case "Optional":
      return (
        value == null ||
        conformsToType(
          value,
          ensureInstance(type.params[0], ModelType),
          instUtil
        )
      );
    case "Map":
      return Object.entries(value).every(
        ([k, v]) =>
          conformsToType(
            k,
            ensureInstance(type.params[0], ModelType),
            instUtil
          ) &&
          conformsToType(v, ensureInstance(type.params[1], ModelType), instUtil)
      );
    case "Or":
      return type.params.some((sub) =>
        conformsToType(value, ensureInstance(sub, ModelType), instUtil)
      );
    case "Any":
      return true;
    default: {
      const expectedCls = instUtil.meta.clsByName[type.type];
      const actualCls = instUtil.tryGetInstClass(value);
      return !!actualCls && instUtil.meta.isSubclass(actualCls, expectedCls);
    }
  }
}

export function nodeConformsToType(
  node: TplNode,
  type: Type,
  opts?: { allowRootWrapper?: boolean }
) {
  if (isAnyType(type)) {
    return true;
  } else if (isTextType(type)) {
    return isTplTextBlock(node);
  } else if (isRenderableType(type)) {
    if (type.params.length === 0) {
      // No constraint
      return true;
    } else {
      return type.params.some((t) =>
        nodeConformsToType(node, t, {
          allowRootWrapper: type.allowRootWrapper ?? undefined,
        })
      );
    }
  } else if (isRenderFuncType(type)) {
    if (type.allowed.length === 0) {
      return true;
    } else {
      return type.allowed.some((t) =>
        nodeConformsToType(node, t, {
          allowRootWrapper: type.allowRootWrapper ?? undefined,
        })
      );
    }
  } else if (isKnownComponentInstance(type)) {
    return (
      isTplFromComponent(node, type.component) ||
      (opts?.allowRootWrapper &&
        isTplComponent(node) &&
        isTplFromComponent(resolveTplRoot(node), type.component))
    );
  } else if (isKnownPlumeInstance(type)) {
    return (
      isTplComponent(node) &&
      (node.component.plumeInfo?.type === type.plumeType ||
        (opts?.allowRootWrapper &&
          isTplComponent(node.component.tplTree) &&
          node.component.tplTree.component.plumeInfo?.type === type.plumeType))
    );
  } else {
    return false;
  }
}

export function typesEqual(t1: Type, t2: Type): boolean {
  if (t1.name !== t2.name) {
    return false;
  }
  const typesDidntMatchMessage = "Type name didn't match instance class";
  if (isGenericType(t1)) {
    assert(isGenericType(t2), typesDidntMatchMessage);
    if (isKnownArgType(t1)) {
      assert(isKnownArgType(t2), typesDidntMatchMessage);
      return t1.argName === t2.argName && typesEqual(t1.type, t2.type);
    } else if (isKnownRenderFuncType(t1)) {
      assert(isKnownRenderFuncType(t2), typesDidntMatchMessage);
      return (
        t1.params.length === t2.params.length &&
        t1.params.every(
          (p, i) =>
            p.argName === t2.params[i].argName &&
            typesEqual(p.type, t2.params[i].type)
        ) &&
        t1.allowed.length === t2.allowed.length &&
        t1.allowed.every((c, i) => typesEqual(c, t2.allowed[i]))
      );
    } else {
      assert(
        !isKnownArgType(t2) && !isKnownRenderFuncType(t2),
        typesDidntMatchMessage
      );
      if (t1.params.length !== t2.params.length) {
        return false;
      }
      const params: (ComponentInstance | PlumeInstance | ArgType)[] = t1.params;
      return params.every(
        // TODO: ignore order for union types
        (p, i) => !!t2.params[i] && typesEqual(p, t2.params[i])
      );
    }
  }
  if (isChoiceType(t1)) {
    assert(isChoiceType(t2), typesDidntMatchMessage);
    return isEqual(t1.options, t2.options);
  }
  if (isKnownPlumeInstance(t1)) {
    assert(isKnownPlumeInstance(t2), typesDidntMatchMessage);
    return t1.plumeType === t2.plumeType;
  }
  if (isKnownComponentInstance(t1)) {
    assert(isKnownComponentInstance(t2), typesDidntMatchMessage);
    return t1.component === t2.component;
  }
  if (isKnownClassNamePropType(t1)) {
    assert(isKnownClassNamePropType(t2), typesDidntMatchMessage);
    // deep compare selectors, which includes the selector and the label
    return (
      t1.selectors.length === t2.selectors.length &&
      t1.selectors.every(
        (s, i) =>
          s.label === t2.selectors[i].label &&
          s.selector === t2.selectors[i].selector &&
          objsEq(s.defaultStyles, t2.selectors[i].defaultStyles)
      ) &&
      objsEq(t1.defaultStyles, t2.defaultStyles)
    );
  }
  if (isKnownStyleScopeClassNamePropType(t1)) {
    assert(isKnownStyleScopeClassNamePropType(t2), typesDidntMatchMessage);
    return t1.scopeName === t2.scopeName;
  }
  if (isKnownDefaultStylesClassNamePropType(t1)) {
    assert(isKnownDefaultStylesClassNamePropType(t2), typesDidntMatchMessage);
    return t1.includeTagStyles === t2.includeTagStyles;
  }

  return true;
}
