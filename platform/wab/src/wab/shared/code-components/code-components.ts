import { TokenType } from "@/wab/commons/StyleToken";
import { removeFromArray } from "@/wab/commons/collections";
import * as cssPegParser from "@/wab/gen/cssPegParser";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { getSlotParams, isSlot } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { ensureVariantSetting, mkBaseVariant } from "@/wab/shared/Variants";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import {
  allCustomFunctions,
  componentToReferencers,
  componentToTplComponents,
  computedProjectFlags,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import {
  isBuiltinCodeComponent,
  isBuiltinCodeComponentImportPath,
} from "@/wab/shared/code-components/builtin-code-components";
import {
  ensureOnlyValidCodeComponentVariantsInComponent,
  getInvalidCodeComponentVariantsInComponent,
} from "@/wab/shared/code-components/variants";
import { paramToVarName, toVarName } from "@/wab/shared/codegen/util";
import {
  CustomError,
  assert,
  ensure,
  ensureArray,
  hackyCast,
  isArrayOfStrings,
  isNumeric,
  maybe,
  mkShortId,
  objsEq,
  removeWhere,
  switchType,
  tuple,
  uncheckedCast,
  unexpected,
  withoutNils,
  xDifference,
} from "@/wab/shared/common";
import {
  Background,
  BackgroundLayer,
  ColorFill,
  NoneBackground,
} from "@/wab/shared/core/bg-styles";
import {
  CodeComponent,
  ComponentType,
  PlumeComponent,
  getCodeComponentImportName,
  getComponentDisplayName,
  getDefaultComponent,
  getDependencyComponents,
  getRealParams,
  isCodeComponent,
  isContextCodeComponent,
  isHostLessCodeComponent,
  isPlainComponent,
  isPlumeComponent,
  mkComponent,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { ExprCtx, asCode } from "@/wab/shared/core/exprs";
import {
  ParamExportType,
  mkParam,
  mkParamsForState,
} from "@/wab/shared/core/lang";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  allComponents,
  isHostLessPackage,
  writeable,
} from "@/wab/shared/core/sites";
import {
  StateAccessType,
  StateVariableType,
  addComponentState,
  mkNamedState,
  removeComponentStateOnly,
  updateStateAccessType,
} from "@/wab/shared/core/states";
import {
  CONTENT_LAYOUT_FULL_BLEED,
  CONTENT_LAYOUT_WIDE,
  isValidStyleProp,
} from "@/wab/shared/core/style-props";
import {
  changeTokenUsage,
  extractTokenUsages,
  mkRuleSet,
  parseCssValue,
} from "@/wab/shared/core/styles";
import {
  EventHandlerKeyType,
  TplTagType,
  cloneType,
  findAllInstancesOfComponent,
  flattenTpls,
  getTplComponentsInSite,
  isEventHandlerKeyForAttr,
  isEventHandlerKeyForFuncType,
  isEventHandlerKeyForParam,
  isTplComponent,
  isTplSlot,
  mkSlot,
  mkTplComponentX,
  mkTplInlinedText,
  mkTplTagX,
} from "@/wab/shared/core/tpls";
import { getCssInitial, normProp, parseCssShorthand } from "@/wab/shared/css";
import { AddItemPrefs, getDefaultStyles } from "@/wab/shared/default-styles";
import { standardCorners, standardSides } from "@/wab/shared/geom";
import { convertSelfContainerType } from "@/wab/shared/layoututils";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  AnyType,
  ArgType,
  BoolType,
  Choice,
  CodeComponentHelper,
  CodeComponentMeta,
  CodeComponentVariantMeta,
  CodeLibrary,
  CollectionExpr,
  ColorPropType,
  Component,
  ComponentInstance,
  CustomCode,
  CustomFunction,
  DateRangeStrings,
  DateString,
  DefaultStylesClassNamePropType,
  EventHandler,
  Expr,
  FigmaComponentMapping,
  FunctionType,
  HostLessPackageInfo,
  HrefType,
  Img,
  Interaction,
  ClassNamePropType as ModelClassNamePropType,
  StyleScopeClassNamePropType as ModelStyleScopeClassNamePropType,
  NamedState,
  Num,
  Param,
  QueryData,
  RenderExpr,
  SelectorRuleSet,
  Site,
  State,
  StyleToken,
  TargetType,
  Text,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Type,
  Var,
  VarRef,
  Variant,
  VariantsRef,
  ensureKnownPropParam,
  ensureKnownTplTag,
  isKnownClassNamePropType,
  isKnownPropParam,
  isKnownStateParam,
  isKnownStyleExpr,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import {
  convertTsToWabType,
  typeFactory,
  typesEqual,
} from "@/wab/shared/model/model-util";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import { canComponentTakeRef } from "@/wab/shared/react-utils";
import { CodeLibraryRegistration } from "@/wab/shared/register-library";
import { isValidJsIdentifier } from "@/wab/shared/utils/regex-js-identifier";
import type {
  ComponentMeta,
  ComponentRegistration,
  ContextDependentConfig,
  CustomFunctionRegistration,
  GlobalContextMeta,
  GlobalContextRegistration,
  PlasmicElement,
  PropType,
  StateSpec,
  TokenRegistration,
} from "@plasmicapp/host";
import type {
  CodeComponentElement,
  ContainerElement,
  DefaultComponentElement,
} from "@plasmicapp/host/dist/element-types";
import type {
  CustomControl,
  CustomType,
  PropTypeBase,
  PropTypeBaseDefault,
} from "@plasmicapp/host/dist/prop-types";
import { RefActionRegistration } from "@plasmicapp/host/registerComponent";
import {
  BaseParam,
  ParamType,
  VoidType,
} from "@plasmicapp/host/registerFunction";
import {
  assign,
  clone,
  groupBy,
  isArray,
  isEqual,
  isNil,
  isObject,
  isString,
  omit,
  partition,
  pick,
  range,
  uniqBy,
} from "lodash";
import memoizeOne from "memoize-one";
import React, { CSSProperties } from "react";
import semver from "semver";
import stripCssComments from "strip-css-comments";
import {
  FailableArgParams,
  IFailable,
  failable,
  failableAsync,
  mapMultiple,
} from "ts-failable";
import type { Opaque } from "type-fest";

export type VariablePropType<P> = PropTypeBaseDefault<P, VarRef> & {
  type: "variable";
  variableTypes?: StateVariableType[];
};
export type VariantGroupPropType<P> = PropTypeBaseDefault<P, Var> & {
  type: "variantGroup";
};
export type VariantPropType<P> = PropTypeBaseDefault<P, VariantsRef> & {
  type: "variant";
  variantGroup?: ContextDependentConfig<P, VarRef>;
  variantTypes?: Array<"toggle" | "single" | "multi">;
};
export type InteractionExprValuePropType<P> = PropTypeBaseDefault<P, Expr> & {
  type: "interactionExprValue";
  currentInteraction: ContextDependentConfig<P, Interaction>;
  eventHandlerKey: ContextDependentConfig<P, EventHandlerKeyType>;
  dataPicker?: boolean;
  isBodyFunction?: boolean;
  hidePreview?: boolean;
  isRunCodeInteraction?: boolean;
};
export type VarRefPropType<P> = PropTypeBaseDefault<P, VarRef> & {
  type: "varRef";
  options: ContextDependentConfig<P, Var[]>;
};
export type FunctionArgumentsPropType<P> = PropTypeBaseDefault<
  P,
  CollectionExpr
> & {
  type: "functionArgs";
  functionType: ContextDependentConfig<P, FunctionType | undefined>;
  currentInteraction: ContextDependentConfig<P, Interaction>;
  eventHandlerKey: ContextDependentConfig<P, EventHandlerKeyType>;
  isFunctionTypeAttachedToModel: boolean;
  hidePropName?: boolean;
  parametersMeta?: ContextDependentConfig<
    P,
    RefActionRegistration<P>["argTypes"] | undefined
  >;
  // the editors are rendered for code components
  // which means we can't expose internal model data
  forExternal?: boolean;
  targetTpl?: ContextDependentConfig<P, TplTag | TplComponent>;
};
export type DataSourceOpPropType<P> = PropTypeBaseDefault<P, Expr> & {
  type: "dataSourceOp";
  currentInteraction: ContextDependentConfig<P, Interaction>;
  eventHandlerKey: ContextDependentConfig<P, EventHandlerKeyType>;
  allowWriteOps?: boolean;
  allowedOps?: ContextDependentConfig<P, string[]>;
};
export type FunctionPropType<P> = PropTypeBaseDefault<P, Expr> & {
  type: "function";
  control?: StudioPropType<any>;
} & (
    | {
        argTypes: {
          name: string;
          type: StudioPropType<any>;
        }[];
      }
    | {
        argNames: string[];
        argValues: any[] | ContextDependentConfig<P, any>;
      }
  );

export type DynamicPropType<P> = PropTypeBase<P> & {
  type: "dynamic";
  control: ContextDependentConfig<P, StudioPropType<any>>;
};

export type ClassNamePropType<P> = PropTypeBase<P> & {
  type: "class";
  selectors?: {
    label?: string;
    selector: string;
    defaultStyles?: CSSProperties;
  }[];
  defaultStyles?: CSSProperties;
};

export type StyleScopeClassNamePropType<P> = PropTypeBase<P> & {
  type: "styleScopeClass";
  scopeName: string;
};

export type ThemeResetClassNamePropType<P> = PropTypeBase<P> & {
  type: "themeResetClass";
  targetAllTags?: boolean;
};

export type ThemeStylesPropType<P> = PropTypeBase<P> & {
  type: "themeStyles";
};

export type EventHandlerPropType<P> = PropType<P> & {
  type: "eventHandler";
  argTypes: { name: string; type: StudioPropType<any> }[];
};

export type DataSourceOpDataType<P> = PropTypeBase<P> & {
  type: "dataSourceOpData";
  allowedOps?: ContextDependentConfig<P, string[]>;
};

export interface HighlightInteractionRequest {
  eventHandler: EventHandler;
  interaction: Interaction;
  argName: string | undefined;
}

export type InteractionPropType<P> = PropTypeBaseDefault<P, EventHandler> & {
  type: "interaction";
  highlightOnMount?: ContextDependentConfig<
    P,
    HighlightInteractionRequest | undefined
  >;
  forceOpen: ContextDependentConfig<P, boolean>;
  eventHandlerKey: EventHandlerKeyType;
};

export type ControlModePropType<P> = PropTypeBase<P> & {
  type: "controlMode";
};

export type HrefPropType<P> = PropTypeBase<P> & {
  type: "href";
};

export type DateStringPropType<P> = PropTypeBase<P> & {
  type: "dateString";
};

export type DateRangeStringsPropType<P> = PropTypeBase<P> & {
  type: "dateRangeStrings";
};

export type TargetPropType<P> = PropTypeBase<P> & {
  type: "target";
};

export type QueryInvalidationPropType<P> = PropTypeBase<P> & {
  type: "queryInvalidation";
  currentInteraction: ContextDependentConfig<P, Interaction>;
  eventHandlerKey: ContextDependentConfig<P, EventHandlerKeyType>;
};

export type TplRefPropType<P> = PropTypeBase<P> & {
  type: "tpl";
};

export type CodeEditorPropType<P> = PropTypeBaseDefault<P, any> & {
  type: "code";
  lang: "css" | "html" | "javascript" | "json";
  control?: "default" | "sidebar";
};

export type FormDataConnectionPropType<P> = PropTypeBase<P> & {
  type: "formDataConnection";
};

export type StudioPropType<P> =
  | PropType<P>
  | VariablePropType<P>
  | VariantGroupPropType<P>
  | VariantPropType<P>
  | InteractionExprValuePropType<P>
  | VarRefPropType<P>
  | FunctionArgumentsPropType<P>
  | ClassNamePropType<P>
  | StyleScopeClassNamePropType<P>
  | ThemeResetClassNamePropType<P>
  | EventHandlerPropType<P>
  | ThemeStylesPropType<P>
  | DataSourceOpPropType<P>
  | InteractionPropType<P>
  | HrefPropType<P>
  | TplRefPropType<P>
  | QueryInvalidationPropType<P>
  | FunctionPropType<P>
  | DataSourceOpDataType<P>
  | CodeEditorPropType<P>
  | TargetPropType<P>
  | ControlModePropType<P>
  | FormDataConnectionPropType<P>
  | DynamicPropType<P>;

type BuiltinComponentsType = Record<string, ComponentRegistration>;

export class CodeComponentsRegistry {
  constructor(
    private win: Window | typeof globalThis,
    private builtinComponents: BuiltinComponentsType
  ) {}

  getRegisteredCodeComponents = memoizeOne((removeDuplicates = true) => {
    if (uncheckedCast<any>(this.win).__PlasmicComponentRegistry == null) {
      return [];
    }
    const registeredCodeComponents: ComponentRegistration[] = [
      ...ensure(
        uncheckedCast<any>(this.win).__PlasmicComponentRegistry,
        "Plasmic Components Registry not found"
      ),
      ...Object.values(this.builtinComponents),
    ];
    return removeDuplicates
      ? uniqBy(registeredCodeComponents, (cc) => cc.meta.name)
      : registeredCodeComponents;
  });

  getRegisteredCodeComponentsMap = memoizeOne(
    () =>
      new Map(
        this.getRegisteredCodeComponents().map(({ component, meta }) =>
          tuple(meta.name, { impl: component, meta })
        )
      )
  );

  getRegisteredContexts = memoizeOne((removeDuplicates = true) => {
    if (uncheckedCast<any>(this.win).__PlasmicContextRegistry == null) {
      return [];
    }
    const registeredContexts: GlobalContextRegistration[] = ensure(
      uncheckedCast<any>(this.win).__PlasmicContextRegistry,
      "Plasmic Components Registry not found"
    );
    registeredContexts.forEach((cc) => ((cc.meta as any).__isContext = true));
    return removeDuplicates
      ? uniqBy(registeredContexts, (cc) => cc.meta.name)
      : registeredContexts;
  });

  getRegisteredContextsMap = memoizeOne(
    () =>
      new Map(
        this.getRegisteredContexts().map(({ component, meta }) =>
          tuple(meta.name, { impl: component, meta })
        )
      )
  );

  getRegisteredComponentsAndContexts = memoizeOne((removeDuplicates = true) => {
    return removeDuplicates
      ? uniqBy(
          [
            ...this.getRegisteredCodeComponents(removeDuplicates),
            ...this.getRegisteredContexts(removeDuplicates),
          ],
          (c) => c.meta.name
        )
      : [
          ...this.getRegisteredCodeComponents(removeDuplicates),
          ...this.getRegisteredContexts(removeDuplicates),
        ];
  });

  getRegisteredComponentsAndContextsMap = memoizeOne(
    () =>
      new Map([
        ...this.getRegisteredCodeComponents().map(({ component, meta }) =>
          tuple(meta.name, { impl: component, meta })
        ),
        ...this.getRegisteredContexts().map(({ component, meta }) =>
          tuple(meta.name, { impl: component, meta })
        ),
      ])
  );

  getRegisteredTokens = memoizeOne((burstCache?: number) => {
    const tokens = uncheckedCast<any>(this.win).__PlasmicTokenRegistry ?? [];
    return [...tokens] as TokenRegistration[];
  });

  getRegisteredTokensMap = memoizeOne(() => {
    return new Map(this.getRegisteredTokens().map((tok) => [tok.name, tok]));
  });

  getRegisteredFunctions = memoizeOne(() => {
    const functions =
      uncheckedCast<any>(this.win).__PlasmicFunctionsRegistry ?? [];
    return [...functions] as CustomFunctionRegistration[];
  });

  getRegisteredFunctionsMap = memoizeOne(() => {
    return new Map(
      this.getRegisteredFunctions().map((f) => [registeredFunctionId(f), f])
    );
  });

  getRegisteredLibraries = memoizeOne(() => {
    const libs = uncheckedCast<any>(this.win).__PlasmicLibraryRegistry ?? [];
    return [...libs] as CodeLibraryRegistration[];
  });

  getRegisteredLibrariesMap = memoizeOne(() => {
    return new Map(this.getRegisteredLibraries().map((r) => [r.meta.name, r]));
  });

  clear() {
    this.getRegisteredCodeComponents.clear();
    this.getRegisteredCodeComponentsMap.clear();
    this.getRegisteredComponentsAndContexts.clear();
    this.getRegisteredComponentsAndContextsMap.clear();
    this.getRegisteredContexts.clear();
    this.getRegisteredContextsMap.clear();
    this.getRegisteredTokens.clear();
    this.getRegisteredFunctions.clear();
    this.getRegisteredFunctionsMap.clear();
    this.getRegisteredLibraries.clear();
    this.getRegisteredLibrariesMap.clear();
  }
}

// Subset of StudioCtx, which can be used from the server
interface SiteCtx {
  site: Site;
  codeComponentsRegistry: CodeComponentsRegistry;
  change<E = never>(
    f: (args: FailableArgParams<void, E>) => IFailable<void, E>,
    opts?: { noUndoRecord?: boolean }
  ): Promise<IFailable<void, E>>;
  observeComponents(components: Component[]): boolean;
  getRootSubReact(): typeof React;
  tplMgr(): TplMgr;
  getPlumeSite(): Site | undefined;
}

export interface CodeComponentSyncCallbackFns {
  onReset?: () => void;
  onMissingCodeComponents: (
    ctx: SiteCtx,
    missingComponents: CodeComponent[],
    missingContexts: CodeComponent[]
  ) => Promise<IFailable<void, never>>;
  onInvalidReactVersion: (
    ctx: SiteCtx,
    hostLessPkgInfo: HostLessPackageInfo
  ) => Promise<IFailable<void, never>>;
  onCreateCodeComponent?: (
    name: string,
    meta: ComponentMeta<any> | GlobalContextMeta<any>
  ) => void;
  onInvalidComponentImportNames: (componentNames: string[]) => void;
  onAddedNewProps?: () => void;
  onStaleProps: (
    ctx: SiteCtx,
    userStaleDiffs: CodeComponentMetaDiffWithComponent[],
    opts?: { force?: boolean }
  ) => Promise<boolean>;
  onNewDefaultComponents: (message: string) => void;
  onSchemaToTplWarnings: (warnings: SchemaWarning[]) => void;
  onSchemaToTplError: (error: Error) => void;
  onElementStyleWarnings?: (warnings: SchemaWarning[]) => void;
  onInvalidJsonForDefaultValue: (message: string) => void;
  onUpdatedTokens?: (opts: {
    newTokens: StyleToken[];
    updatedTokens: StyleToken[];
    removedTokens: StyleToken[];
  }) => void;
  onUpdatedCustomFunctions?: (opts: {
    newFunctions: CustomFunction[];
    updatedFunctions: CustomFunction[];
    removedFunctions: CustomFunction[];
  }) => void;
  onUpdatedCodeLibraries?: (opts: {
    newLibraries: CodeLibrary[];
    updatedLibraries: CodeLibrary[];
    removedLibraries: CodeLibrary[];
  }) => void;
  confirmRemovedCodeComponentVariants?: (
    removedSelectorsByComponent: [Component, string[]][]
  ) => Promise<IFailable<void, never>>;
  confirmRemovedTokens?: (
    removedSelectorsByComponent: StyleToken[]
  ) => Promise<boolean | undefined>;
}

export class DuplicateCodeComponentError extends CustomError {
  name: "DuplicateCodeComponentError";
  componentName: string;
  constructor(name: string) {
    super(
      "Detected multiple code components registered with the same unique name: " +
        name
    );
    this.componentName = name;
  }
}
export class CodeComponentRegistrationTypeError extends CustomError {
  name: "CodeComponentRegistrationTypeError";
  constructor(message: string) {
    super(message);
  }
}
export class InvalidTokenError extends CustomError {
  name: "InvalidTokenError";
  constructor(public tokenName: string, message: string) {
    super(message);
  }
}

export class InvalidCustomFunctionError extends CustomError {
  name: "InvalidCustomFunctionError";
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCodeLibraryError extends CustomError {
  name: "InvalidCodeLibraryError";
  constructor(message: string) {
    super(message);
  }
}

export async function syncCodeComponents(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns,
  opts?: { force?: boolean }
) {
  return failableAsync<
    void,
    | CodeComponentPropsError
    | DuplicateCodeComponentError
    | InvalidTokenError
    | InvalidCustomFunctionError
    | InvalidCodeLibraryError
  >(async ({ run, success }) => {
    run(typeCheckRegistrations(ctx));
    run(checkUniqueCodeComponentNames(ctx));
    run(checkWhitespacesInImportNames(ctx, fns));
    const newComponents = run(await addNewRegisteredComponents(ctx, fns));
    // The order here is important. We first sync code component variants so that
    // model operations like remove component and swap component can be applied
    // based on the latest cc variants.
    run(await syncCodeComponentsVariants(ctx));
    run(await fixMissingCodeComponents(ctx, fns));
    run(await fixMissingDefaultComponents(ctx, fns));
    run(await fixCodeComponentsVariants(ctx, fns));

    // At this point, we've added all the new components and removed
    // all the removed components.

    run(await refreshCodeComponentMetas(ctx, fns));
    run(await checkComponentPropsAndStates(ctx, newComponents, fns, opts));
    run(await checkParentComponents(ctx));
    run(await refreshDefaultSlotContents(ctx));
    run(await checkReactVersion(ctx, fns));
    run(await upsertRegisteredTokens(ctx, fns));
    run(await upsertRegisteredFunctions(ctx, fns));
    run(await upsertRegisteredLibs(ctx, fns));

    return success();
  });
}

function typeCheckRegistrations(ctx: SiteCtx) {
  return failable<void, CodeComponentRegistrationTypeError>(
    ({ success, failure, run }) => {
      for (const {
        meta,
      } of ctx.codeComponentsRegistry.getRegisteredComponentsAndContexts()) {
        if (!isString(meta.name)) {
          return failure(
            new CodeComponentRegistrationTypeError(
              `meta.name is not a string. Received: ${meta.name}`
            )
          );
        }
        const errorPrefix = `Failed to register code component named "${meta.name}". `;
        if (!isString(meta.importPath)) {
          return failure(
            new CodeComponentRegistrationTypeError(
              errorPrefix +
                `meta.importPath is not a string. Received: ${meta.importPath}`
            )
          );
        }
        if (isNil(meta.props)) {
          return failure(
            new CodeComponentRegistrationTypeError(
              errorPrefix +
                `meta.props is not an object. Received: ${meta.props}`
            )
          );
        }
        const optionalStringProps = [
          "displayName",
          "importName",
          "description",
          "classNameProp",
          "refProp",
        ] as const;
        for (const prop of optionalStringProps) {
          if (!isNil(meta[prop]) && !isString(meta[prop])) {
            return failure(
              new CodeComponentRegistrationTypeError(
                errorPrefix +
                  `meta.${prop} is not a string. Received: ${meta[prop]}`
              )
            );
          }
        }

        run(typeCheckVariantsFromMeta(meta, errorPrefix));

        // PropTypes that can be represented as a string instead of object
        const supportedStringTypes = [
          "string",
          "color",
          "cssColor",
          "number",
          "boolean",
          "object",
          "array",
          "slot",
          "imageUrl",
          "dataSourceOpData",
          "richText",
          "exprEditor",
          "fieldMappings",
          "function",
          "controlMode",
          "href",
          "dateString",
          "dateRangeStrings",
          "dynamic",
        ];
        const checkReactComponent = (val: React.ComponentType<any>) => {
          // Check for React component
          const hostWin = window.parent as typeof window;
          const res = canComponentTakeRef(val, ctx.getRootSubReact(), hostWin);
          return !res.result.isError;
        };
        const supportedTypes = [
          ...supportedStringTypes,
          "choice",
          "code",
          "custom",
          "dataSource",
          "dataSourceOp",
          "dataSelector",
          "cardPicker",
          "class",
          "styleScopeClass",
          "themeResetClass",
          "themeStyles",
          "eventHandler",
          "formValidationRules",
          "function",
          "controlMode",
          "formDataConnection",
        ];
        for (const [propName, propType] of Object.entries(meta.props)) {
          if (
            typeof propType === "string" &&
            !supportedStringTypes.includes(propType)
          ) {
            return failure(
              new CodeComponentRegistrationTypeError(
                errorPrefix +
                  `Unknown type for prop ${propName}. Received: ${propType}`
              )
            );
          }
          if (isReactImplControl(propType)) {
            if (!checkReactComponent(propType)) {
              return failure(
                new CodeComponentRegistrationTypeError(
                  errorPrefix +
                    `Unknown type for prop ${propName}. Received: ${propType}`
                )
              );
            }
          } else if (
            typeof propType !== "string" &&
            (typeof propType !== "object" || isNil(propType))
          ) {
            return failure(
              new CodeComponentRegistrationTypeError(
                errorPrefix +
                  `Unknown type for prop ${propName}. Received: ${propType}`
              )
            );
          }
          if (isPlainObjectPropType(propType)) {
            if (!supportedTypes.includes(propType.type)) {
              return failure(
                new CodeComponentRegistrationTypeError(
                  errorPrefix +
                    `Unknown type for prop ${propName}. Received: ${propType.type}`
                )
              );
            }
            if (propType.type === "slot") {
              if (
                !isNil(propType.allowedComponents) &&
                !isArrayOfStrings(propType.allowedComponents)
              ) {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "slot" type. \`PropType.allowedComponents\` expects an array of strings, but received: ${propType.allowedComponents}`
                  )
                );
              }
            } else {
              if (propType.hidden && typeof propType.hidden !== "function") {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "hidden" value - expects a function but got: ${propType.hidden}`
                  )
                );
              }
              if (
                propType.type === "dataSelector" &&
                !isObject(propType.data) &&
                typeof propType.data !== "function"
              ) {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "data" type. \`PropType.data\` expects an object or a function, but received: ${propType.data}`
                  )
                );
              }
              if (propType.type === "choice") {
                if (
                  !isArrayOfStrings(propType.options) &&
                  !(
                    Array.isArray(propType.options) &&
                    propType.options.every(
                      (option) =>
                        typeof option.label === "string" &&
                        ["number", "string", "boolean"].includes(
                          typeof option.value
                        )
                    )
                  ) &&
                  !(typeof propType.options === "function")
                ) {
                  return failure(
                    new CodeComponentRegistrationTypeError(
                      errorPrefix +
                        `Prop ${propName} has invalid "choice" type. \`PropType.options\` expects an array of strings, a label-value pair or a function, but received: ${propType.options}`
                    )
                  );
                }
              }
              if (propType.type === "code" && !isString(propType.lang)) {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "code" type. \`PropType.lang\` expects a string, but received: ${propType.lang}`
                  )
                );
              }
              if (
                propType.type === "dataSource" &&
                !isString(propType.dataSource)
              ) {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "dataSource" type. \`PropType.dataSource\` expects a string, but received: ${propType.dataSource}`
                  )
                );
              }
              if ("editOnly" in propType && propType.editOnly) {
                if (
                  !isNil(propType.uncontrolledProp) &&
                  !isString(propType.uncontrolledProp)
                ) {
                  return failure(
                    new CodeComponentRegistrationTypeError(
                      errorPrefix +
                        `Prop ${propName} has invalid "uncontrolled prop". \`PropType.uncontrolledProp\` expects a string, but received: ${propType.uncontrolledProp}`
                    )
                  );
                }
              }
              if (
                !isNil(propType.displayName) &&
                !isString(propType.displayName)
              ) {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "display name". \`PropType.displayName\` expects a string, but received: ${propType.displayName}`
                  )
                );
              }
              if (
                !isNil(propType.description) &&
                !isString(propType.description)
              ) {
                return failure(
                  new CodeComponentRegistrationTypeError(
                    errorPrefix +
                      `Prop ${propName} has invalid "description". \`PropType.description\` expects a string, but received: ${propType.description}`
                  )
                );
              }
              if (propType.type === "number" || propType.type === "string") {
                if (!isNil(propType.control) && !isString(propType.control)) {
                  return failure(
                    new CodeComponentRegistrationTypeError(
                      errorPrefix +
                        `Numeric prop ${propName} has invalid "control" attr. \`PropType.control\` expects a string, but received: ${propType.control}`
                    )
                  );
                }
              }
              if (propType.type === "number") {
                const checkNumberOrFunction = (attr: string) => {
                  const val = propType[attr];
                  if (
                    !(typeof val === "function") &&
                    !(typeof val === "number")
                  ) {
                    return failure(
                      new CodeComponentRegistrationTypeError(
                        errorPrefix +
                          `Prop ${propName} has invalid "${attr}" attr. \`PropType.${attr}\` expects a number or function, but received: ${val}`
                      )
                    );
                  }
                  return undefined;
                };
                let res =
                  !isNil(propType.min) || propType.control === "slider"
                    ? checkNumberOrFunction("min")
                    : undefined;
                res =
                  res ||
                  (!isNil(propType.max) || propType.control === "slider"
                    ? checkNumberOrFunction("max")
                    : undefined);
                res =
                  res ||
                  (propType.control === "slider" && !isNil(propType.step)
                    ? checkNumberOrFunction("step")
                    : undefined);
                if (res) {
                  return res;
                }
              }
              if (propType.type === "custom") {
                if (!checkReactComponent(propType.control)) {
                  return failure(
                    new CodeComponentRegistrationTypeError(
                      errorPrefix +
                        `Custom control prop ${propName} has invalid "control" attr. \`PropType.control\` expects a React component to render the custom control, but received: ${propType.control}`
                    )
                  );
                }
              }
            }
          }
        }
      }
      return success();
    }
  );
}

/**
 * Fill in the project with any registered code components that don't already
 * exist in Site.components. Returns the new components.
 */
async function addNewRegisteredComponents(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<
    CodeComponent[],
    | UnknownComponentError
    | UnknownComponentPropError
    | CodeComponentRegistrationTypeError
    | DuplicatedComponentParamError
    | CyclicComponentReferencesError
    | BadPresetSchemaError
    | SelfReferencingComponent
    | BadElementSchemaError
  >(async ({ run, success }) => {
    const codeComponents =
      ctx.codeComponentsRegistry.getRegisteredCodeComponents();
    const contexts = ctx.codeComponentsRegistry.getRegisteredContexts();
    const existingCodeComponents = new Set(
      ctx.site.components
        .filter((c) => isCodeComponent(c) && !isContextCodeComponent(c))
        .map((c) => c.name)
    );
    const existingContexts = new Set(
      ctx.site.components.filter(isContextCodeComponent).map((c) => c.name)
    );

    const registrations = [...codeComponents, ...contexts];
    const newComponentRegistrations = registrations.filter((r) => {
      if (isGlobalContextMeta(r.meta)) {
        return !existingContexts.has(r.meta.name);
      } else {
        return !existingCodeComponents.has(r.meta.name);
      }
    });
    if (newComponentRegistrations.length > 0) {
      run(
        await ctx.change<
          | UnknownComponentError
          | UnknownComponentPropError
          | CodeComponentRegistrationTypeError
          | DuplicatedComponentParamError
          | CyclicComponentReferencesError
          | BadPresetSchemaError
          | SelfReferencingComponent
          | BadElementSchemaError
        >(
          ({ run: changeRun, success: changeSuccess }) => {
            const newComponents = newComponentRegistrations.map(
              (r) =>
                [
                  r.meta,
                  createCodeComponent(ctx.site, r.meta.name, r.meta, fns),
                ] as const
            );
            newComponents.forEach(([_meta, c]) =>
              ctx.tplMgr().attachComponent(c)
            );
            ctx.observeComponents(newComponents.map(([_, c]) => c));

            newComponents.forEach(([meta, c]) => {
              c.params = changeRun(
                componentMetaToComponentParams(ctx.site, meta)
              );
              c.states = changeRun(metaToComponentStates(c, meta));
              c.states.forEach((state) => {
                writeable(state.param).state = state;
                ensureKnownPropParam(state.onChangeParam);
              });
              attachRenderableTplSlots(c);
            });
            return changeSuccess();
          },
          { noUndoRecord: true }
        )
      );
    }
    const newComponentNames = new Set(
      newComponentRegistrations.map((r) => r.meta.name)
    );
    return success(
      ctx.site.components
        .filter(isCodeComponent)
        .filter((c) => newComponentNames.has(c.name))
    );
  });
}

function createCodeComponent(
  site: Site,
  name: string,
  meta: ComponentMeta<any> | GlobalContextMeta<any>,
  fns: CodeComponentSyncCallbackFns
) {
  const prefs = site.activeTheme?.addItemPrefs as AddItemPrefs | undefined;
  const styles =
    "defaultStyles" in meta
      ? meta.defaultStyles &&
        parseStylesAndHandleErrors(meta.defaultStyles, "component", fns, {
          prefs,
        })
      : undefined;
  const component = mkCodeComponent(meta.name, meta, {
    parsedDefaultStyles: styles,
    prefs,
  });

  fns.onCreateCodeComponent?.(name, meta);

  return component as CodeComponent;
}

export async function fixMissingCodeComponents(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, never>(async ({ success, run }) => {
    const missingComponents = ctx.site.components.filter(
      (c): c is CodeComponent =>
        !isContextCodeComponent(c) &&
        isCodeComponent(c) &&
        !ctx.codeComponentsRegistry.getRegisteredCodeComponentsMap().has(c.name)
    );

    const missingContexts = ctx.site.components.filter(
      (c): c is CodeComponent =>
        isContextCodeComponent(c) &&
        !ctx.codeComponentsRegistry.getRegisteredContextsMap().has(c.name)
    );

    return success(
      run(
        await fns.onMissingCodeComponents(
          ctx,
          missingComponents,
          missingContexts
        )
      )
    );
  });
}

// Update CC variants meta for all the code components in the site,
// this is done separately from the other code component metas because we need
// special handling for model elements that depend on it
async function syncCodeComponentsVariants(ctx: SiteCtx) {
  return failableAsync<void, never>(async ({ success, run }) => {
    run(
      await ctx.change(
        ({ success: syncedCodeComponentVariantMeta }) => {
          ctx.site.components.forEach((c) => {
            if (isCodeComponent(c)) {
              const meta = ctx.codeComponentsRegistry
                .getRegisteredComponentsAndContextsMap()
                .get(c.name)?.meta;
              const ccVariants = meta
                ? mkCodeComponentVariantsFromMeta(meta)
                : {};
              if (
                !instUtil.deepEquals(
                  c.codeComponentMeta.variants,
                  ccVariants,
                  true
                )
              ) {
                c.codeComponentMeta.variants = ccVariants;
              }
            }
          });
          return syncedCodeComponentVariantMeta();
        },
        { noUndoRecord: true }
      )
    );

    return success();
  });
}

async function fixCodeComponentsVariants(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, never>(async ({ success, run }) => {
    const removedSelectorsByComponent: [Component, string[]][] = [];

    const componentsToObserve: Component[] = [];

    ctx.site.components.forEach((c) => {
      if (!isCodeComponent(c)) {
        const { unregisterdKeys } =
          getInvalidCodeComponentVariantsInComponent(c);

        if (unregisterdKeys.length > 0) {
          removedSelectorsByComponent.push([c, unregisterdKeys]);
          componentsToObserve.push(c);
        }
      }
    });

    if (removedSelectorsByComponent.length > 0) {
      await fns.confirmRemovedCodeComponentVariants?.(
        removedSelectorsByComponent
      );
    }

    ctx.observeComponents(componentsToObserve);

    run(
      await ctx.change(
        ({ success: removedInvalidVariants }) => {
          componentsToObserve.forEach((c) => {
            ensureOnlyValidCodeComponentVariantsInComponent(ctx.site, c);
          });
          return removedInvalidVariants();
        },
        { noUndoRecord: true }
      )
    );

    return success();
  });
}

async function refreshCodeComponentMetas(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  const tplMgr = new TplMgr({ site: ctx.site });
  const componentsToUpdate = withoutNils(
    ctx.site.components.map((c) => {
      if (!isCodeComponent(c) && !isPlumeComponent(c)) {
        return undefined;
      }
      const meta = isCodeComponent(c)
        ? ctx.codeComponentsRegistry
            .getRegisteredComponentsAndContextsMap()
            .get(c.name)?.meta
        : makePlumeComponentMeta(c);
      if (!meta) {
        return undefined;
      }
      return { component: c, meta };
    })
  );
  const componentsToRename: Component[] = [];

  return ctx.change<never>(
    ({ success, run }) => {
      componentsToUpdate.forEach(({ component, meta }) => {
        const mustBeNamed = run(
          refreshCodeComponentMeta(ctx.site, component, meta, fns)
        );
        if (mustBeNamed) {
          componentsToRename.push(component);
        }
      });

      const allComponentInstances = componentsToRename.map((component) => {
        return {
          component,
          allInstances: findAllInstancesOfComponent(ctx.site, component),
        };
      });
      ctx.observeComponents(
        allComponentInstances.flatMap(({ allInstances }) =>
          allInstances
            .filter(({ tpl }) => !tpl.name)
            .map(({ referencedComponent }) => referencedComponent)
        )
      );
      allComponentInstances.forEach(({ allInstances }) => {
        allInstances.forEach(({ referencedComponent, tpl }) => {
          if (!tpl.name) {
            tplMgr.renameTpl(
              referencedComponent,
              tpl,
              getComponentDisplayName(tpl.component)
            );
          }
        });
      });

      return success();
    },
    { noUndoRecord: true }
  );
}

function refreshCodeComponentMeta(
  site: Site,
  c: Component,
  meta: ComponentMeta<any>,
  fns: Pick<CodeComponentSyncCallbackFns, "onElementStyleWarnings">
) {
  return failable<boolean, never>(({ success }) => {
    let mustBeNamed = false;
    if (isCodeComponent(c)) {
      c.codeComponentMeta.importPath = meta.importPath;
      c.codeComponentMeta.defaultExport = !!meta.isDefaultExport;
      // Default to null to avoid unnecessary bundle changes
      c.codeComponentMeta.refProp = meta.refProp ?? null;
      c.codeComponentMeta.classNameProp = meta.classNameProp ?? null;
      c.codeComponentMeta.importName = meta.importName ?? null;
      c.codeComponentMeta.displayName = meta.displayName ?? null;
      c.codeComponentMeta.description = meta.description ?? null;
      c.codeComponentMeta.section = meta.section ?? null;
      c.codeComponentMeta.thumbnailUrl = meta.thumbnailUrl ?? null;
      c.codeComponentMeta.isAttachment = !!meta.isAttachment;
      c.codeComponentMeta.providesData = !!meta.providesData;
      c.codeComponentMeta.isRepeatable = meta.isRepeatable ?? true;
      c.codeComponentMeta.styleSections =
        meta.styleSections === false ? false : meta.styleSections ? true : null;
      c.codeComponentMeta.defaultDisplay = meta.defaultDisplay ?? null;
      if (!c.codeComponentMeta.hasRef && meta.refActions) {
        mustBeNamed = true;
      }
      c.codeComponentMeta.hasRef = !!(meta as any).refActions;

      // Explicitly not handling defaultSlotContents, which is handled by
      // refreshDefaultSlotContents()
      if (meta.componentHelpers) {
        const componentHelpers = mkCodeComponentHelperFromMeta(meta);
        if (
          !c.codeComponentMeta.helpers ||
          !instUtil.deepEquals(
            c.codeComponentMeta.helpers,
            componentHelpers,
            true
          )
        ) {
          c.codeComponentMeta.helpers = componentHelpers;
        }
      } else {
        c.codeComponentMeta.helpers = null;
      }

      const maybeStylesObj =
        meta.defaultStyles &&
        parseStylesAndHandleErrors(meta.defaultStyles, "component", fns, {
          prefs: site.activeTheme?.addItemPrefs as AddItemPrefs | undefined,
        });
      const defaultStyles = maybeStylesObj
        ? mkRuleSet({
            values: Object.fromEntries(
              Object.entries(maybeStylesObj).map(([key, val]) => [
                key,
                "" + val,
              ])
            ),
          })
        : null;
      if (
        !instUtil.deepEquals(
          c.codeComponentMeta.defaultStyles,
          defaultStyles,
          true
        )
      ) {
        c.codeComponentMeta.defaultStyles = defaultStyles;
      }
    }

    // Sync meta that's common to Plume and code components
    const figmaMappings = (meta.figmaMappings ?? []).map(
      (m) =>
        new FigmaComponentMapping({
          figmaComponentName: m.figmaComponentName,
        })
    );
    if (!instUtil.deepEquals(c.figmaMappings, figmaMappings, true)) {
      c.figmaMappings = figmaMappings;
    }
    c.alwaysAutoName = (meta as any).alwaysAutoName ?? false;
    // Keeping `trapsSelection` for backwards compatibility with Antd5/Plume which uses this name
    c.trapsFocus = meta.trapsFocus ?? (meta as any).trapsSelection ?? false;
    return success(mustBeNamed);
  });
}

function checkUniqueCodeComponentNames(ctx: SiteCtx) {
  return failable<void, DuplicateCodeComponentError>(({ success, failure }) => {
    const namesToMetas = new Map<string, ComponentMeta<any>>();
    for (const registration of ctx.codeComponentsRegistry.getRegisteredComponentsAndContexts(
      false
    )) {
      const name = registration.meta.name;
      const existingMeta = namesToMetas.get(name);
      if (existingMeta && !isEqual(existingMeta, registration.meta)) {
        return failure(new DuplicateCodeComponentError(name));
      }
      namesToMetas.set(name, registration.meta);
    }
    const hostLessComponents = walkDependencyTree(ctx.site, "all")
      .filter((dep) => isHostLessPackage(dep.site))
      .flatMap((dep) => dep.site.components.filter((c) => isCodeComponent(c)));
    for (const hostLessComponent of hostLessComponents) {
      const name = hostLessComponent.name;
      if (
        namesToMetas.get(name) &&
        !isBuiltinCodeComponent(hostLessComponent)
      ) {
        return failure(new DuplicateCodeComponentError(name));
      }
    }
    return success();
  });
}

function checkWhitespacesInImportNames(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failable<void, never>(({ success }) => {
    const badComponents = ctx.site.components
      .filter(isCodeComponent)
      .filter((c) => {
        const importName = getCodeComponentImportName(c);
        return importName.length === 0 || !isValidJsIdentifier(importName);
      });
    if (badComponents.length > 0) {
      fns.onInvalidComponentImportNames(
        badComponents.map((c) => getComponentDisplayName(c))
      );
    }
    return success();
  });
}

function fixMissingDefaultComponents(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, never>(async ({ success }) => {
    const components = ctx.site.components.filter(isCodeComponent);
    const missingDefaultComponents = new Map<string, Component[]>();
    components.forEach((c) => {
      const { meta } = ensure(
        ctx.codeComponentsRegistry
          .getRegisteredComponentsAndContextsMap()
          .get(c.name),
        "Missing code component " + c.name
      );
      Object.entries(meta.props).forEach(([_, metaProp]) => {
        if (
          isPlainObjectPropType(metaProp) &&
          metaProp.type === "slot" &&
          metaProp.defaultValue
        ) {
          flattenElementSchema(metaProp.defaultValue).forEach((schema) => {
            if (
              typeof schema === "object" &&
              schema.type === "default-component"
            ) {
              const defaultComponent = ctx.site.defaultComponents[schema.kind];
              if (
                !defaultComponent &&
                !ctx.site.components.find(
                  (component) => component.plumeInfo?.type === schema.kind
                )
              ) {
                if (!missingDefaultComponents.has(schema.kind)) {
                  missingDefaultComponents.set(schema.kind, []);
                }
                ensure(
                  missingDefaultComponents.get(schema.kind),
                  `The key ${schema.kind} should be added previously`
                ).push(c);
              }
            }
          });
        }
      });
    });
    if (missingDefaultComponents.size > 0 && !isHostLessPackage(ctx.site)) {
      // We only need to add the missing default components for real projects;
      // sites that are hostless packages don't need to
      const plumeSite = ctx.getPlumeSite();
      await ctx.change(
        ({ success: changeSuccess }) => {
          missingDefaultComponents.forEach((missingComponents, kind) => {
            const plumeComponent = plumeSite?.components.find(
              (component) => component.plumeInfo?.type === kind
            );
            assert(plumeComponent, `Not found Plume component of kind ${kind}`);
            ctx
              .tplMgr()
              .clonePlumeComponent(
                plumeSite,
                plumeComponent.uuid,
                plumeComponent.name,
                true
              );
            fns.onNewDefaultComponents?.(
              `A ${kind} component was added to your project because it will be used as default component for ${missingComponents
                .map((c) => getComponentDisplayName(c))
                .join(",")}.`
            );
          });
          return changeSuccess();
        },
        {
          noUndoRecord: true,
        }
      );
    }
    return success();
  });
}

async function checkParentComponents(ctx: SiteCtx) {
  return failableAsync<
    void,
    UnknownComponentError | CyclicComponentReferencesError
  >(async ({ success, run }) => {
    const [notSeen, inProgess, completed] = [0, 1, 2] as const;
    const compStatus = new Map<string, number>();
    const metas = ctx.codeComponentsRegistry
      .getRegisteredCodeComponents()
      .map((r) => r.meta);
    const ccMap = ctx.codeComponentsRegistry.getRegisteredCodeComponentsMap();
    const dfs = (meta: ComponentMeta<any>) =>
      failable<void, UnknownComponentError | CyclicComponentReferencesError>(
        ({ success: dfsSuccess, run: dfsRun, failure }) => {
          const status = compStatus.get(meta.name) ?? notSeen;
          if (status === completed || meta.parentComponentName == null) {
            return dfsSuccess();
          }
          if (status === inProgess) {
            return failure(
              new CyclicComponentReferencesError(
                "Some registered components cyclically depend on each other via `meta.parentComponentName`"
              )
            );
          }
          const parentMeta = ccMap.get(meta.parentComponentName)?.meta;
          if (!parentMeta) {
            return failure(new UnknownComponentError(meta.parentComponentName));
          }
          compStatus.set(meta.name, inProgess);
          dfsRun(dfs(parentMeta));
          compStatus.set(meta.name, completed);
          return dfsSuccess();
        }
      );
    for (const meta of metas) {
      run(dfs(meta));
    }
    await ctx.change<never>(
      ({ success: changeSuccess }) => {
        const codeComponents = ctx.site.components.filter(isCodeComponent);
        const codeComponentsByName = new Map<string, CodeComponent>(
          codeComponents.map((c) => [c.name, c] as const)
        );
        const removeSuperComp = (c: Component) => {
          if (c.superComp) {
            removeWhere(c.superComp.subComps, (sub) => sub === c);
            c.superComp = null;
          }
        };
        codeComponents.forEach((c) => {
          const parent = maybe(
            ccMap.get(c.name)?.meta.parentComponentName,
            (parentName) => codeComponentsByName.get(parentName)
          );
          if (parent && parent !== c.superComp) {
            removeSuperComp(c);
            parent.subComps.push(c);
            c.superComp = parent;
          } else if (!parent) {
            removeSuperComp(c);
          }
        });
        return changeSuccess();
      },
      { noUndoRecord: true }
    );
    return success();
  });
}

async function checkReactVersion(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, never>(async ({ success }) => {
    for (const dep of ctx.site.projectDependencies) {
      if (
        dep.site.hostLessPackageInfo?.minimumReactVersion &&
        semver.lt(
          ctx.getRootSubReact().version,
          dep.site.hostLessPackageInfo.minimumReactVersion
        )
      ) {
        await fns.onInvalidReactVersion(ctx, dep.site.hostLessPackageInfo);
      }
    }
    return success();
  });
}

interface StateChanges {
  addedStates: State[];
  removedStates: State[];
  updatedStates: {
    before: State;
    after: State;
  }[];
}

export function compareComponentStatesWithMeta(
  site: Site,
  component: Component,
  meta: ComponentMeta<any>
) {
  return failable<
    StateChanges,
    UnknownComponentError | UnknownComponentPropError
  >(({ run, success }) => {
    const states = run(metaToComponentStates(component, meta));
    const registeredStates = new Map(
      states.map((s) => tuple(s.param.variable.name, s))
    );
    const existingStates = new Map(
      component.states.map((s) => tuple(s.param.variable.name, s))
    );

    const addedStates = run(getNewStates(site, component, meta));
    const updatedStates = [...existingStates.entries()]
      .filter(([name, s]) => {
        if (registeredStates.has(name)) {
          const registered = ensure(
            registeredStates.get(name),
            "Couldn't find state " + name
          );
          // Code component states don't have implicit states and initial expressions
          // So it's enough to make a shallow comparison between the registered state
          // and the state saved in the model
          if (!objsEq(omit(registered, "uid"), omit(s, "uid"))) {
            return true;
          }
        }
        return false;
      })
      .map(([name, s]) => ({
        before: s,
        after: ensure(
          registeredStates.get(name),
          "Couldn't find state " + name
        ),
      }));
    const removedStates = !isPlumeComponent(component)
      ? [...existingStates.entries()]
          .filter(([name]) => !registeredStates.has(name))
          .map(([_, s]) => s)
      : [];

    return success({
      addedStates,
      removedStates,
      updatedStates,
    });
  });
}

function refreshComponentStates(ctx: SiteCtx) {
  return failable<void, UnknownComponentError | UnknownComponentPropError>(
    ({ success, run }) => {
      const stateChanges: {
        component: Component;
        addedStates: State[];
        removedStates: State[];
        updatedStates: {
          before: State;
          after: State;
        }[];
      }[] = [];
      ctx.site.components
        .filter((c) => isCodeComponent(c) || isPlumeComponent(c))
        .forEach((c) => {
          const meta = isCodeComponent(c)
            ? ensure(
                ctx.codeComponentsRegistry
                  .getRegisteredComponentsAndContextsMap()
                  .get(c.name),
                "Missing code component " + c.name
              ).meta
            : makePlumeComponentMeta(c);
          const stateChange = {
            component: c,
            ...run(compareComponentStatesWithMeta(ctx.site, c, meta)),
          };
          if (hasStateChanges(stateChange)) {
            stateChanges.push(stateChange);
          }
        });

      const changedComponents = Array.from(
        new Set(stateChanges.map(({ component }) => component))
      );
      const parentComponents = changedComponents.flatMap((c) =>
        Array.from(componentToReferencers(ctx.site).get(c) ?? [])
      );
      ctx.observeComponents([...parentComponents, ...changedComponents]);
      stateChanges.forEach((changes) => {
        doUpdateComponentStates(ctx.site, changes.component, changes);
      });
      return success();
    }
  );
}

function hasPropChanges(changes: CodeComponentMetaDiff) {
  return (
    changes.addedProps.length > 0 ||
    changes.updatedProps.length > 0 ||
    changes.removedProps.length > 0
  );
}

function hasStateChanges(changes: StateChanges) {
  return (
    changes.addedStates.length > 0 ||
    changes.updatedStates.length > 0 ||
    changes.removedStates.length > 0
  );
}

function doUpdateComponentStates(
  site: Site,
  component: Component,
  changes: StateChanges
) {
  const { addedStates, removedStates, updatedStates } = changes;
  addedStates.forEach((state) => {
    addComponentState(site, component, state);
    writeable(state.param).state = state;
    ensureKnownPropParam(state.onChangeParam);
  });

  // Don't remove states for Plume components
  if (isCodeComponent(component)) {
    removedStates.forEach((s) =>
      // For code components, params and states are registered separately,
      // and we don't auto-create params for states. So we only need
      // to remove the state without removing the params
      removeComponentStateOnly(site, component, s)
    );
  }
  updatedStates.forEach((updateState) => {
    if (updateState.before.accessType !== updateState.after.accessType) {
      updateStateAccessType(
        site,
        component,
        updateState.before,
        updateState.after.accessType as StateAccessType,
        {
          onChangeProp: updateState.after.onChangeParam?.variable.name,
        }
      );
    }
    Object.assign(updateState.before, omit(updateState.after, "uid"));
  });
}

type CodeComponentPropsError =
  | UnknownComponentError
  | CyclicComponentReferencesError
  | CodeComponentRegistrationTypeError
  | BadElementSchemaError
  | UnknownComponentPropError
  | BadPresetSchemaError
  | SelfReferencingComponent
  | DuplicatedComponentParamError;

async function checkComponentPropsAndStates(
  ctx: SiteCtx,
  newComponents: CodeComponent[],
  fns: CodeComponentSyncCallbackFns,
  opts?: { force?: boolean }
) {
  return failableAsync<void, CodeComponentPropsError>(
    async ({ run, success }) => {
      const componentToMeta = buildComponentToMeta(ctx, { includePlume: true });
      const changes = Array.from(componentToMeta.entries())
        .map(([c, meta]) => {
          const diff = run(compareComponentPropsWithMeta(ctx.site, c, meta));
          return {
            component: c,
            ...diff,
          };
        })
        .filter((change) => hasPropChanges(change));

      const newParams = changes.flatMap((change) =>
        change.addedProps.map((p) => ({
          component: change.component,
          param: p,
        }))
      );

      const staleDiffs = changes.filter(
        (change) =>
          change.updatedProps.length > 0 || change.removedProps.length > 0
      );

      // Some diffs we auto-apply -- for new components, or built-in components
      const [autoApplyDiffs, needsPermissionDiffs] = partition(
        staleDiffs,
        (diff) =>
          isBuiltinCodeComponent(diff.component) ||
          isPlumeComponent(diff.component) ||
          (isCodeComponent(diff.component) &&
            newComponents.includes(diff.component))
      );

      const doUpdateNeedsPermissionProps =
        needsPermissionDiffs.length > 0
          ? await fns.onStaleProps(ctx, needsPermissionDiffs, opts)
          : true;

      run(
        await ctx.change<CodeComponentPropsError>(
          ({ success: changeSuccess, run: changeRun }) => {
            const changedComponents = Array.from(
              new Set(changes.map(({ component }) => component))
            );
            const parentComponents = changedComponents.flatMap((c) =>
              Array.from(componentToReferencers(ctx.site).get(c) ?? [])
            );
            ctx.observeComponents([...parentComponents, ...changedComponents]);
            // First pass registers all new props (which are safe and needed
            // to instantiate `TplComponent`s in the default slot contents).
            newParams.forEach(({ component, param }) => {
              component.params.push(param);
              if (isCodeComponent(component)) {
                attachRenderableTplSlots(component);
              }
            });

            // We've already added the new params, no don't pass in addedProps
            changeRun(
              doUpdateComponentsProps(
                ctx,
                autoApplyDiffs.map((diff) => ({ ...diff, addedProps: [] }))
              )
            );

            if (doUpdateNeedsPermissionProps) {
              changeRun(
                doUpdateComponentsProps(
                  ctx,
                  needsPermissionDiffs.map((diff) => ({
                    ...diff,
                    addedProps: [],
                  }))
                )
              );
            }

            // Refresh component states in the same ctx.change(), as there
            // is a lot of interdependencies between state and params
            changeRun(refreshComponentStates(ctx));
            return changeSuccess();
          },
          { noUndoRecord: true }
        )
      );
      return success();
    }
  );
}

function checkDefaultSlotContents(
  ctx: SiteCtx,
  component: Component,
  contents: Record<string, PlasmicElement | PlasmicElement[]>
) {
  return failable<
    void,
    | CyclicComponentReferencesError
    | BadPresetSchemaError
    | UnknownComponentError
    | SelfReferencingComponent
    | UnknownComponentPropError
    | BadElementSchemaError
  >(({ success, run }) => {
    for (let elts of Object.values(contents)) {
      if (!Array.isArray(elts)) {
        elts = [elts];
      }
      for (const elt of elts) {
        run(checkElementSchemaToTpl(ctx.site, component, elt));
      }
    }
    return success();
  });
}

function buildComponentToMeta(
  ctx: SiteCtx,
  opts?: {
    includePlume?: boolean;
  }
) {
  const map = new Map<Component, ComponentMeta<any> | GlobalContextMeta<any>>();
  for (const comp of ctx.site.components) {
    if (isCodeComponent(comp)) {
      const { meta } = ensure(
        ctx.codeComponentsRegistry
          .getRegisteredComponentsAndContextsMap()
          .get(comp.name),
        "Missing code component " + comp.name
      );
      map.set(comp, meta);
    } else if (opts?.includePlume && isPlumeComponent(comp)) {
      map.set(comp, makePlumeComponentMeta(comp));
    }
  }
  return map;
}

function checkElementSchemaToTpl(
  site: Site,
  component: Component,
  rootSchema: PlasmicElement
) {
  return failable<
    TplNode,
    | BadPresetSchemaError
    | UnknownComponentError
    | SelfReferencingComponent
    | UnknownComponentPropError
    | BadElementSchemaError
  >(({ success, run, failure }) => {
    const { tpl, warnings } = run(
      elementSchemaToTpl(site, component, rootSchema, {
        codeComponentsOnly: true,
        ignoreDefaultComponents: isHostLessPackage(site),
      })
    );
    if (warnings.length > 0) {
      const warning = warnings[0];
      return failure(
        new BadElementSchemaError(
          warning.message,
          warning.description,
          warning.shouldLogError
        )
      );
    }
    return success(tpl);
  });
}

export interface CodeComponentMetaDiff {
  addedProps: Param[];
  removedProps: Param[];
  updatedProps: {
    before: Param;
    after: Param;
  }[];
}

export interface CodeComponentMetaDiffWithComponent
  extends CodeComponentMetaDiff {
  component: Component;
}

export function compareComponentPropsWithMeta(
  site: Site,
  component: Component,
  meta: ComponentMeta<any>
) {
  return failable<
    CodeComponentMetaDiff,
    | UnknownComponentError
    | CodeComponentRegistrationTypeError
    | BadElementSchemaError
    | DuplicatedComponentParamError
  >(({ run, success }) => {
    const {
      newProps: addedProps,
      registeredParams,
      existingParams,
    } = run(getNewProps(site, component, meta));

    const exprCtx: ExprCtx = {
      projectFlags: computedProjectFlags(site),
      component,
      inStudio: true,
    };
    const updatedProps = [...existingParams.entries()]
      .filter(([name, p]) => {
        if (registeredParams.has(name)) {
          const registered = ensure(
            registeredParams.get(name),
            "Couldn't find param " + name
          );
          if (
            registered.constructor !== p.constructor ||
            !typesEqual(registered.type, p.type)
          ) {
            return true;
          }
          if (!!registered.defaultExpr !== !!p.defaultExpr) {
            return true;
          }
          if (!!registered.previewExpr !== !!p.previewExpr) {
            return true;
          }
          if (
            registered.defaultExpr &&
            p.defaultExpr &&
            asCode(registered.defaultExpr, exprCtx).code !==
              asCode(p.defaultExpr, exprCtx).code
          ) {
            return true;
          }
          if (
            registered.previewExpr &&
            p.previewExpr &&
            asCode(registered.previewExpr, exprCtx).code !==
              asCode(p.previewExpr, exprCtx).code
          ) {
            return true;
          }
          if (registered.exportType !== p.exportType) {
            return true;
          }
          if (!!registered.propEffect !== !!p.propEffect) {
            return true;
          }
          if (registered.displayName != p.displayName) {
            // Intentionally using != to include `undefined != null`
            return true;
          }
          if (registered.about != p.about) {
            return true;
          }
          if (registered.isMainContentSlot != p.isMainContentSlot) {
            return true;
          }
          if (registered.required !== p.required) {
            return true;
          }
          if (
            registered.propEffect &&
            p.propEffect &&
            registered.propEffect !== p.propEffect
          ) {
            return true;
          }
          if (!!(registered as any).mergeWithParent !== p.mergeWithParent) {
            return true;
          }
          if (!!(registered as any).isLocalizable !== p.isLocalizable) {
            return true;
          }
        }
        return false;
      })
      .map(([name, p]) => ({
        before: p,
        after: ensure(
          registeredParams.get(name),
          "Couldn't find param " + name
        ),
      }));

    const removedProps = isPlumeComponent(component)
      ? findDuplicateAriaParams(component)
      : [...existingParams.entries()]
          .filter(([name]) => !registeredParams.has(name))
          .map(([_, p]) => p);

    return success({
      addedProps,
      updatedProps,
      removedProps,
    });
  });
}

/**
 * Finds duplicate aria- params.
 * See https://linear.app/plasmic/issue/PLA-11130
 */
function findDuplicateAriaParams(plumeComponent: PlumeComponent): Param[] {
  return [
    ...findDuplicateParams(plumeComponent, "aria-label"),
    ...findDuplicateParams(plumeComponent, "aria-labelledby"),
  ];
}

/**
 * Finds duplicate params in a component for the given name and returns all
 * except the oldest param.
 */
function findDuplicateParams(component: Component, name: string) {
  const params = component.params.filter((p) => p.variable.name === name);
  if (params.length <= 1) {
    return [];
  }

  params.sort((a, b) => a.uid - b.uid);
  return params.slice(1);
}

function doUpdateComponentsProps(
  ctx: SiteCtx,
  changes: CodeComponentMetaDiffWithComponent[]
) {
  return failable<void, never>(({ run, success }) => {
    changes.forEach((change) => {
      run(doUpdateComponentProps(ctx, change));
    });
    return success();
  });
}

/**
 * If a selector has been removed from the ClassNamePropType, then remove
 * all StyleExpr that reference that selector
 */
function updateChangedClassNameProp(
  ctx: SiteCtx,
  component: Component,
  before: Param,
  after: Param
) {
  assert(
    isKnownClassNamePropType(before.type) &&
      isKnownClassNamePropType(after.type),
    "Params must be of ClassNamePropType"
  );
  const newSelectors = after.type.selectors;
  const shouldRemove = (sty: SelectorRuleSet) => {
    if (!sty.selector) {
      // This used to be the Base style...
      if (newSelectors.some((x) => x.label === "Base")) {
        // There's now a selector-based Base, so remove this one
        return true;
      }
    } else if (!newSelectors.some((x) => x.selector === sty.selector)) {
      // This sty is referencing a selector no longer defined
      return true;
    }
    return false;
  };
  for (const tpl of componentToTplComponents(ctx.site, component)) {
    for (const vs of tpl.vsettings) {
      for (const arg of vs.args) {
        if (arg.param === before && isKnownStyleExpr(arg.expr)) {
          removeWhere(arg.expr.styles, (s) => shouldRemove(s));
        }
      }
    }
  }
}

function mergeComponentParams(
  component: Component,
  before: Param,
  after: Param
) {
  // Updates that don't require deleting and adding a new param
  // For Plume, we don't update variable name, so you still see "Is checked" instead
  // of "isChecked"
  if (!isPlumeComponent(component)) {
    before.variable.name = after.variable.name;
  }
  before.defaultExpr = after.defaultExpr;
  before.previewExpr = after.previewExpr;
  before.exportType = after.exportType;
  before.propEffect = after.propEffect;
  before.displayName = after.displayName;
  before.about = after.about;
  before.isMainContentSlot = after.isMainContentSlot;
  before.type = after.type;
  before.mergeWithParent = after.mergeWithParent;
  before.isLocalizable = after.isLocalizable;
  before.required = after.required;
}

function doUpdateComponentProps(
  ctx: SiteCtx,
  changes: CodeComponentMetaDiffWithComponent
) {
  return failable<void, never>(({ success }) => {
    const { component, addedProps, updatedProps, removedProps } = changes;

    removedProps.forEach((p) => removeComponentParam(ctx.site, component, p));

    // When we update the type from/to slot, we need to clear the
    // existing args
    const hardUpdatedProps = updatedProps.filter(
      ({ before, after }) => isSlot(before) !== isSlot(after)
    );
    hardUpdatedProps.forEach(({ before: p }) =>
      removeComponentParam(ctx.site, component, p)
    );
    component.params.push(
      ...addedProps,
      ...hardUpdatedProps.map(({ after }) => after)
    );
    xDifference(updatedProps, hardUpdatedProps).forEach(({ before, after }) => {
      if (
        isKnownClassNamePropType(before.type) &&
        isKnownClassNamePropType(after.type)
      ) {
        updateChangedClassNameProp(ctx, component, before, after);
      }

      if (
        before.constructor === after.constructor ||
        (isPlumeComponent(component) &&
          // Also check for plume components where the user manually replaced
          // normal props with states / variants. In this case, keep the user
          // param.
          isKnownStateParam(before) &&
          isKnownPropParam(after))
      ) {
        mergeComponentParams(component, before, after);
      } else {
        // If a code component changed from PropParam to StateParam, we need to
        // update all references to point to the new type
        component.params.push(after);

        for (const inst of getTplComponentsInSite(ctx.site, component)) {
          for (const vs of inst.vsettings) {
            for (const arg of [...vs.args]) {
              if (arg.param === before) {
                arg.param = after;
              }
            }
          }
        }

        removeComponentParam(ctx.site, component, before);
      }
    });
    // Fix TplSlots
    if (isCodeComponent(component)) {
      attachRenderableTplSlots(component);
    }

    // Assign names to elements that must have a name (e.g. TplComponents of
    // components containing state in slot default contents)
    ctx.tplMgr().ensureSubtreeCorrectlyNamed(component, component.tplTree);

    return success();
  });
}

function parseStylesAndHandleErrors(
  rawStyles: React.CSSProperties,
  elementType: Exclude<PlasmicElement, string>["type"],
  fns: Pick<CodeComponentSyncCallbackFns, "onElementStyleWarnings">,
  opts: { prefs?: AddItemPrefs }
): React.CSSProperties {
  const { styles, warnings } = parseStyles(rawStyles, elementType, opts);
  if (warnings.length > 0) {
    fns.onElementStyleWarnings?.(warnings);
  }
  return styles;
}

export function attachRenderableTplSlots(component: CodeComponent) {
  const root = ensureKnownTplTag(component.tplTree);
  const slots = [...root.children] as TplSlot[];
  const slotParams = getSlotParams(component);
  for (const param of slotParams) {
    if (!slots.find((slot) => slot.param === param)) {
      const slot = mkSlot(param);
      ensureBaseVariantSetting(component, slot);
      $$$(root).append(slot);
    }
  }

  for (const slot of slots) {
    if (!slotParams.includes(slot.param)) {
      $$$(slot).remove({ deep: false });
    }
  }
}
export class UnknownComponentError extends CustomError {
  name: "UnknownComponentError";
  componentName: string;
  constructor(name: string) {
    super("Unknown component " + name);
    this.componentName = name;
  }
}

export class BadPresetSchemaError extends CustomError {
  name: "BadPresetSchemaError";
  constructor(message: string) {
    super(message);
  }
}

export class SelfReferencingComponent extends CustomError {
  name: "SelfReferencingComponent";
  componentName: string;
  constructor(name: string) {
    super("Component " + name + " cannot reference itself");
    this.componentName = name;
  }
}

export class CyclicComponentReferencesError extends CustomError {
  name: "CyclicComponentReferencesError";
  constructor(message: string) {
    super(message);
  }
}

export class BadElementSchemaError extends CustomError {
  name: "BadElementSchemaError";
  constructor(
    message: string,
    public description?: string,
    public shouldLog?: boolean
  ) {
    super(message);
  }
}

export class UnknownComponentPropError extends CustomError {
  name: "UnknownComponentPropError";
  componentName: string;
  propName: string;
  constructor(prop: string, component: string) {
    super(`Unknown prop "${prop}" of code component "${component}"`);
    this.componentName = component;
    this.propName = prop;
  }
}

export class DuplicatedComponentParamError extends CustomError {
  name: "DuplicatedComponentParamError";
  componentName: string;
  propName: string;
  constructor(prop: string, component: string) {
    super(
      `Conflict between state and prop name "${prop}" of code component "${component}"`
    );
    this.componentName = component;
    this.propName = prop;
  }
}

export function getHostLessComponents(site: Site) {
  return walkDependencyTree(site, "all")
    .filter((dep) => isHostLessPackage(dep.site))
    .flatMap((dep) => dep.site.components.filter(isHostLessCodeComponent));
}

export type CustomFunctionId = Opaque<string, "CustomFunctionId">;

export function customFunctionId(f: CustomFunction) {
  return `${f.namespace ? f.namespace + "." : ""}${
    f.importName
  }` as CustomFunctionId;
}

export function registeredFunctionId(r: CustomFunctionRegistration) {
  return `${r.meta.namespace ? r.meta.namespace + "." : ""}${
    r.meta.name
  }` as CustomFunctionId;
}

export function createCustomFunctionFromRegistration(
  functionReg: CustomFunctionRegistration
) {
  return new CustomFunction({
    defaultExport: functionReg.meta.isDefaultExport ?? false,
    importName: functionReg.meta.name,
    importPath: functionReg.meta.importPath,
    namespace: functionReg.meta.namespace ?? null,
  });
}

export function createCodeLibraryFromRegistration(
  libRegistration: CodeLibraryRegistration
) {
  return new CodeLibrary({
    name: libRegistration.meta.name,
    jsIdentifier: libRegistration.meta.jsIdentifier,
    importPath: libRegistration.meta.importPath,
    importType: libRegistration.meta.importType,
    namedImport: libRegistration.meta.namedImport ?? null,
    isSyntheticDefaultImport:
      libRegistration.meta.isSyntheticDefaultImport ?? false,
  });
}

export function elementSchemaToTpl(
  site: Site,
  component: Component | undefined,
  rootSchema: PlasmicElement,
  opts: {
    codeComponentsOnly: boolean;
    baseVariant?: Variant;
    ignoreDefaultComponents?: boolean;
  }
) {
  const siteComponents = [
    // Always give precedence to code components
    ...site.components.filter(isCodeComponent),
    ...getHostLessComponents(site),
    ...(opts.codeComponentsOnly
      ? []
      : [
          ...site.components.filter((c) => isPlainComponent(c)),
          ...getDependencyComponents(site),
        ]),
  ];
  const baseVariant =
    opts.baseVariant ?? component?.variants[0] ?? mkBaseVariant();
  const baseCombo = [baseVariant];
  const prefs = site.activeTheme?.addItemPrefs as AddItemPrefs | undefined;
  const rec = (schema: PlasmicElement) => {
    return failable<
      { tpl: TplNode; warnings: SchemaWarning[] },
      | BadPresetSchemaError
      | UnknownComponentError
      | SelfReferencingComponent
      | UnknownComponentPropError
    >(({ success, failure, run }) => {
      const warnings: SchemaWarning[] = [];

      if (typeof schema === "string") {
        return success({
          tpl: mkTplInlinedText(schema, baseCombo, "div"),
          warnings,
        });
      }
      if (!schema || typeof schema !== "object") {
        return failure(
          new BadPresetSchemaError(
            "PlasmicElement schema of type invalid type " +
              (typeof schema).toString() +
              ":" +
              maybe(schema, (s: any) => s.toString())
          )
        );
      }
      const { styles, warnings: styleWarnings } = parseStyles(
        schema.styles ?? {},
        schema.type,
        {
          prefs: site.activeTheme?.addItemPrefs as AddItemPrefs | undefined,
        }
      );
      styleWarnings.forEach((err) => warnings.push(err));

      const findSchemaPropErrors = (
        compSchema: DefaultComponentElement<{}> | CodeComponentElement<{}>,
        comp: Component
      ) => {
        const compParams = new Set(
          getRealParams(comp, { includeSlots: true }).map(
            (param) => param.variable.name
          )
        );
        const componentName = getComponentDisplayName(comp);
        if (compSchema.props) {
          for (const prop of Object.keys(compSchema.props)) {
            if (!compParams.has(prop)) {
              return failure(
                new UnknownComponentPropError(prop, componentName)
              );
            }
          }
        }
        return undefined;
      };
      const mkComponentArgsFromSchema = (
        compSchema: DefaultComponentElement<{}> | CodeComponentElement<{}>,
        comp: Component
      ) => {
        const componentName = getComponentDisplayName(comp);
        return (
          compSchema.props &&
          Object.fromEntries(
            withoutNils(
              Object.keys(compSchema.props).map((prop) => {
                const val = compSchema.props?.[prop];
                if (val && typeof val === "object") {
                  if (!isArray(val) && val.type === "json") {
                    try {
                      return [
                        prop,
                        new CustomCode({
                          code: JSON.stringify(val.value),
                          fallback: undefined,
                        }),
                      ];
                    } catch {
                      warnings.push({
                        message: `Provided value not JSON-compatible to prop ${prop} of ${componentName} component instance`,
                      });
                      return undefined;
                    }
                  } else {
                    const param = comp.params.find(
                      (p) =>
                        paramToVarName(comp, p, { useControlledProp: true }) ===
                        prop
                    );
                    if (!param || !isSlot(param)) {
                      warnings.push({
                        message: `Couldn't find slot named ${prop} of component ${componentName}`,
                      });
                      return undefined;
                    }
                    return [
                      prop,
                      new RenderExpr({
                        tpl: (isArray(val) ? val : [val]).map((child) => {
                          const { tpl, warnings: recWarnings } = run(
                            rec(child)
                          );
                          recWarnings.forEach((err) => warnings.push(err));
                          return tpl;
                        }),
                      }),
                    ];
                  }
                } else {
                  const code = JSON.stringify(val);
                  if (code == null) {
                    return undefined;
                  }
                  return [
                    prop,
                    new CustomCode({
                      code,
                      fallback: undefined,
                    }),
                  ];
                }
              })
            )
          )
        );
      };

      switch (schema.type) {
        case "default-component": {
          // This function is used to check the validity of default
          // slot contents when syncing code component meta. In that case,
          // we do not care about the actual returned tpl, because it is
          // not going to be inserted anywhere. Particularly when syncing
          // code components in a hostless package, there are no default
          // components, so `getDefaultComponent()` would fail. To avoid
          // crashing in that case, we just return an empty tpl.
          if (opts?.ignoreDefaultComponents) {
            const tpl = mkTplTagX("div");
            return success({ tpl, warnings });
          }

          const kind = schema.kind;
          const elementName = schema.elementName?.trim();
          const defaultComponent = getDefaultComponent(site, kind);
          const schemaPropErrors = findSchemaPropErrors(
            schema,
            defaultComponent
          );
          if (schemaPropErrors) {
            return schemaPropErrors;
          }

          const tpl = mkTplComponentX({
            name: elementName,
            component: defaultComponent,
            baseVariant,
            args: mkComponentArgsFromSchema(schema, defaultComponent),
          });
          return success({ tpl, warnings });
        }
        case "img": {
          const finalAttrs: {} = assign(
            {},
            schema.attrs,
            schema.type === "img" ? { src: schema.src } : {}
          );
          const tpl = mkTplTagX("img", {
            type: TplTagType.Image,
            attrs: finalAttrs,
            baseVariant,
          });

          const vs = ensureVariantSetting(tpl, baseCombo);
          const rsh = RSH(vs.rs, tpl);
          rsh.set("object-fit", "cover");
          rsh.merge(getDefaultStyles(AddItemKey.image, prefs));
          rsh.merge(styles);
          return success({ tpl, warnings });
        }
        case "text":
        case "button": {
          const tag = schema.type === "text" ? schema.tag || "div" : "button";
          const value = schema.value ?? ("" as string);
          const tpl = mkTplInlinedText(value, baseCombo, tag, {
            attrs: schema.attrs,
            baseVariant,
          });
          const vs = ensureVariantSetting(tpl, baseCombo);
          RSH(vs.rs, tpl).merge(
            getDefaultStyles(
              schema.type === "text" ? AddItemKey.text : AddItemKey.button,
              prefs
            )
          );
          RSH(vs.rs, tpl).merge(styles);
          return success({ tpl, warnings });
        }
        case "box":
        case "vbox":
        case "hbox":
        /* eslint-disable */
        // @ts-ignore
        case "page-section": {
          const tag = schema.tag || "div";
          const tpl = mkTplTagX(
            tag,
            { type: TplTagType.Other, attrs: schema.attrs, baseVariant },
            (schema.children
              ? Array.isArray(schema.children)
                ? schema.children
                : [schema.children]
              : []
            ).map((child) => {
              const { tpl: childTpl, warnings: recWarnings } = run(rec(child));
              recWarnings.forEach((err) => warnings.push(err));
              return childTpl;
            })
          );
          const vs = ensureVariantSetting(tpl, baseCombo);
          RSH(vs.rs, tpl).merge(
            getDefaultStyles(
              // @ts-ignore
              schema.type === "page-section"
                ? AddItemKey.section
                : schema.type === "box"
                ? AddItemKey.box
                : schema.type === "vbox"
                ? AddItemKey.vstack
                : AddItemKey.hstack,
              prefs
            )
          );
          RSH(vs.rs, tpl).merge(styles);
          return success({ tpl, warnings });
        }
        case "input":
        case "password":
        case "textarea": {
          const tag = schema.type === "textarea" ? "textarea" : "input";
          const defaultAttrs: {} =
            schema.type === "textarea"
              ? { value: "This is a text area" }
              : {
                  type: schema.type === "input" ? "text" : "password",
                  size: 1,
                  value:
                    schema.type === "input" ? "Some value" : "Some password",
                };
          const tpl = mkTplTagX(tag, {
            attrs: Object.assign(defaultAttrs, schema.attrs),
            baseVariant,
          });
          const vs = ensureVariantSetting(tpl, baseCombo);
          RSH(vs.rs, tpl).merge(
            getDefaultStyles(
              schema.type === "input"
                ? AddItemKey.textbox
                : schema.type === "password"
                ? AddItemKey.password
                : AddItemKey.textarea,
              prefs
            )
          );
          RSH(vs.rs, tpl).merge(styles);
          return success({ tpl, warnings });
        }
        case "component": {
          const referencedComponent = siteComponents.find(
            (comp) => comp.name === schema.name
          );
          if (!referencedComponent) {
            return failure(new UnknownComponentError(schema.name));
          }
          if (referencedComponent === component) {
            return failure(
              new SelfReferencingComponent(getComponentDisplayName(component))
            );
          }

          const schemaPropErrors = findSchemaPropErrors(
            schema,
            referencedComponent
          );
          if (schemaPropErrors) {
            return schemaPropErrors;
          }
          const elementName = schema.elementName?.trim();
          const tpl = mkTplComponentX({
            name: elementName,
            component: referencedComponent,
            args: mkComponentArgsFromSchema(schema, referencedComponent),
            baseVariant,
          });
          const vs = ensureVariantSetting(tpl, baseCombo);
          RSH(vs.rs, tpl).merge({
            maxWidth: "100%",
            objectFit: "cover",
          });
          RSH(vs.rs, tpl).merge(styles);
          return success({ tpl, warnings });
        }
        default:
          return failure(
            new BadPresetSchemaError(
              `When registering component ${
                component?.name
              }, encountered unexpected value ${
                (schema as any).type
              } for \`PlasmicElement\`.type`
            )
          );
      }
    });
  };
  return rec(rootSchema);
}

export interface SchemaWarning {
  message: string;
  description?: string;
  shouldLogError?: boolean;
}

type LayoutType = "vbox" | "hbox" | "box" | "page-section";
const LAYOUT_VALUES = ["vbox", "hbox", "box", "page-section"];

function layoutTypeToStyles(
  layout: LayoutType,
  opts: { prefs?: AddItemPrefs }
) {
  return getDefaultStyles(
    layout === "page-section"
      ? AddItemKey.section
      : layout === "box"
      ? AddItemKey.box
      : layout === "vbox"
      ? AddItemKey.vstack
      : AddItemKey.hstack,
    opts.prefs
  );
}

// Sanitize user defined styles
export function parseStyles(
  rawStyles: React.CSSProperties,
  elementType: Exclude<PlasmicElement, String>["type"],
  opts: { prefs?: AddItemPrefs }
): {
  styles: Record<string, string>;
  warnings: SchemaWarning[];
} {
  const styles: Readonly<Record<string, string>> = Object.fromEntries(
    Object.entries(rawStyles).map(([prop, val]) => [
      // boxShadow -> box-shadow
      normProp(prop),
      // Remove comments
      stripCssComments(`${val}`),
    ])
  );
  const sanitized: Record<string, string> = {};
  const warnings: SchemaWarning[] = [];

  const layout = (styles["layout"] ??
    (LAYOUT_VALUES.includes(elementType) ? elementType : undefined)) as
    | LayoutType
    | undefined;

  if (layout) {
    Object.assign(sanitized, layoutTypeToStyles(layout, opts));
  }

  const expandedBorderProps = ["width", "style", "color"];
  const transitionProps = [
    "transition-property",
    "transition-timing-function",
    "transition-duration",
    "transition-delay",
  ];

  // Parsing these props can be tricky
  const unsupportedShorthand: Record<string, string[]> = {
    border: expandedBorderProps.map((p) => `border-${p}`),
    transition: transitionProps,
    ...Object.fromEntries(
      standardSides.map((s) => [
        `border-${s}`,
        expandedBorderProps.map((p) => `border-${s}-${p}`),
      ])
    ),
  };

  for (const prop of Object.keys(unsupportedShorthand)) {
    if (prop in styles) {
      warnings.push({
        message: `Cannot parse shorthand CSS property ${prop}`,
        description: `This prop is not supported yet. Please set values separately for ${unsupportedShorthand[
          prop
        ].join(", ")}`,
      });
    }
  }

  // Transition props should all have the same number of layers
  const transitionStyles = Object.fromEntries<string[]>(
    [...transitionProps].map((prop) => [
      prop,
      (styles[prop] && parseCssValue(prop, styles[prop])) || [],
    ])
  );

  const transitionLayers = Math.max(
    0,
    ...Object.values(transitionStyles).map((vals) => vals.length)
  );

  if (transitionLayers > 0) {
    transitionProps.forEach((prop) => {
      if (transitionStyles[prop].length === 0) {
        transitionStyles[prop].push(getCssInitial(prop, "div"));
      }
      if (transitionStyles[prop].length < transitionLayers) {
        const cycleLength = transitionStyles[prop].length;
        while (transitionStyles[prop].length < transitionLayers) {
          // Repeat the provided values cyclically until the length is correct
          transitionStyles[prop].push(
            transitionStyles[prop][transitionStyles[prop].length % cycleLength]
          );
        }
      }
      sanitized[prop] = transitionStyles[prop].join(", ");
    });
  }

  // These can just use `parseCssShorthand`
  const supportedShorthand: Record<string, string[]> = {
    margin: standardSides.map((s) => `margin-${s}`),
    padding: standardSides.map((s) => `padding-${s}`),
    "border-radius": standardCorners.map((c) => `border-${c}-radius`),
    ...Object.fromEntries(
      expandedBorderProps.map((p) => [
        `border-${p}`,
        standardSides.map((s) => `border-${s}-${p}`),
      ])
    ),
  };

  for (const shorthand of Object.keys(supportedShorthand)) {
    if (shorthand in styles) {
      const props = supportedShorthand[shorthand];
      const vals = parseCssShorthand(styles[shorthand]);
      props.forEach((prop, i) => (sanitized[prop] = vals[i]));
    }
  }

  // box-shadow
  if ("box-shadow" in styles) {
    try {
      cssPegParser.parse(styles["box-shadow"], { startRule: "boxShadows" });
      sanitized["box-shadow"] = styles["box-shadow"];
    } catch {
      const err = new Error(
        `Failed to parse CSS value for "box-shadow": ${styles["box-shadow"]}`
      );
      warnings.push({ message: err.message, shouldLogError: true });
    }
  }

  // background
  const bgAtomicProps = [
    "background-color",
    "background-image",
    "background-position",
    "background-size",
    "background-repeat",
    "background-origin",
    "background-clip",
    "background-attachment",
  ];

  const bgStyles = Object.fromEntries<string[] | undefined>(
    ["background", ...bgAtomicProps].map((prop) => [
      prop,
      styles[prop] ? parseCssValue(prop, styles[prop]) : [],
    ])
  );

  const bgLayers = Math.max(
    0,
    ...Object.values(bgStyles).map((vals) => vals?.length ?? 0)
  );

  if (bgLayers > 0) {
    try {
      const background = new Background({
        layers: range(bgLayers).map((i) => {
          let layer: BackgroundLayer | undefined = undefined;
          let layerStr = bgStyles["background"]?.[i];
          if (layerStr) {
            try {
              layer = cssPegParser.parse(layerStr, {
                startRule: "backgroundLayer",
              });
            } catch {
              try {
                // Parse #fff, red, rgb(0,0,0), ...
                const matchColor = layerStr.match(/^(#\w+)|(\w+(\([^)]+\))?)/);
                const color = matchColor?.[0];
                if (color) {
                  layerStr = layerStr.replace(
                    color,
                    new ColorFill({ color }).showCss()
                  );
                  layer = cssPegParser.parse(layerStr, {
                    startRule: "backgroundLayer",
                  });
                }
              } catch {}
            }
          }

          const image: BackgroundLayer["image"] = (() => {
            if (i === 0 && bgStyles["background-color"]?.[i]) {
              return new ColorFill({ color: bgStyles["background-color"][i] });
            }
            if (bgStyles["background-image"]?.[i]) {
              try {
                return cssPegParser.parse(bgStyles["background-image"]?.[i], {
                  startRule: "backgroundImage",
                });
              } catch {}
            }
            if (layer?.image) {
              return layer.image;
            }
            return new NoneBackground();
          })();

          const otherProps = Object.fromEntries(
            withoutNils(
              [
                "attachment",
                "position",
                "size",
                "repeat",
                "origin",
                "clip",
              ].map((param) => {
                const prop = `background-${param}`;
                const propBgStyles = bgStyles[prop];
                if (propBgStyles && propBgStyles.length > 0) {
                  // If the number of layers is greater than the number of values,
                  // repeat them cyclically
                  return [param, propBgStyles[i % propBgStyles.length]];
                }
                return null;
              })
            )
          );

          return new BackgroundLayer({
            ...(layer ?? {}),
            ...otherProps,
            image,
          });
        }),
      });
      background.filterNoneLayers();
      const bgStyle = background.showCss();
      // Parse the final result to make sure it's correct
      parseCssValue("background", bgStyle).forEach((val: string) =>
        cssPegParser.parse(val, { startRule: "backgroundLayer" })
      );
      sanitized["background"] = bgStyle || "none";
    } catch (err) {
      console.log(
        "Parse error - bgStyles:",
        JSON.stringify(bgStyles, undefined, 2)
      );
      warnings.push({
        message:
          "Failed to parse background: " +
          JSON.stringify(bgStyles, undefined, 2) +
          "\n- error: " +
          err.message,
        shouldLogError: true,
      });
    }
  }

  // Flex gaps
  const atomicGapStyles = ["row-gap", "column-gap"];
  const gapStyles = ["gap", ...atomicGapStyles];
  gapStyles.forEach((prop) => {
    if (styles[prop]) {
      if (layout && ["box", "vbox", "hbox"].includes(layout)) {
        if (prop == "gap") {
          sanitized[`flex-row-gap`] = styles[prop];
          sanitized[`flex-column-gap`] = styles[prop];
        } else {
          sanitized[`flex-${prop}`] = styles[prop];
        }
      } else {
        warnings.push({
          message: `Unsupported CSS property: "${prop}"`,
          description: `This prop is being applied to a "${elementType}"
            element, but it's currently supported only on vertical and
            horizontal box elements ("vbox" and "hbox").`,
        });
      }
    }
  });
  atomicGapStyles.forEach((prop) => {
    if (styles["gap"] && styles[prop]) {
      warnings.push({
        message: `Unsupported CSS property: "${prop}"`,
        description: `It's not possible to have both a "gap" and a "${prop}" property in the same element.`,
      });
    }
  });

  // Translate "auto" size to "wrap"
  const sizeStyles = ["width", "height"] as const;
  sizeStyles.forEach((prop) => {
    if (styles[prop]) {
      if (styles[prop] === "auto" || styles[prop] === "hug") {
        sanitized[prop] = "wrap";
      } else if (prop === "width" && styles[prop] === "full-bleed") {
        sanitized[prop] = CONTENT_LAYOUT_FULL_BLEED;
      } else if (prop === "width" && styles[prop] === "wide") {
        sanitized[prop] = CONTENT_LAYOUT_WIDE;
      } else {
        sanitized[prop] = styles[prop];
      }
    }
  });

  // Other props
  const allSpecialProps = new Set<string>([
    "box-shadow",
    "background",
    "layout",
    ...Object.keys(unsupportedShorthand),
    ...Object.keys(supportedShorthand),
    ...transitionProps,
    ...bgAtomicProps,
    ...gapStyles,
    ...sizeStyles,
  ]);
  const invalidProps: string[] = [];
  for (const prop of Object.keys(styles)) {
    if (!allSpecialProps.has(prop)) {
      if (!isValidStyleProp(prop)) {
        invalidProps.push(`"${prop}: ${styles[prop]}"`);
      } else {
        sanitized[prop] = styles[prop];
      }
    }
  }
  if (invalidProps.length > 0) {
    warnings.push({
      message:
        "Some code-defined CSS properties aren't currently supported on Plasmic Elements",
      description: `The values provided to the following props will be ignored: ${invalidProps.join(
        ", "
      )}`,
    });
  }

  return {
    styles: sanitized,
    warnings,
  };
}

export const isContainerElement = (
  schema: PlasmicElement
): schema is ContainerElement =>
  typeof schema === "object" && "children" in schema;

export const flattenElementSchema = (
  rootSchema: PlasmicElement | PlasmicElement[] | undefined
) =>
  ensureArray(rootSchema).flatMap((schema) =>
    typeof schema === "object" && isContainerElement(schema)
      ? flattenElementSchema(schema.children)
      : schema
  );

export function propMetasToComponentParams(
  props: { [p: string]: StudioPropType<any> },
  site: Site,
  componentDisplayName: string,
  meta: ComponentMeta<any>
) {
  return failable<
    Param[],
    CodeComponentRegistrationTypeError | UnknownComponentError
  >(({ run, success }) => {
    const valueParamNamesForWriteableStates = new Set(
      withoutNils(
        Object.entries(meta.states ?? {}).map(([stateName, stateSpec]) =>
          stateSpec.type === "writable" ? stateSpec.valueProp : null
        )
      )
    );
    return success(
      withoutNils(
        Object.entries(props).map(([prop, type]): Param | null => {
          if (type) {
            const wabType: any = run(propTypeToWabType(site, type));
            const commonProps = {
              name: prop,
              type: wabType,
              exportType: propTypeToParamExportType(type),
              defaultExpr: run(
                maybePropTypeToDefaultExpr(type, prop, componentDisplayName)
              ),
              propEffect: maybePropTypeToPropEffect(type),
              displayName: maybePropTypeToDisplayName(type),
              about: maybePropTypeToAbout(type),
              description: maybePropTypeToAbout(type),
              isRepeated: maybePropTypeToIsRepeated(type),
              isMainContentSlot: maybePropTypeToIsMainContentSlot(type),
              mergeWithParent: maybePropTypeToMergeWithParent(type),
              isLocalizable: maybePropTypeToIsLocalizable(type),
              required: maybePropTypeToRequired(type),
            };
            return type === "slot" ||
              (type && typeof type === "object" && type.type === "slot")
              ? mkParam({
                  ...commonProps,
                  paramType: "slot",
                })
              : valueParamNamesForWriteableStates.has(prop)
              ? mkParam({
                  ...commonProps,
                  paramType: "state",
                })
              : mkParam({
                  ...commonProps,
                  paramType: "prop",
                });
          }
          return null;
        })
      )
    );
  });
}

export function stateMetasToComponentParams(
  states: { [p: string]: StateSpec<any> },
  componentDisplayName: string
) {
  return failable<
    Param[],
    CodeComponentRegistrationTypeError | UnknownComponentError
  >(({ run, success }) => {
    return success(
      withoutNils(
        Object.entries(states)
          .filter(([_, stateSpec]) => stateSpec.type === "readonly")
          .map(
            ([stateName, stateSpec]) =>
              stateSpec &&
              mkParamsForState({
                name: stateName,
                variableType: stateSpec.variableType,
                accessType: stateSpec.type,
                onChangeProp: stateSpec.onChangeProp,
                defaultExpr: run(
                  maybeStateMetaToDefaultExpr(
                    stateSpec,
                    stateName,
                    componentDisplayName
                  )
                ),
                // previewExpr: ...
              }).valueParam
          )
      )
    );
  });
}

export function componentMetaToComponentParams(
  site: Site,
  meta: ComponentMeta<any>
) {
  return failable<
    Param[],
    | CodeComponentRegistrationTypeError
    | DuplicatedComponentParamError
    | UnknownComponentError
  >(({ run, success, failure }) => {
    const props = isGlobalContextMeta(meta)
      ? { ...meta.props, children: "slot" as const }
      : meta.props;

    const params = [
      ...run(
        propMetasToComponentParams(
          props,
          site,
          meta.displayName ?? meta.name,
          meta
        )
      ),
      ...run(
        stateMetasToComponentParams(
          meta.states ?? {},
          meta.displayName ?? meta.name
        )
      ),
    ];
    const groupedParams = groupBy(params, (p) => p.variable.name);
    for (const [paramName, group] of Object.entries(groupedParams)) {
      if (group.length > 1) {
        return failure(new DuplicatedComponentParamError(paramName, meta.name));
      }
    }
    return success(params);
  });
}

function metaToComponentStates(component: Component, meta: ComponentMeta<any>) {
  return mapMultiple(
    Object.entries(meta.states ?? {}),
    ([stateName, stateSpec]) =>
      failable<State, UnknownComponentPropError>(({ success, failure }) => {
        const valueParamName =
          stateSpec.type === "writable" ? stateSpec.valueProp : stateName;

        const valueParam = component.params
          .filter(isKnownStateParam)
          .find((p) => toVarName(p.variable.name) === valueParamName);

        if (!valueParam) {
          return failure(
            new UnknownComponentPropError(valueParamName, component.name)
          );
        }
        const onChangeParam = component.params
          .filter(isKnownPropParam)
          .find((p) => toVarName(p.variable.name) === stateSpec.onChangeProp);
        if (!onChangeParam) {
          return failure(
            new UnknownComponentPropError(
              stateSpec.onChangeProp,
              component.name
            )
          );
        }
        return success(
          mkNamedState({
            param: valueParam,
            name: stateName,
            onChangeParam,
            accessType: stateSpec.type,
            variableType: stateSpec.variableType,
          })
        );
      })
  );
}

export function mkCodeComponent(
  name: string,
  meta: ComponentMeta<any> | GlobalContextMeta<any>,
  opts: {
    prefs?: AddItemPrefs;
    parsedDefaultStyles?: CSSProperties;
  }
) {
  const styles = opts.parsedDefaultStyles
    ? opts.parsedDefaultStyles
    : "defaultStyles" in meta
    ? meta.defaultStyles &&
      parseStyles(meta.defaultStyles, "component", opts).styles
    : undefined;

  const component = mkComponent({
    name: name,
    type: ComponentType.Code,
    tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }, []),
    codeComponentMeta: new CodeComponentMeta({
      importPath: meta.importPath,
      defaultExport: !!meta.isDefaultExport,
      classNameProp: (meta as ComponentMeta<any>).classNameProp,
      refProp: meta.refProp,
      displayName: meta.displayName,
      importName: meta.importName,
      description: meta.description,
      section: !isGlobalContextMeta(meta) ? meta.section : undefined,
      thumbnailUrl: !isGlobalContextMeta(meta) ? meta.section : undefined,
      defaultStyles: styles
        ? mkRuleSet({
            values: Object.fromEntries(
              Object.entries(styles).map(([key, val]) => [key, "" + val])
            ),
          })
        : null,
      defaultDisplay: (meta as ComponentMeta<any>).defaultDisplay,
      isHostLess: isBuiltinCodeComponentImportPath(meta.importPath),
      isContext: isGlobalContextMeta(meta),
      isAttachment: !isGlobalContextMeta(meta) && !!meta.isAttachment,
      providesData: !!meta.providesData,
      isRepeatable: isGlobalContextMeta(meta) || (meta.isRepeatable ?? true),
      hasRef: !!(meta as any).refActions,
      styleSections: isGlobalContextMeta(meta) || !!meta.styleSections,
      helpers: mkCodeComponentHelperFromMeta(meta) ?? null,
      // explicitly not handling defaultSlotContents, which is done by
      // refreshDefaultSlotContents()
      defaultSlotContents: {},
      variants: mkCodeComponentVariantsFromMeta(meta),
    }),
    figmaMappings: (isGlobalContextMeta(meta)
      ? []
      : meta.figmaMappings ?? []
    ).map(
      (m) =>
        new FigmaComponentMapping({ figmaComponentName: m.figmaComponentName })
    ),
    alwaysAutoName: (meta as any).alwaysAutoName ?? false,
    // Keeping `trapsSelection` for backwards compatibility with Antd5/Plume which uses this name
    trapsFocus: !isGlobalContextMeta(meta)
      ? meta.trapsFocus ?? (meta as any).trapsSelection ?? false
      : undefined,
  });

  // Now we make a fake code component tree, which is rooted by a div whose
  // children are TplSlot for all the renderable params
  const tplTree = component.tplTree as TplTag;
  const vs = ensureBaseVariantSetting(component, tplTree);
  // We set the container type of the root to flex-row so that nodes added
  // to the TplSlot will have relative position, which is probably what people
  // expected.
  convertSelfContainerType(RSH(vs.rs, tplTree), "flex-row");
  component.tplTree = tplTree;

  return component as CodeComponent;
}

export function isGlobalContextMeta(
  meta: ComponentMeta<any> | GlobalContextMeta<any>
): meta is GlobalContextMeta<any> {
  if ((meta as any).__isContext) {
    return true;
  }
  return false;
}

export function isReactImplControl(
  propType: StudioPropType<any> | undefined
): propType is CustomControl<any> {
  return (
    !!propType &&
    typeof propType !== "string" &&
    (typeof propType !== "object" ||
      !("type" in propType) ||
      "$$typeof" in propType)
  );
}

export type ObjectStudioPropType<T> = Exclude<
  StudioPropType<T>,
  CustomControl<T> | String
>;

export function isExprValuePropType(
  propType: StudioPropType<any> | undefined
): propType is ObjectStudioPropType<any> {
  const type = getPropTypeType(propType);
  if (!type) {
    return false;
  }
  return [
    "exprEditor",
    "interactionExprValue",
    "variable",
    "functionArgs",
    "varRef",
    "variant",
    "variantGroup",
    "tpl",
    "class",
  ].includes(type);
}

export function isDynamicValueDisabledInPropType(
  propType: StudioPropType<any> | undefined
) {
  return (
    isPlainObjectPropType(propType) &&
    "disableDynamicValue" in propType &&
    propType.disableDynamicValue
  );
}

export function isPlainObjectPropType(
  propType: StudioPropType<any> | undefined
): propType is ObjectStudioPropType<any> {
  return (
    !!propType && !isReactImplControl(propType) && typeof propType !== "string"
  );
}

export function getPropTypeType(propType: StudioPropType<any> | undefined) {
  if (!propType) {
    return undefined;
  } else if (typeof propType === "string") {
    return propType;
  } else if (isReactImplControl(propType)) {
    return undefined;
  } else {
    return propType.type;
  }
}

export function getPropTypeLayout(propType: StudioPropType<any> | undefined) {
  if (
    isPlainObjectPropType(propType) &&
    propType.type === "function" &&
    propType.control
  ) {
    return getPropTypeLayout(propType.control);
  }
  return ["richText"].includes(getPropTypeType(propType) ?? "")
    ? "vertical"
    : "horizontal";
}

export function isCustomControlType(
  propType: StudioPropType<any> | undefined
): propType is CustomType<any> {
  return (
    isReactImplControl(propType) ||
    (isPlainObjectPropType(propType) && propType.type === "custom")
  );
}

export function isAdvancedProp(propType: StudioPropType<any> | undefined) {
  return (
    isPlainObjectPropType(propType) &&
    propType.type !== "slot" &&
    propType.advanced
  );
}

function propTypeToParamExportType(type: StudioPropType<any>) {
  if (isPlainObjectPropType(type) && type.type !== "slot") {
    if (
      "editOnly" in type &&
      type.editOnly &&
      (!("uncontrolledProp" in type) || !type.uncontrolledProp)
    ) {
      // Controlled prop only to be used in Studio
      return ParamExportType.ToolsOnly;
    }
  }
  return ParamExportType.External;
}

function maybePropTypeToPropEffect(type: StudioPropType<any>) {
  if (isPlainObjectPropType(type) && type.type !== "slot") {
    if (
      "editOnly" in type &&
      type.editOnly &&
      "uncontrolledProp" in type &&
      type.uncontrolledProp
    ) {
      return type.uncontrolledProp;
    }
  }
  return undefined;
}

export function maybePropTypeToDisplayName(type: StudioPropType<any>) {
  if (isPlainObjectPropType(type) && type.displayName !== undefined) {
    return type.displayName;
  }
  return undefined;
}

export function maybePropTypeToRequired(type: StudioPropType<any>) {
  if (isPlainObjectPropType(type) && type.type !== "slot") {
    return (type as any).required;
  }
  return undefined;
}

export function maybePropTypeToAbout(type: StudioPropType<any>) {
  if (isPlainObjectPropType(type)) {
    if (type.description) {
      return type.description;
    }
  }
  return undefined;
}

function maybePropTypeToIsRepeated(type: StudioPropType<any>) {
  if (
    isPlainObjectPropType(type) &&
    type.type === "slot" &&
    "isRepeated" in type
  ) {
    return !!type.isRepeated;
  }
  return undefined;
}

function maybePropTypeToIsMainContentSlot(type: StudioPropType<any>) {
  if (
    isPlainObjectPropType(type) &&
    type.type === "slot" &&
    "unstable__isMainContentSlot" in type
  ) {
    return !!type["unstable__isMainContentSlot"];
  }
  return undefined;
}

function maybePropTypeToMergeWithParent(type: StudioPropType<any>) {
  if (
    isPlainObjectPropType(type) &&
    type.type === "slot" &&
    "mergeWithParent" in type
  ) {
    return !!(type as any).mergeWithParent as boolean;
  }
  return false;
}

function maybePropTypeToIsLocalizable(type: StudioPropType<any>) {
  if (
    isPlainObjectPropType(type) &&
    type.type === "string" &&
    "isLocalizable" in type
  ) {
    return !!(type as any).isLocalizable as boolean;
  }
  return false;
}

function maybeStateMetaToDefaultExpr(
  stateSpec: StateSpec<any>,
  stateName: string,
  componentName: string
) {
  return failable<Expr | undefined, CodeComponentRegistrationTypeError>(
    ({ success, failure }) => {
      if ("initVal" in stateSpec && stateSpec.initVal !== undefined) {
        try {
          return success(
            new CustomCode({
              code: ensure(
                JSON.stringify(stateSpec.initVal),
                "Must be JSON serializable, maybe trying to serialize a function or similar"
              ),
              fallback: undefined,
            })
          );
        } catch {
          return failure(
            new CodeComponentRegistrationTypeError(
              `Initial value for state ${stateName} of component ${componentName} is not JSON-compatible`
            )
          );
        }
      }
      return success(undefined);
    }
  );
}

export const getPropTypeDefaultValue = (propType: StudioPropType<any>) => {
  if (!isPlainObjectPropType(propType)) {
    return undefined;
  }
  let defaultValue =
    "defaultValue" in propType ? propType.defaultValue : undefined;
  if (propType.type !== "object" || propType.fields === undefined) {
    return defaultValue;
  }
  for (const fieldName of Object.keys(propType.fields)) {
    const fieldPropType = propType.fields[fieldName];
    if (defaultValue && fieldName in defaultValue) {
      // parent default value has higher priority
      continue;
    }
    const fieldDefaultValue = getPropTypeDefaultValue(fieldPropType);
    if (fieldDefaultValue != null) {
      if (!defaultValue) {
        defaultValue = {};
      }
      defaultValue[fieldName] = fieldDefaultValue;
    }
  }
  return defaultValue;
};

export function maybePropTypeToDefaultExpr(
  type: StudioPropType<any>,
  propName: string,
  componentName: string
) {
  return failable<Expr | undefined, CodeComponentRegistrationTypeError>(
    ({ success, failure }) => {
      if (isPlainObjectPropType(type) && type.type !== "slot") {
        if ("defaultExpr" in type && type.defaultExpr !== undefined) {
          return success(
            new CustomCode({
              code: `(${type.defaultExpr})`,
              fallback: undefined,
            })
          );
        } else if ("defaultValue" in type && type.defaultValue !== undefined) {
          try {
            return success(
              new CustomCode({
                code: ensure(
                  JSON.stringify(getPropTypeDefaultValue(type)),
                  "Must be JSON serializable, maybe trying to serialize a function or similar"
                ),
                fallback: undefined,
              })
            );
          } catch {
            return failure(
              new CodeComponentRegistrationTypeError(
                `Default value for prop ${propName} of component ${componentName} is not JSON-compatible`
              )
            );
          }
        }
      }
      return success(undefined);
    }
  );
}

export function mkCodeComponentHelperFromMeta(
  meta: ComponentMeta<any> | GlobalContextMeta<any>
) {
  if (!("componentHelpers" in meta) || !meta.componentHelpers) {
    return undefined;
  }
  return new CodeComponentHelper({
    importPath: meta.componentHelpers.importPath,
    importName:
      "importName" in meta.componentHelpers
        ? meta.componentHelpers.importName
        : "",
    defaultExport:
      "isDefaultExport" in meta.componentHelpers
        ? meta.componentHelpers.isDefaultExport
        : false,
  });
}

function typeCheckVariantsFromMeta(
  meta: ComponentMeta<any> | GlobalContextMeta<any>,
  errorPrefix: string
) {
  return failable<void, CodeComponentRegistrationTypeError>(
    ({ success, failure }) => {
      if (!("variants" in meta) || !meta.variants) {
        return success();
      }

      if (!isObject(meta.variants)) {
        return failure(
          new CodeComponentRegistrationTypeError(
            `${errorPrefix} variants must be an object`
          )
        );
      }

      const hasInvalidVariant = Object.entries(meta.variants).some(
        ([selector, { cssSelector, displayName }]) => {
          return (
            !isString(selector) ||
            !isString(cssSelector) ||
            !isString(displayName)
          );
        }
      );

      if (hasInvalidVariant) {
        return failure(
          new CodeComponentRegistrationTypeError(
            `${errorPrefix} variants selector, cssSelector, displayName are required to be strings`
          )
        );
      }

      return success();
    }
  );
}

export function mkCodeComponentVariantsFromMeta(
  meta: ComponentMeta<any> | GlobalContextMeta<any>
) {
  if (!("variants" in meta) || !meta.variants) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(meta.variants).map(
      ([selector, { cssSelector, displayName }]): [
        string,
        CodeComponentVariantMeta
      ] => [
        selector,
        new CodeComponentVariantMeta({ cssSelector, displayName }),
      ]
    )
  );
}

export function ensurePropTypeToWabType(site: Site, type: StudioPropType<any>) {
  const failableType = propTypeToWabType(site, type).result;
  assert(!failableType.isError, `couldn't parse prop type: ${type}`);
  return failableType.value;
}

export function propTypeToWabType(
  site: Site,
  type: StudioPropType<any>
): IFailable<Param["type"], UnknownComponentError> {
  return failable<Param["type"], UnknownComponentError>(
    ({ success, failure, run }) => {
      if (typeof type === "string") {
        return success(
          convertTsToWabType(
            type === "slot"
              ? "ReactNode"
              : type === "object"
              ? "any"
              : type === "imageUrl"
              ? "img"
              : type
          )
        );
      } else if (isReactImplControl(type)) {
        // Custom control react component
        return success(convertTsToWabType("any"));
      } else {
        if (hackyCast(type.type) === "dataSourceOpData") {
          return success(typeFactory.queryData());
        }
        return ((): IFailable<Param["type"], UnknownComponentError> => {
          switch (type.type) {
            case "slot": {
              const components: ComponentInstance[] = [];
              for (const name of type.allowedComponents ?? []) {
                const component = site.components.find(
                  (c) => isCodeComponent(c) && c.name === name
                );
                if (!component) {
                  failure(new UnknownComponentError(name));
                } else {
                  components.push(typeFactory.instance(component));
                }
              }

              const type2 = type as any;
              if (type2.renderPropParams) {
                return success(
                  typeFactory.renderFunc({
                    params: type2.renderPropParams.map((p) =>
                      typeFactory.arg(p, typeFactory.any())
                    ),
                    allowed: components,
                    allowRootWrapper: type.allowRootWrapper,
                  })
                );
              } else {
                return success(
                  typeFactory.renderable({
                    params: components,
                    allowRootWrapper: type.allowRootWrapper,
                  })
                );
              }
            }
            case "choice": {
              return success(
                typeFactory.choice(
                  Array.isArray(type.options)
                    ? isArrayOfStrings(type.options)
                      ? type.options
                      : type.options.map((op) => ({
                          label: op.label,
                          value: op.value,
                        }))
                    : ["Dynamic options"]
                )
              );
            }
            case "cardPicker":
              return success(convertTsToWabType("string"));
            case "class":
              return success(
                typeFactory.classNamePropType(
                  (type.selectors ?? []).map((s) => ({
                    ...s,
                    defaultStyles: s.defaultStyles
                      ? parseStyles(s.defaultStyles, "component", {}).styles
                      : {},
                  })),
                  type.defaultStyles
                    ? parseStyles(type.defaultStyles, "component", {}).styles
                    : {}
                )
              );
            case "target":
              return success(typeFactory.target());
            case "styleScopeClass":
              return success(
                typeFactory.styleScopeClassNamePropType(type.scopeName)
              );
            case "themeResetClass":
              return success(
                typeFactory.defaultStylesClassNamePropType(
                  type.targetAllTags ?? false
                )
              );
            case "themeStyles":
              return success(typeFactory.defaultStyles());
            case "interaction":
              const eventHandlerKey = type.eventHandlerKey;
              if (isEventHandlerKeyForAttr(eventHandlerKey)) {
                return success(
                  typeFactory.func(typeFactory.arg("event", typeFactory.any()))
                );
              } else if (isEventHandlerKeyForParam(eventHandlerKey)) {
                return success(cloneType(eventHandlerKey.param.type));
              } else if (isEventHandlerKeyForFuncType(eventHandlerKey)) {
                return success(clone(eventHandlerKey.funcType));
              }
              return success(typeFactory.func());
            case "eventHandler":
              return success(
                typeFactory.func(
                  ...type.argTypes.map((argType) =>
                    typeFactory.arg(
                      argType.name,
                      run(
                        propTypeToWabType(site, argType.type)
                      ) as ArgType["type"]
                    )
                  )
                )
              );
            case "color":
              // temporarily cast to any until type exists on host package
              return success(
                typeFactory.color({ noDeref: !!(type as any).keepCssVar })
              );
            case "object":
            case "custom":
            case "dataSource":
            case "imageUrl":
            case "code":
            case "string":
            case "number":
            case "boolean":
            case "dateString":
            case "dateRangeStrings":
            case "array":
            case "href":
            case "interactionExprValue":
            case "variant":
            case "variantGroup":
            case "dataSelector":
            case "dataSourceOp":
            case "functionArgs":
            case "varRef":
            case "variable":
            case "exprEditor":
            case "richText":
            case "function":
            case "tpl":
            case "queryInvalidation":
            case "formValidationRules":
            case "controlMode":
            case "formDataConnection":
            case "dynamic":
              // This does include an `any` fall-through.
              return success(
                convertTsToWabType(
                  ["object", "custom", "dataSource"].includes(type.type)
                    ? "any"
                    : type.type === "imageUrl"
                    ? "img"
                    : type.type === "code"
                    ? "string"
                    : type.type
                )
              );
          }
          throw unexpected();
        })();
      }
    }
  );
}

export function isAllowedDefaultExprForPropType(propType: StudioPropType<any>) {
  const type = getPropTypeType(propType);
  if (
    [
      "interaction",
      "eventHandler",
      "varRef",
      "variantsRef",
      "function",
      "variable",
      "variantGroup",
      "variant",
      "tpl",
    ].includes(type ?? "")
  ) {
    return false;
  }
  return true;
}

export function wabTypeToPropType(type: Type): StudioPropType<any> {
  return switchType(type)
    .when(Text, () => "string" as const)
    .when(BoolType, () => "boolean" as const)
    .when(Num, () => "number" as const)
    .when(Choice, (choiceType) => ({
      type: "choice" as const,
      options: isArrayOfStrings(choiceType.options)
        ? choiceType.options
        : choiceType.options.map((op) => ({
            label: op.label as string,
            value: op.value,
          })),
    }))
    .when(ColorPropType, () => ({
      type: "color" as const,
    }))
    .when(AnyType, () => ({
      type: "object" as const,
    }))
    .when(ModelClassNamePropType, (classNameType) => ({
      type: "class" as const,
      selectors: classNameType.selectors.map((sel) => ({
        selector: sel.selector,
        label: sel.label ?? undefined,
      })),
    }))
    .when(DefaultStylesClassNamePropType, (defaultNameType) => ({
      type: "themeResetClass" as const,
      targetAllTags: defaultNameType.includeTagStyles,
    }))
    .when(Img, () => ({
      type: "imageUrl" as const,
    }))
    .when(ModelStyleScopeClassNamePropType, (scopeNameType) => ({
      type: "styleScopeClass" as const,
      scopeName: scopeNameType.scopeName,
    }))
    .when(QueryData, () => ({
      type: "dataSourceOpData" as const,
    }))
    .when(DateString, () => ({
      type: "dateString" as const,
    }))
    .when(DateRangeStrings, () => ({
      type: "dateRangeStrings" as const,
    }))
    .when(HrefType, () => ({ type: "href" as const }))
    .when(TargetType, () => ({ type: "target" as const }))
    .when(FunctionType, (funcType) => ({
      type: "function" as const,
      argTypes: funcType.params.map((p) => ({
        name: p.argName,
        type: wabTypeToPropType(p.type),
      })),
    }))
    .elseUnsafe(() =>
      unexpected(`can't convert wab type ${type.name} to studio prop type`)
    );
}

export function getNewProps(
  site: Site,
  component: Component,
  meta: ComponentMeta<any>
) {
  return failable<
    {
      newProps: Param[];
      registeredParams: Map<string, Param>;
      existingParams: Map<string, Param>;
    },
    | UnknownComponentError
    | CodeComponentRegistrationTypeError
    | DuplicatedComponentParamError
  >(({ run, success }) => {
    const params = run(componentMetaToComponentParams(site, meta));
    const registeredParams = new Map(
      params.map((p) => tuple(p.variable.name, p))
    );
    const existingParams = new Map(
      component.params.map((p) =>
        tuple(paramToVarName(component, p, { useControlledProp: true }), p)
      )
    );

    return success({
      newProps: [...registeredParams.entries()]
        .filter(([name]) => !existingParams.has(name))
        .map(([_, p]) => p),
      registeredParams,
      existingParams,
    });
  });
}

export function getNewStates(
  site: Site,
  component: Component,
  meta: ComponentMeta<any>
) {
  return failable<State[], UnknownComponentError | UnknownComponentPropError>(
    ({ run, success }) => {
      const states = run(metaToComponentStates(component, meta));
      const registeredStates = new Map(
        states.map((s) => tuple(s.param.variable.name, s))
      );
      const existingStates = new Map(
        component.states.map((s) => tuple(s.param.variable.name, s))
      );

      return success(
        [...registeredStates.entries()]
          .filter(([name]) => !existingStates.has(name))
          .map(([_, s]) => s)
      );
    }
  );
}

function getReferencedComponentsFromDefaultSlotContents(
  slotContents: Record<string, PlasmicElement | PlasmicElement[]>
) {
  const referenced = new Set<string>();
  for (const contents of Object.values(slotContents)) {
    for (const content of ensureArray(contents)) {
      walkPlasmicElementTree(content, {
        pre: (elt) => {
          if (typeof elt === "object" && elt.type === "component") {
            referenced.add(elt.name);
          }
        },
      });
    }
  }
  return referenced;
}

function walkPlasmicElementTree(
  root: PlasmicElement,
  opts: {
    pre?: (elt: PlasmicElement) => void;
    post?: (elt: PlasmicElement) => void;
  }
) {
  const { pre, post } = opts;
  const rec = (elt: PlasmicElement) => {
    pre?.(elt);
    if (elt && typeof elt === "object" && "type" in elt) {
      if (
        elt.type === "box" ||
        elt.type === "vbox" ||
        elt.type === "hbox" ||
        elt.type === "page-section"
      ) {
        ensureArray(elt.children).forEach((child) => rec(child));
      } else if (elt.type === "component" || elt.type === "default-component") {
        if (elt.props) {
          for (const val of Object.values(elt.props)) {
            for (const subval of ensureArray(val)) {
              if (
                subval &&
                typeof subval === "object" &&
                "type" in subval &&
                subval.type !== "json"
              ) {
                rec(subval);
              }
            }
          }
        }
      }
    }
    post?.(elt);
  };
  rec(root);
}

function buildCodeComponentsReferenceGraph(site: Site) {
  const componentToReferenced: Map<string, string[]> = new Map();
  for (const comp of site.components) {
    if (isCodeComponent(comp)) {
      componentToReferenced.set(
        comp.name,
        Array.from(
          getReferencedComponentsFromDefaultSlotContents(
            comp.codeComponentMeta.defaultSlotContents
          )
        )
      );
    }
  }
  return componentToReferenced;
}

export function checkForCyclesInSlotsDefaultValue(ctx: SiteCtx) {
  const graph = buildCodeComponentsReferenceGraph(ctx.site);
  return failable<void, CyclicComponentReferencesError>(
    ({ success, failure }) => {
      const seenComponents = new Set<string>();
      const componentsInStack = new Set<string>();
      const checkCycles = (c: string) => {
        if (componentsInStack.has(c)) {
          return true;
        }
        if (seenComponents.has(c)) {
          return false;
        }
        seenComponents.add(c);
        componentsInStack.add(c);
        const res = !!graph.get(c)?.some((c2) => checkCycles(c2));
        componentsInStack.delete(c);
        return res;
      };
      for (const c of graph.keys()) {
        if (checkCycles(c)) {
          return failure(
            new CyclicComponentReferencesError(
              "Some registered components cyclically depend on each other"
            )
          );
        }
      }
      return success();
    }
  );
}

function registeredTypeToTokenType(type: string) {
  switch (type) {
    case "color":
      return TokenType.Color;
    case "spacing":
      return TokenType.Spacing;
    case "font-family":
      return TokenType.FontFamily;
    case "font-size":
      return TokenType.FontSize;
    case "line-height":
      return TokenType.LineHeight;
    case "opacity":
      return TokenType.Opacity;
    default:
      throw new Error(`Unexpected token type ${type}`);
  }
}

export function createStyleTokenFromRegistration(tokenReg: TokenRegistration) {
  return new StyleToken({
    uuid: mkShortId(),
    name: tokenReg.displayName || tokenReg.name,
    regKey: tokenReg.name,
    value: tokenReg.value,
    type: registeredTypeToTokenType(tokenReg.type),
    variantedValues: [],
    isRegistered: true,
  });
}

/**
 * Reminder: StyleToken.name is the display name, not the registration key.
 *
 * StyleToken.regKey is the registration key.
 *
 * With TokenRegistrations, it's different.
 *
 * TokenRegistration.name is the registration key.
 *
 * TokenRegistration.displayName is the display name.
 *
 * So users just have the nice clean name/displayName API, while we internally haven't introduced displayName (for expedience right now).
 */
async function upsertRegisteredTokens(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, InvalidTokenError>(
    async ({ success, failure, run }) => {
      const site = ctx.site;
      const existingTokens = new Map(
        site.styleTokens.map((token) => [token.regKey, token])
      );
      let cacheBurst = 0;
      let shouldDelete: boolean | undefined = false;
      let newTokenRegs: TokenRegistration[] = [];
      let updatedTokenRegs: TokenRegistration[] = [];
      let removedTokens: StyleToken[] = [];

      do {
        newTokenRegs = [];
        updatedTokenRegs = [];
        removedTokens = [];
        const registeredTokens = new Map(
          ctx.codeComponentsRegistry
            .getRegisteredTokens(cacheBurst++)
            .map((token) => [token.name, token])
        );

        for (const tokenReg of registeredTokens.values()) {
          let regType: TokenType;
          try {
            regType = registeredTypeToTokenType(tokenReg.type);
          } catch (err) {
            return failure(
              new InvalidTokenError(
                tokenReg.name,
                `Invalid token type for token "${tokenReg.name}": ${tokenReg.type}`
              )
            );
          }
          const existing = existingTokens.get(tokenReg.name);
          if (existing) {
            if (existing.isRegistered) {
              if (
                existing.value !== tokenReg.value ||
                existing.type !== regType
              ) {
                updatedTokenRegs.push(tokenReg);
              }
            } else {
              return failure(
                new InvalidTokenError(
                  tokenReg.name,
                  `Cannot register a token named "${tokenReg.name}" because there is already a token with that name.`
                )
              );
            }
          } else {
            newTokenRegs.push(tokenReg);
          }
        }

        for (const token of site.styleTokens) {
          if (
            token.isRegistered &&
            token.regKey &&
            !registeredTokens.has(token.regKey)
          ) {
            removedTokens.push(token);
          }
        }

        if (removedTokens.length > 0) {
          shouldDelete = await fns.confirmRemovedTokens?.(removedTokens);
        }
      } while (!shouldDelete && removedTokens.length > 0);

      if (
        newTokenRegs.length > 0 ||
        updatedTokenRegs.length > 0 ||
        removedTokens.length > 0
      ) {
        run(
          await ctx.change<never>(
            ({ success: changeSuccess }) => {
              const newTokens: StyleToken[] = [];
              const updatedTokens: StyleToken[] = [];
              for (const tokenReg of newTokenRegs) {
                const token = createStyleTokenFromRegistration(tokenReg);
                site.styleTokens.push(token);
                newTokens.push(token);
              }

              const removeToken = (token: StyleToken) => {
                const [usages, summary] = extractTokenUsages(site, token);
                ctx.observeComponents([
                  ...summary.components,
                  ...summary.frames.map((f) => f.container.component),
                ]);
                for (const usage of usages) {
                  changeTokenUsage(site, token, usage, "reset");
                }
                removeFromArray(site.styleTokens, token);
              };

              for (const tokenReg of updatedTokenRegs) {
                const existing = ensure(
                  existingTokens.get(tokenReg.name),
                  "Previously checked"
                );
                existing.value = tokenReg.value;
                if (
                  existing.type !== registeredTypeToTokenType(tokenReg.type)
                ) {
                  removeToken(existing);
                  site.styleTokens.push(existing);
                }
                updatedTokens.push(existing);
              }

              for (const token of removedTokens) {
                removeToken(token);
              }

              fns.onUpdatedTokens?.({
                newTokens,
                updatedTokens,
                removedTokens,
              });
              return changeSuccess();
            },
            { noUndoRecord: true }
          )
        );
      }

      return success();
    }
  );
}

async function upsertRegisteredFunctions(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, InvalidCustomFunctionError>(
    async ({ success, failure, run }) => {
      const site = ctx.site;
      const existingFunctions = new Map(
        site.customFunctions.map((f) => [customFunctionId(f), f])
      );
      const registeredFunctions = new Map(
        ctx.codeComponentsRegistry.getRegisteredFunctionsMap()
      );

      const newFunctionRegs: CustomFunctionRegistration[] = [];
      const updatedFunctionRegs: CustomFunctionRegistration[] = [];
      const removedFunctions = new Set<CustomFunction>();

      const isValidType = (type: ParamType<any> | VoidType): boolean => {
        if (Array.isArray(type)) {
          return type.every((t) => isValidType(t));
        }
        if (
          [
            "undefined",
            "object",
            "any",
            "string",
            "number",
            "boolean",
            "true",
            "false",
            "null",
            "array",
            "void",
          ].some((t) => t === type)
        ) {
          return true;
        }
        if (type.length >= 2 && type.startsWith("'") && type.endsWith("'")) {
          return true;
        }
        if (isNumeric(type)) {
          return true;
        }
        return false;
      };

      for (const functionReg of registeredFunctions.values()) {
        if (!isString(functionReg.meta.name)) {
          return failure(
            new InvalidCustomFunctionError(
              `Error registering custom function: expected \`meta.name\` to be a string, but got: ${functionReg.meta.name}`
            )
          );
        }
        const errorPrefix = `Error registering custom function ${registeredFunctionId(
          functionReg
        )}:`;
        if (!isValidJsIdentifier(functionReg.meta.name)) {
          return failure(
            new InvalidCustomFunctionError(
              `${errorPrefix} the function name must be a valid JavaScript identifier, but got: ${functionReg.meta.name}`
            )
          );
        }
        if (
          isString(functionReg.meta.namespace) &&
          !isValidJsIdentifier(functionReg.meta.namespace)
        ) {
          return failure(
            new InvalidCustomFunctionError(
              `${errorPrefix} the function namespace must be a valid JavaScript identifier, but got: ${functionReg.meta.namespace}`
            )
          );
        }
        for (const prop of [
          "namespace",
          "description",
          "typescriptDeclaration",
        ] as const) {
          if (
            !isString(functionReg.meta[prop]) &&
            !isNil(functionReg.meta[prop])
          ) {
            return failure(
              new InvalidCustomFunctionError(
                `${errorPrefix} expected \`meta.${prop}\` to be a string, but got: ${functionReg.meta[prop]}`
              )
            );
          }
        }
        if (!isString(functionReg.meta.importPath)) {
          return failure(
            new InvalidCustomFunctionError(
              `${errorPrefix} expected \`meta.importPath\` to be a string, but got: ${functionReg.meta.importPath}`
            )
          );
        }
        if (!isNil(functionReg.meta.params)) {
          if (!isArray(functionReg.meta.params)) {
            return failure(
              new InvalidCustomFunctionError(
                `${errorPrefix} expected \`meta.params\` to be an array, but got: ${functionReg.meta.params}`
              )
            );
          }
          for (const param of functionReg.meta.params as (
            | string
            | BaseParam<any>
          )[]) {
            if (isString(param)) {
              if (!isValidJsIdentifier(param)) {
                return failure(
                  new InvalidCustomFunctionError(
                    `${errorPrefix} expected \`meta.params\` to be an array with param names, but the provided name is not a valid JavaScript identifier: ${param}`
                  )
                );
              }
            } else {
              if (!isString(param.name) || !isValidJsIdentifier(param.name)) {
                return failure(
                  new InvalidCustomFunctionError(
                    `${errorPrefix} Param name is not a valid JavaScript identifier: ${param.name}`
                  )
                );
              }
              const paramErrorPrefix = `Error registering param ${
                param.name
              } of custom function ${registeredFunctionId(functionReg)}:`;
              if (!isNil(param.description) && !isString(param.description)) {
                return failure(
                  new InvalidCustomFunctionError(
                    `${paramErrorPrefix} expected \`description\` to be a string, but got: ${param.description}`
                  )
                );
              }
              if (!isNil(param.type) && !isValidType(param.type)) {
                return failure(
                  new InvalidCustomFunctionError(
                    `${paramErrorPrefix} \`type\` is not a supported type: ${
                      isArray(param.type) ? param.type.join(" | ") : param.type
                    }`
                  )
                );
              }
            }
          }
        }
        if (!isNil(functionReg.meta.returnValue)) {
          if (
            !isNil(functionReg.meta.returnValue.description) &&
            !isString(functionReg.meta.returnValue.description)
          ) {
            return failure(
              new InvalidCustomFunctionError(
                `${errorPrefix} expected \`meta.returnValue.description\` to be a string, but got: ${functionReg.meta.returnValue.description}`
              )
            );
          }
          const returnType = functionReg.meta.returnValue.type;
          if (!isNil(returnType) && !isValidType(returnType)) {
            return failure(
              new InvalidCustomFunctionError(
                `${errorPrefix} expected \`meta.returnValue.type\` is not a supported type: ${
                  isArray(returnType) ? returnType.join(" | ") : returnType
                }`
              )
            );
          }
        }

        const existing = existingFunctions.get(
          registeredFunctionId(functionReg)
        );
        if (existing) {
          const updateableFields: Omit<
            CustomFunction,
            "importName" | "namespace" | "typeTag" | "uid"
          > = pick(createCustomFunctionFromRegistration(functionReg), [
            "defaultExport",
            "importPath",
          ]);
          if (
            Object.entries(updateableFields).some(
              ([key, value]) => value !== existing[key]
            )
          ) {
            updatedFunctionRegs.push(functionReg);
          }
        } else {
          newFunctionRegs.push(functionReg);
        }
      }

      for (const customFunction of site.customFunctions) {
        if (!registeredFunctions.has(customFunctionId(customFunction))) {
          removedFunctions.add(customFunction);
        }
      }

      const functionIds = new Set<string>(
        site.customFunctions
          .filter((customFunction) => !removedFunctions.has(customFunction))
          .map((customFunction) => customFunctionId(customFunction))
      );

      const functionNamespaces = new Set<string>(
        withoutNils(
          allCustomFunctions(site)
            .filter(
              ({ customFunction }) => !removedFunctions.has(customFunction)
            )
            .map(({ customFunction }) => customFunction.namespace)
        )
      );

      for (const functionReg of newFunctionRegs) {
        const errorPrefix = `Error registering custom function ${registeredFunctionId(
          functionReg
        )}:`;
        if (functionIds.has(registeredFunctionId(functionReg))) {
          return failure(
            new InvalidCustomFunctionError(
              `${errorPrefix} Multiple functions registered as ${registeredFunctionId(
                functionReg
              )}`
            )
          );
        }
        if (
          functionReg.meta.namespace &&
          functionIds.has(functionReg.meta.namespace)
        ) {
          return failure(
            new InvalidCustomFunctionError(
              `${errorPrefix} Conflicting namespace with the same name as another registered function.`
            )
          );
        }
        if (functionNamespaces.has(registeredFunctionId(functionReg))) {
          return failure(
            new InvalidCustomFunctionError(
              `${errorPrefix} ${registeredFunctionId(
                functionReg
              )} is already registered as a namespace. Please rename the function or add a namespace to it.`
            )
          );
        }
        functionIds.add(registeredFunctionId(functionReg));
        if (functionReg.meta.namespace) {
          functionNamespaces.add(functionReg.meta.namespace);
        }
      }

      if (
        newFunctionRegs.length > 0 ||
        updatedFunctionRegs.length > 0 ||
        removedFunctions.size > 0
      ) {
        run(
          await ctx.change<never>(
            ({ success: changeSuccess }) => {
              const newFunctions: CustomFunction[] = [];
              const updatedFunctions: CustomFunction[] = [];
              for (const functionReg of newFunctionRegs) {
                const customFunction =
                  createCustomFunctionFromRegistration(functionReg);
                site.customFunctions.push(customFunction);
                newFunctions.push(customFunction);
              }

              for (const functionReg of updatedFunctionRegs) {
                const existing = ensure(
                  existingFunctions.get(registeredFunctionId(functionReg)),
                  "Previously checked"
                );
                const updateableFields: Omit<
                  CustomFunction,
                  "importName" | "namespace" | "typeTag" | "uid"
                > = pick(createCustomFunctionFromRegistration(functionReg), [
                  "defaultExport",
                  "importPath",
                ]);
                Object.assign(existing, updateableFields);
                updatedFunctions.push(existing);
              }

              for (const customFunction of removedFunctions) {
                // TODO: Ask if user wants to map to another function, and if so,
                // refactor code expressions.
              }
              removeWhere(site.customFunctions, (customFunction) =>
                removedFunctions.has(customFunction)
              );

              fns.onUpdatedCustomFunctions?.({
                newFunctions,
                updatedFunctions,
                removedFunctions: Array.from(removedFunctions.keys()),
              });
              return changeSuccess();
            },
            { noUndoRecord: true }
          )
        );
      }

      return success();
    }
  );
}

async function upsertRegisteredLibs(
  ctx: SiteCtx,
  fns: CodeComponentSyncCallbackFns
) {
  return failableAsync<void, InvalidCodeLibraryError>(
    async ({ success, failure, run }) => {
      const site = ctx.site;
      const existingLibs = new Map(
        site.codeLibraries.map((lib) => [lib.name, lib])
      );
      const registeredLibs = new Map(
        ctx.codeComponentsRegistry.getRegisteredLibrariesMap()
      );
      const newLibraryRegs: CodeLibraryRegistration[] = [];
      const updatedLibraryRegs: CodeLibraryRegistration[] = [];
      const removedLibraries = new Set<CodeLibrary>([]);
      for (const registration of registeredLibs.values()) {
        const errorPrefix = `Error registering Code Library ${registration.meta.name}:`;
        for (const prop of ["name", "importPath", "jsIdentifier"] as const) {
          if (!isString(registration.meta[prop])) {
            return failure(
              new InvalidCodeLibraryError(
                `${errorPrefix} Expected \`meta.${prop}\` to be a String, but got: ${registration.meta[prop]}`
              )
            );
          }
        }
        if (
          !(["namespace", "default", "named"] as const).includes(
            registration.meta.importType
          )
        ) {
          return failure(
            new InvalidCodeLibraryError(
              `${errorPrefix} Expected \`meta.importType\` to be a 'namespace', 'default' or 'named', but got: ${registration.meta.importType}`
            )
          );
        }
        if (!Array.isArray(registration.meta.files)) {
          return failure(
            new InvalidCodeLibraryError(
              `${errorPrefix} Expected \`meta.files\` to be an array, but got: ${registration.meta.files}`
            )
          );
        }
        const wrongFileIdx = registration.meta.files.findIndex(
          (f) => !isString(f.contents) || !isString(f.fileName)
        );
        if (wrongFileIdx >= 0) {
          return failure(
            new InvalidCodeLibraryError(
              `${errorPrefix} Unexpect data for \`meta.files[${wrongFileIdx}]\`: ${registration.meta.files[wrongFileIdx]}`
            )
          );
        }

        const existing = existingLibs.get(registration.meta.name);
        if (existing) {
          const updateableFields: Omit<
            CodeLibrary,
            "name" | "typeTag" | "uid"
          > = pick(createCodeLibraryFromRegistration(registration), [
            "importPath",
            "jsIdentifier",
            "importType",
            "namedImport",
            "isSyntheticDefaultImport",
          ]);

          if (
            Object.entries(updateableFields).some(
              ([key, value]) => value !== existing[key]
            )
          ) {
            updatedLibraryRegs.push(registration);
          }
        } else {
          newLibraryRegs.push(registration);
        }
      }

      for (const codeLib of site.codeLibraries) {
        if (!registeredLibs.has(codeLib.name)) {
          removedLibraries.add(codeLib);
        }
      }

      if (
        newLibraryRegs.length > 0 ||
        updatedLibraryRegs.length > 0 ||
        removedLibraries.size > 0
      ) {
        run(
          await ctx.change<never>(({ success: changeSuccess }) => {
            const newLibraries: CodeLibrary[] = [];
            const updatedLibraries: CodeLibrary[] = [];
            for (const registration of newLibraryRegs) {
              const lib = createCodeLibraryFromRegistration(registration);
              site.codeLibraries.push(lib);
              newLibraries.push(lib);
            }

            for (const registration of updatedLibraryRegs) {
              const existing = ensure(
                existingLibs.get(registration.meta.name),
                "Previously checked"
              );
              const updateableFields: Omit<
                CodeLibrary,
                "name" | "typeTag" | "uid"
              > = pick(createCodeLibraryFromRegistration(registration), [
                "importPath",
                "jsIdentifier",
                "importType",
                "namedImport",
                "isSyntheticDefaultImport",
              ]);
              Object.assign(existing, updateableFields);
              updatedLibraries.push(existing);
            }

            removeWhere(site.codeLibraries, (lib) => removedLibraries.has(lib));

            fns.onUpdatedCodeLibraries?.({
              newLibraries,
              updatedLibraries,
              removedLibraries: Array.from(removedLibraries.keys()),
            });
            return changeSuccess();
          })
        );
      }

      return success();
    }
  );
}

export function syncPlumeComponent(siteCtx: SiteCtx, comp: Component) {
  return failable<void, Error>(({ run, success }) => {
    const plugin = getPlumeEditorPlugin(comp);
    if (!plugin || !plugin.codeComponentMeta) {
      return success();
    }

    const compMeta = makePlumeComponentMeta(comp);

    // Sync over some component meta attributes that make sense for Components
    // in general
    run(refreshCodeComponentMeta(siteCtx.site, comp, compMeta, {}));

    const diff = {
      ...run(compareComponentPropsWithMeta(siteCtx.site, comp, compMeta)),
      component: comp,
    };
    run(doUpdateComponentProps(siteCtx, diff));

    const stateChanges = run(
      compareComponentStatesWithMeta(siteCtx.site, comp, compMeta)
    );
    if (hasStateChanges(stateChanges)) {
      doUpdateComponentStates(siteCtx.site, comp, stateChanges);
    }
    return success();
  });
}

export function makePlumeComponentMeta(comp: Component): ComponentMeta<any> {
  const plugin = getPlumeEditorPlugin(comp);
  const codeMeta = plugin?.codeComponentMeta?.(comp);
  return {
    name: comp.name,
    importPath: "",
    props: {},
    ...codeMeta,
  };
}

export interface CodeComponentWithHelpers extends CodeComponent {
  codeComponentMeta: CodeComponentMeta & {
    helpers: CodeComponentHelper;
  };
}

export function isCodeComponentWithHelpers(
  c: Component
): c is CodeComponentWithHelpers {
  return !!c.codeComponentMeta?.helpers;
}

export function tryGetStateHelpers(c: ComponentMeta<any>, state: NamedState) {
  return c.componentHelpers?.helpers.states?.[state.name];
}

async function refreshDefaultSlotContents(siteCtx: SiteCtx) {
  return siteCtx.change<
    | UnknownComponentError
    | UnknownComponentPropError
    | CodeComponentRegistrationTypeError
    | DuplicatedComponentParamError
    | CyclicComponentReferencesError
    | BadPresetSchemaError
    | SelfReferencingComponent
    | BadElementSchemaError
  >(({ success, run }) => {
    const componentToMeta = buildComponentToMeta(siteCtx, {
      includePlume: false,
    });
    for (const comp of siteCtx.site.components.filter(isCodeComponent)) {
      const meta = componentToMeta.get(comp);
      if (meta) {
        const slotContents = extractDefaultSlotContents(meta);
        if (
          !isEqual(comp.codeComponentMeta.defaultSlotContents, slotContents)
        ) {
          run(checkDefaultSlotContents(siteCtx, comp, slotContents));
          comp.codeComponentMeta.defaultSlotContents = slotContents;
        }
      }
    }

    run(checkForCyclesInSlotsDefaultValue(siteCtx));

    // Clear out any TplSlot.defaultContents, which is now obsolete, as default contents
    // for code components are now created at instantiation time. We can't do this
    // with a migration script, as we need to do this upon code component registration
    // runs when the studio loads up.
    const slots = siteCtx.site.components
      .filter(isCodeComponent)
      .flatMap((comp) => flattenTpls(comp.tplTree))
      .filter(isTplSlot)
      .filter((slot) => slot.defaultContents.length > 0);
    if (slots.length > 0) {
      siteCtx.observeComponents(siteCtx.site.components);
      // If there are any slots with default contents, then we fork them all first
      // before clearing the default contents
      forkAllTplCodeComponentVirtualArgs(siteCtx.site);
    }
    for (const slot of slots) {
      slot.defaultContents = [];
    }
    return success();
  });
}

export function extractDefaultSlotContents(meta: ComponentMeta<any>) {
  return Object.fromEntries(
    withoutNils(
      Object.entries(meta.props).map(([prop, propMeta]) => {
        if (
          isPlainObjectPropType(propMeta) &&
          propMeta.type === "slot" &&
          propMeta.defaultValue
        ) {
          return [prop, propMeta.defaultValue];
        } else {
          return undefined;
        }
      })
    )
  );
}

export function forkAllTplCodeComponentVirtualArgs(site: Site) {
  for (const comp of site.components) {
    if (!isCodeComponent(comp)) {
      for (const tpl of flattenComponent(comp).filter(isTplComponent)) {
        if (isCodeComponent(tpl.component)) {
          const slotParams = getSlotParams(tpl.component);
          if (slotParams.length > 0) {
            for (const vs of tpl.vsettings) {
              for (const arg of vs.args) {
                if (
                  (slotParams as Param[]).includes(arg.param) &&
                  isKnownVirtualRenderExpr(arg.expr)
                ) {
                  arg.expr = new RenderExpr({ tpl: [...arg.expr.tpl] });
                }
              }
            }
          }
        }
      }
    }
  }
}

export function appendCodeComponentMetaToModel(
  site: Site,
  codeComponentRegistrations: ComponentRegistration[]
) {
  const codeComponents = allComponents(site, { includeDeps: "all" }).filter(
    (c) => isCodeComponent(c)
  );
  for (const component of codeComponents) {
    const meta = codeComponentRegistrations.find(
      (c) => c.meta.name === component.name
    )?.meta;
    if (isCodeComponent(component) && meta) {
      component._meta = meta;
    }
  }
}

export const _testonly = {
  findDuplicateAriaParams,
};
