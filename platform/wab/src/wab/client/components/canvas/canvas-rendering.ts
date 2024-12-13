import {
  SlateRenderNodeOpts,
  mkCanvasText,
  mkSlateChildren,
} from "@/wab/client/components/canvas/CanvasText";
import {
  cachedRenderTplNode,
  reactHookSpecsToKey,
} from "@/wab/client/components/canvas/canvas-cache";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import {
  CanvasErrorBoundaryProps,
  mkCanvasErrorBoundary,
  withErrorDisplayFallback,
} from "@/wab/client/components/canvas/canvas-error";
import {
  isExplicitlySized,
  resizePlaceholder,
} from "@/wab/client/components/canvas/canvas-fns-impl";
import { useCanvasForceUpdate } from "@/wab/client/components/canvas/canvas-hooks";
import {
  mkCanvasObserver,
  mkUseCanvasObserver,
} from "@/wab/client/components/canvas/canvas-observer";
import { genRepeatedElement } from "@/wab/client/components/canvas/repeatedElement";
import {
  showCanvasAuthNotification,
  showCanvasPageNavigationNotification,
  trapInteractionError,
} from "@/wab/client/components/canvas/studio-canvas-util";
import { getRealClassNames } from "@/wab/client/components/canvas/styles-name";
import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { buildViewCtxPinMaps } from "@/wab/client/cseval";
import { globalHookCtx } from "@/wab/client/react-global-hook/globalHook";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { EditingTextContext, ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { mkTokenRef } from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import {
  getSlotParams,
  isLikelyTextTplSlot,
  isStyledTplSlot,
  shouldWrapSlotContentInDataCtxReader,
} from "@/wab/shared/SlotUtils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  VariantCombo,
  getActiveVariantSettings,
  isBaseVariant,
  isCodeComponentVariant,
  isDisabledPseudoSelectorVariantForTpl,
  isGlobalVariant,
  isMaybeInteractiveCodeComponentVariant,
  isPseudoElementVariantForTpl,
  isScreenVariant,
  isStyleOrCodeComponentVariant,
  variantHasPrivatePseudoElementSelector,
} from "@/wab/shared/Variants";
import {
  componenToNonVariantParamNames,
  componentToElementNames,
  componentToVariantParamNames,
  computedNodeNamer,
  computedProjectFlags,
  makeTokenValueResolver,
} from "@/wab/shared/cached-selectors";
import {
  INTERNAL_CC_CANVAS_SELECTION_PROP,
  classNameProp,
  dataCanvasEnvsProp,
  frameUidProp,
  internalCanvasElementProps,
  plasmicClonedIndex,
  renderingCtxProp,
  repFragmentKey,
  richTextProp,
  setControlContextDataProp,
  slotArgCompKeyProp,
  slotArgParamProp,
  slotExtraCanvasEnvProp,
  slotFragmentKey,
  slotPlaceholderAttr,
  valKeyProp,
  valOwnerProp,
} from "@/wab/shared/canvas-constants";
import {
  getBuiltinComponentRegistrations,
  isBuiltinCodeComponent,
} from "@/wab/shared/code-components/builtin-code-components";
import {
  isCodeComponentWithHelpers,
  isPlainObjectPropType,
  tryGetStateHelpers,
} from "@/wab/shared/code-components/code-components";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import { toReactAttr } from "@/wab/shared/codegen/image-assets";
import { makeCssClassNameForVariantCombo } from "@/wab/shared/codegen/react-p/class-names";
import { nodeNameBackwardsCompatibility } from "@/wab/shared/codegen/react-p/constants";
import {
  getRepetitionIndexInternalName,
  getRepetitionItemInternalName,
  serializeDataRepsIndexName,
} from "@/wab/shared/codegen/react-p/data-reps";
import { ReactHookSpec } from "@/wab/shared/codegen/react-p/react-hook-spec";
import {
  NodeNamer,
  getExportedComponentName,
  makeRootResetClassName,
  makeWabFlexContainerClassName,
  makeWabHtmlTextClassName,
  makeWabInstanceClassName,
  makeWabSlotClassName,
  makeWabTextClassName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { deriveReactHookSpecs } from "@/wab/shared/codegen/react-p/utils";
import {
  paramToVarName,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  assert,
  cx,
  ensure,
  ensureArray,
  ensureInstance,
  ensureType,
  mapEquals,
  maybe,
  setEquals,
  switchType,
  tuple,
  unexpected,
  withDefaultFunc,
  withoutNils,
} from "@/wab/shared/common";
import {
  allComponentVariants,
  getComponentDisplayName,
  getRepetitionElementName,
  getRepetitionIndexName,
  isCodeComponent,
  isHostLessCodeComponent,
} from "@/wab/shared/core/components";
import {
  ExprCtx,
  InteractionArgLoc,
  InteractionLoc,
  asCode,
  code,
  extractReferencedParam,
  getCodeExpressionWithFallback,
  getRawCode,
  isInteractionLoc,
  isRealCodeExpr,
  removeFallbackFromDataSourceOp,
} from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { makeSelectableKey } from "@/wab/shared/core/selection";
import { isSlotSelection } from "@/wab/shared/core/slots";
import {
  StateVariableType,
  getComponentStateOnChangePropNames,
  getLastPartOfImplicitStateName,
  getStateDisplayName,
  getStateOnChangePropName,
  getStateValuePropName,
  getStateVarName,
  getVirtualWritableStateInitialValue,
  isReadonlyState,
  isWritableState,
  shouldHaveImplicitState,
} from "@/wab/shared/core/states";
import { plasmicImgAttrStyles } from "@/wab/shared/core/style-props";
import {
  classNameForRuleSet,
  defaultStyleClassNames,
  getTriggerableSelectors,
  hasGapStyle,
  makeCanvasRuleNamers,
  makeDefaultStyleValuesDict,
  makeStyleExprClassName,
  makeStyleScopeClassName,
  studioDefaultStylesClassNameBase,
} from "@/wab/shared/core/styles";
import {
  RawTextLike,
  TplTextTag,
  ancestorsUp,
  getNumberOfRepeatingAncestors,
  getOwnerSite,
  isExprText,
  isGridChild,
  isRawText,
  isTplCodeComponent,
  isTplColumn,
  isTplComponent,
  isTplIcon,
  isTplImage,
  isTplRepeated,
  isTplTag,
  isTplTextBlock,
  summarizeTpl,
  tplHasRef,
} from "@/wab/shared/core/tpls";
import { uniqifyClassName } from "@/wab/shared/css";
import { parseDataUrlToSvgXml } from "@/wab/shared/data-urls";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
import {
  EffectiveVariantSetting,
  getEffectiveVariantSetting,
} from "@/wab/shared/effective-variant-setting";
import { stampIgnoreError } from "@/wab/shared/error-handling";
import { CanvasEnv, evalCodeWithEnv } from "@/wab/shared/eval";
import { exprUsesCtxOrFreeVars } from "@/wab/shared/eval/expression-parser";
import { ContainerType } from "@/wab/shared/layoututils";
import {
  CollectionExpr,
  Component,
  ComponentDataQuery,
  CompositeExpr,
  CustomCode,
  DataSourceOpExpr,
  EventHandler,
  Expr,
  FunctionArg,
  FunctionExpr,
  ImageAssetRef,
  MapExpr,
  Marker,
  ObjectPath,
  PageHref,
  Param,
  QueryInvalidationExpr,
  RenderExpr,
  Site,
  State,
  StrongFunctionArg,
  StyleExpr,
  StyleTokenRef,
  TemplatedString,
  TplComponent,
  TplNode,
  TplRef,
  TplSlot,
  TplTag,
  VarRef,
  Variant,
  VariantSetting,
  VariantsRef,
  VirtualRenderExpr,
  ensureKnownNamedState,
  isKnownColorPropType,
  isKnownCustomCode,
  isKnownDefaultStylesClassNamePropType,
  isKnownDefaultStylesPropType,
  isKnownEventHandler,
  isKnownNamedState,
  isKnownObjectPath,
  isKnownStateParam,
  isKnownStyleExpr,
  isKnownStyleScopeClassNamePropType,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import { isRenderFuncType, typeFactory } from "@/wab/shared/model/model-util";
import { canAddChildren } from "@/wab/shared/parenting";
import {
  getPlumeCanvasPlugin,
  getPlumeCodegenPlugin,
  getPlumeEditorPlugin,
} from "@/wab/shared/plume/plume-registry";
import { hashExpr } from "@/wab/shared/site-diffs";
import { PageSizeType, deriveSizeStyleValue } from "@/wab/shared/sizingutils";
import { placeholderImgUrl } from "@/wab/shared/urls";
import { JsIdentifier } from "@/wab/shared/utils/regex-js-identifier";
import {
  makeVariantComboSorter,
  sortedVariantSettings,
} from "@/wab/shared/variant-sort";
import type { usePlasmicInvalidate } from "@plasmicapp/data-sources";
import { DataDict, mkMetaName } from "@plasmicapp/host";
import { $StateSpec } from "@plasmicapp/react-web";
import {
  cloneDeep,
  isString,
  last,
  omit,
  pick,
  uniqBy,
  without,
  zipObject,
} from "lodash";
import { IObservableValue, comparer, computed, observable } from "mobx";
import { computedFn } from "mobx-utils";
import type React from "react";
import { maybeMakePlasmicImgSrc } from "src/wab/shared/codegen/react-p/image";
import defer = setTimeout;

export const hasLoadingBoundaryKey = "plasmicInternalHasLoadingBoundary";
const enableLoadingBoundaryKey = "plasmicInternalEnableLoadingBoundary";

export type PinnedVariants = Map<Variant, boolean | null>;
export type PinMap = Map<string, PinnedVariants>;

export interface RenderingCtx {
  sub: SubDeps;
  rootClassName: string | undefined;
  site: Site;
  projectFlags: DevFlagsType;
  valKey: string;
  ownersStack: string[]; // `ValComponent` keys
  // ownerComponent, ownerKey and nodeNamer can only be undefined for the
  // "top-level" TplComponent like ArenaFrame.container or global contexts tpls.
  ownerComponent: Component | undefined;
  ownerKey: string | undefined;
  nodeNamer: NodeNamer | undefined;
  overrides: Record<string, any>;
  activeVariants: Set<Variant>;
  reactHookSpecs: ReactHookSpec[];
  triggerProps: Record<string, React.HTMLAttributes<HTMLElement>>;
  env: CanvasEnv;
  wrappingEnv: CanvasEnv;
  viewCtx: ViewCtx;
  forceValComponentKeysWithDefaultSlotContents?: Set<string>;
  visibilityOptions: {
    showSlotPlaceholders: boolean;
    showContainersPlaceholders: boolean;
  };

  // $state is part of the tpl evaluation environment, which we use to
  // determine if we can cache a rendered tpl node. Since all elements
  // in a component will have the same $state, we only make this
  // snapshot once, per component. We need to make a snapshot because
  // $state is altered by mutation.
  $stateSnapshot: Record<string, any>;

  inline?: boolean;
  // `slate` is only passed by rich text blocks to their marker nodes when
  // the text is being edited. In that case, Slate requires rendering these
  // attributes and children to work properly.
  slate?: SlateRenderNodeOpts;

  setDollarQueries: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  plasmicInvalidate: ReturnType<typeof usePlasmicInvalidate> | undefined;
  stateSpecs: $StateSpec<any>[];

  // This is used to enable code components variants in the canvas
  $ccVariants: Record<string, boolean>;
  updateVariant: (changes: Record<string, boolean>) => void;
}

interface CanvasComponentProps
  extends Partial<Record<(typeof internalCanvasElementProps)[number], any>> {
  [valKeyProp]: string;
  [dataCanvasEnvsProp]: { env: CanvasEnv; wrappingEnv: CanvasEnv };
  [renderingCtxProp]: RenderingCtx;
  [plasmicClonedIndex]?: number;
  [valOwnerProp]?: string;
  [classNameProp]: string;
  [frameUidProp]?: number;
  [slotArgCompKeyProp]?: string;
  [slotArgParamProp]?: string;
  ref?: React.Ref<any>;
}

export const createCanvasComponent = computedFn(
  (
    viewCtx: ViewCtx,
    component: Component
  ): React.ComponentType<CanvasComponentProps> => {
    const canvasCtx = viewCtx.canvasCtx;
    const sub = canvasCtx.Sub;
    const getArgsAndVariants = () => ({
      internalArgProps: componenToNonVariantParamNames(component),
      internalVariantProps: componentToVariantParamNames(component),
    });
    const CanvasComponent: React.ComponentType<CanvasComponentProps> = (
      originalProps
    ) => {
      return mkUseCanvasObserver(sub, viewCtx)(() => {
        const ctx = useCtxFromInternalComponentProps(
          originalProps,
          viewCtx,
          component,
          getArgsAndVariants
        );

        return sub.React.createElement(
          mkTriggers(sub, viewCtx, reactHookSpecsToKey(ctx.reactHookSpecs)),
          {
            ctx,
            component,
            childrenFn: (newCtx) =>
              wrapInComponentDataQueries(newCtx, component),
          }
        );
      }, component.name);
    };
    Object.assign(CanvasComponent, {
      displayName: getExportedComponentName(component) + "__Impl",
    });
    const plumePlugin = getPlumeCanvasPlugin(component);
    const MaybePlumeComp =
      (plumePlugin?.genCanvasWrapperComponent(
        sub,
        CanvasComponent,
        mkUseCanvasObserver(sub, viewCtx),
        getArgsAndVariants,
        component,
        viewCtx,
        (_comp) => createCanvasComponent(viewCtx, _comp)
      ) as React.ComponentType<CanvasComponentProps>) ?? CanvasComponent;
    const CanvasComponentWrapper: typeof MaybePlumeComp = sub.React.forwardRef(
      (props, ref) =>
        sub.React.createElement<CanvasErrorBoundaryProps>(
          mkCanvasErrorBoundary(sub.React, viewCtx),
          {
            ctx: props[renderingCtxProp] ?? makeEmptyRenderingCtx(viewCtx, ""),
            nodeOrComponent: component,
            children: sub.React.createElement(MaybePlumeComp, {
              ...props,
              ref,
            }),
          }
        )
    );
    Object.assign(CanvasComponentWrapper, {
      displayName: getExportedComponentName(component),
      ...(component.plumeInfo
        ? {
            __plumeType: component.plumeInfo.type,
          }
        : {}),
    });
    return CanvasComponentWrapper;
  },
  {
    keepAlive: true,
  }
);

export interface ExtraSlotCanvasEnvData {
  env: CanvasEnv;
  tplComponentValKey: string;
  slotPropUuid: string;
}

export function mkEventHandlerEnv(
  env: CanvasEnv,
  studioCtx: StudioCtx,
  reactWeb: RenderingCtx["sub"]["reactWeb"],
  plasmicInvalidate: RenderingCtx["plasmicInvalidate"],
  win: typeof window,
  dataSources?: RenderingCtx["sub"]["dataSources"]
) {
  return {
    ...env,
    __wrapUserFunction: (
      loc: InteractionLoc | InteractionArgLoc,
      fn: () => any,
      args: Record<string, any>
    ) => {
      if (isInteractionLoc(loc)) {
        // Special handling for some interactions on canvas.

        if (loc.actionName === "navigation") {
          const destination = `${args.destination}`;
          if (destination.startsWith("#")) {
            win.document
              .getElementById(destination.substring(1))
              ?.scrollIntoView({ behavior: "smooth" });
          } else {
            showCanvasPageNavigationNotification(
              studioCtx,
              `${args.destination}`
            );
          }
          return;
        } else if (loc.actionName === "login" || loc.actionName === "logout") {
          showCanvasAuthNotification("interactive mode");
          return;
        }
      }

      try {
        return fn();
      } catch (error) {
        trapInteractionError(studioCtx, loc, error);
        stampIgnoreError(error);
        throw error;
      }
    },
    __wrapUserPromise: async (
      loc: InteractionLoc | InteractionArgLoc,
      promise: Promise<unknown>
    ) => {
      try {
        return await promise;
      } catch (error) {
        trapInteractionError(studioCtx, loc, error);
        stampIgnoreError(error);
        throw error;
      }
    },
    $stateGet: reactWeb.get,
    $stateSet: reactWeb.set,
    executePlasmicDataOp:
      dataSources?.executePlasmicDataOp ??
      studioCtx.executePlasmicDataOp.bind(studioCtx),
    plasmicInvalidate: plasmicInvalidate,
  };
}

function mkEventHandlerEnvFromRenderingCtx(ctx: RenderingCtx) {
  return mkEventHandlerEnv(
    ctx.env,
    ctx.viewCtx.studioCtx,
    ctx.sub.reactWeb,
    ctx.plasmicInvalidate,
    ctx.viewCtx.canvasCtx.win(),
    ctx.sub.dataSources
  );
}

function mkInitFuncExpr(
  state: State,
  variantCombo: VariantCombo,
  viewCtx: ViewCtx,
  exprCtx: ExprCtx,
  isForRegisterInitFunc?: boolean
) {
  if (viewCtx.component !== exprCtx.component && isWritableState(state)) {
    // we need to transform the root component writable states
    // into private to interact with them on its own component
    return undefined;
  }

  const isCurrentComponent = computed(
    () => viewCtx.currentComponent() === exprCtx.component,
    { name: "mkInitFuncExpr.isCurrentComponent" }
  ).get();

  if (!state.tplNode && state.variableType === "variant") {
    // Unless we are in interactive mode, we don't want to use variant
    // default exprs. That is to avoid activating variants in all
    // artboards.
    return code(
      `${
        state.param.previewExpr && viewCtx.component === exprCtx.component
          ? getRawCode(state.param.previewExpr, exprCtx)
          : state.param.defaultExpr &&
            (viewCtx.component !== exprCtx.component ||
              viewCtx.studioCtx.isInteractiveMode)
          ? getRawCode(state.param.defaultExpr, exprCtx)
          : undefined ?? `$props["${getStateValuePropName(state)}"]`
      }`
    );
  } else if (!state.tplNode && state.param.previewExpr && isCurrentComponent) {
    return state.param.previewExpr;
  } else if (!state.tplNode && state.param.defaultExpr) {
    return state.param.defaultExpr;
  } else if (state.tplNode) {
    const effectiveVs = getEffectiveVariantSetting(state.tplNode, variantCombo);
    const maybeArg = effectiveVs.args.find(
      (arg) => arg.param === state.implicitState?.param
    );
    const maybeAttr = isTplTag(state.tplNode)
      ? effectiveVs.attrs[toVarName(ensureKnownNamedState(state).name)]
      : undefined;
    const initExpr = isTplComponent(state.tplNode) ? maybeArg?.expr : maybeAttr;
    if (
      !isForRegisterInitFunc &&
      (ancestorsUp(state.tplNode).some(isTplRepeated) ||
        (initExpr && exprUsesCtxOrFreeVars(initExpr)))
    ) {
      // We need to use registerInitFunc because the function is either repeated or it uses the $ctx variable
      return undefined;
    }
    if (
      state.implicitState &&
      isTplCodeComponent(state.tplNode) &&
      isReadonlyState(state.implicitState) &&
      state.implicitState.param.previewExpr &&
      isCurrentComponent
    ) {
      // for plasmic component, we always fire an onChange in the first render, but for code components
      // we can only initialize it if the user specify an initVal/initFunc
      return state.implicitState.param.previewExpr;
    } else if (
      state.implicitState &&
      isTplCodeComponent(state.tplNode) &&
      isReadonlyState(state.implicitState) &&
      state.implicitState.param.defaultExpr
    ) {
      // for plasmic component, we always fire an onChange in the first render, but for code components
      // we can only initialize it if the user specify an initVal/initFunc
      return state.implicitState.param.defaultExpr;
    } else if (
      state.implicitState &&
      !initExpr &&
      isTplComponent(state.tplNode) &&
      isWritableState(state.implicitState)
    ) {
      return getVirtualWritableStateInitialValue(state.implicitState);
    } else {
      return initExpr;
    }
  }
  return undefined;
}

function mkInitFuncFromExpr(
  initFuncExpr: Expr,
  viewCtx: ViewCtx,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  isForRegisterInitFunc?: boolean
) {
  return evalCodeWithEnv(
    `(({$props, $state, $queries${isForRegisterInitFunc ? ", $ctx" : ""}}) => (
      ${getRawCode(initFuncExpr, exprCtx)}
    ))`,
    { ...(env ?? {}) },
    viewCtx.canvasCtx.win()
  );
}

function mkInitFunc(
  state: State,
  variantCombo: VariantCombo,
  viewCtx: ViewCtx,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  isForRegisterInitFunc?: boolean
) {
  const initFuncExpr = mkInitFuncExpr(
    state,
    variantCombo,
    viewCtx,
    exprCtx,
    isForRegisterInitFunc
  );
  if (!initFuncExpr) {
    return undefined;
  }
  return mkInitFuncFromExpr(
    initFuncExpr,
    viewCtx,
    env,
    exprCtx,
    isForRegisterInitFunc
  );
}

function mkInitFuncHash(
  state: State,
  variantCombo: VariantCombo,
  viewCtx: ViewCtx,
  exprCtx: ExprCtx
) {
  const initFuncExpr = mkInitFuncExpr(state, variantCombo, viewCtx, exprCtx);
  return initFuncExpr
    ? `${state.variableType}${hashExpr(initFuncExpr, exprCtx)}`
    : "";
}

function isSlotArgElement(v: React.ReactElement) {
  const props =
    isString(v.key) && v.key.startsWith(slotFragmentKey)
      ? JSON.parse(v.key.slice(slotFragmentKey.length))
      : v.props;
  return !!props[slotArgCompKeyProp] && !!props[slotArgParamProp];
}

const mkTriggers = computedFn(
  function mkTriggers(
    sub: SubDeps,
    viewCtx: ViewCtx,
    // The number of hooks to be called depends on `reactHookSpec`, so we create
    // a new component when the number of specs change.
    _reactHookSpecsKey: string
  ) {
    return function WithTriggers({
      ctx,
      component,
      childrenFn,
    }: {
      ctx: RenderingCtx;
      component: Component;
      childrenFn: (newCtx: RenderingCtx) => React.ReactElement | null;
    }): React.ReactElement | null {
      return mkUseCanvasObserver(
        sub,
        viewCtx
      )(() => {
        const isInteractive = ctx.viewCtx.studioCtx.isInteractiveMode;

        // triggers map is empty in non-interactive mode
        const { triggers, triggerProps } = useTriggers(
          ctx.viewCtx.canvasCtx,
          ctx.reactHookSpecs,
          isInteractive
        );

        const newCtx: RenderingCtx = {
          ...ctx,
          triggerProps,
          activeVariants: new Set([
            ...ctx.activeVariants.keys(),
            ...component.variants.filter((variant) => {
              if (!isStyleOrCodeComponentVariant(variant)) {
                return false;
              }
              // We include the style variants dynamically here to handle changes that require JS
              // to be re-run. For handling changes that only require CSS, we generate the proper
              // CSS classes in `genCanvasRules`. Those can only be applied in interactive mode,
              // because we don't want the content to change when the user tries to edit rich text
              // while in design mode.

              // Style variants of built-in components (like vertical stack's hover)
              if (!isCodeComponentVariant(variant)) {
                const hook = ctx.reactHookSpecs.find(
                  (spec) => spec.sv === variant
                );
                return hook && triggers[hook.hookName];
              }

              // Interactive registered variants (like a Button CC's hover) can not be applied in non-interactive mode
              if (
                isMaybeInteractiveCodeComponentVariant(variant) &&
                !isInteractive
              ) {
                return false;
              }

              // Non-interactive registered variants (like Button CC's disabled) do no harm to rich-text editing and can be applied in non-interactive mode
              return variant.codeComponentVariantKeys.reduce(
                (prev, key) => prev && ctx.$ccVariants[key],
                true
              );
            }),
          ]),
        };
        return childrenFn(newCtx);
      });
    };
  },
  {
    keepAlive: true,
  }
);

function useTriggers(
  canvasCtx: CanvasCtx,
  reactHookSpecs: ReactHookSpec[],
  interactive: boolean
) {
  const sub = canvasCtx.Sub;
  const uniqSpecs = uniqBy(reactHookSpecs, (s) => s.hookName);

  const triggers: Record<string, boolean> = {};
  const triggerProps: Record<string, React.HTMLAttributes<HTMLElement>> = {};
  for (const spec of uniqSpecs) {
    // We only set `triggered` if in interactive mode. If not, `triggered`
    // is always false. This is because we don't want to trigger hooks
    // when editing rich text blocks.
    let triggered = interactive;
    for (const opt of getTriggerableSelectors(spec.sv)) {
      const trigger = ensure(
        opt.trigger,
        "Trigger condition is expected to be not null"
      );
      const [expr, prop] = sub.reactWeb.useTrigger(trigger.hookName as any, {});
      triggered = triggered && (trigger.isOpposite ? !expr : expr);
      for (const propName of spec.getTriggerPropNames()) {
        triggerProps[propName] = prop;
      }
    }
    triggers[spec.hookName] = triggered;
  }

  return { triggers, triggerProps };
}

// Returns a RenderingCtx, but it's still missing `triggerProps` because they
// need a non-stable number of hooks. The complete `RenderingCtx` should be
// built inside `mkTriggers`.
function useCtxFromInternalComponentProps(
  originalProps: object,
  viewCtx: ViewCtx,
  component: Component,
  getArgsAndVariants: () => {
    internalVariantProps: string[];
    internalArgProps: string[];
  }
) {
  const canvasCtx = viewCtx.canvasCtx;
  const sub = canvasCtx.Sub;

  const viewState = ensure(
    sub.React.useContext(createViewStateContext(viewCtx)),
    "Must be rendered with ViewState context"
  );

  const nodeNamer = computedNodeNamer(component);

  const root = ensureInstance(component.tplTree, TplComponent, TplTag);
  const rootName = ensure(nodeNamer(root), () => "Expected root name to exist");

  const internalProps = pick(originalProps, internalCanvasElementProps);

  const argAndVariantNames = getArgsAndVariants();

  const { args, overrides, variants } = sub.reactWeb.deriveRenderOpts(
    omit(originalProps, internalCanvasElementProps),
    {
      name: rootName,
      descendantNames: componentToElementNames(component),
      internalArgPropNames: argAndVariantNames.internalArgProps,
      internalVariantPropNames: argAndVariantNames.internalVariantProps,
    }
  );

  // Sometimes we trigger a re-render after renaming a slot, which runs on the
  // inner component before the parent component re-renders, and therefore uses
  // the props with the old name. Since there's no longer a Param with the old
  // name, it would be interpreted as an override, so we delete overrides that
  // receive slot args here.
  Object.values(overrides).forEach(
    (eltOverrides) =>
      eltOverrides?.props &&
      [...Object.entries(eltOverrides.props)].forEach(([key, value]) => {
        const arr = ensureArray(value);
        if (
          arr.length > 0 &&
          arr.every(
            (v: any) => v && sub.React.isValidElement(v) && isSlotArgElement(v)
          )
        ) {
          delete eltOverrides.props[key];
        }
      })
  );

  const reactHookSpecs = deriveReactHookSpecs(component, nodeNamer);

  const plasmicInvalidate =
    !!sub.dataSources?.usePlasmicInvalidate &&
    // Also need to check usePlasmicDataConfig() as
    // usePlasmicInvalidate() depends on it, and usePlasmicDataConfig()
    // is actually re-exported from @plasmicapp/query, so just because
    // usePlasmicInvalidate() exists doesn't mean
    // usePlasmicDataConfig() exists. That's because data-sources is
    // provided bo react-web, but query is provided by the user's
    // custom host
    !!sub.dataSources?.usePlasmicDataConfig
      ? sub.dataSources.usePlasmicInvalidate()
      : () => {};

  const renderingCtx: RenderingCtx = {
    // renderingCtx could be undefined, if this canvas component has for
    // some reason completely lost track of its rendering ctx (probably
    // by being used by some code or plume component in some surprising way;
    // for example, Select renders Select.Option without any rendering ctx
    // if Select options are provided as an array.
    ...(internalProps[renderingCtxProp] ?? makeEmptyRenderingCtx(viewCtx, "")),
    reactHookSpecs,
    triggerProps: {},
    plasmicInvalidate,
  };

  const initialActiveVariants = deriveActiveVariants(
    component,
    variants,
    viewState.pinMap,
    viewState.globalPins,
    renderingCtx
  );

  const meta = maybeGetCodeComponentMeta(viewCtx, component);

  const $ctx = sub.useDataEnv?.() ?? {};
  // Hide $props.<vgName> from data picker to avoid confusion with
  // $state.<vgName>, which should be preferred.
  const variantProps = variantsToProps(component, [...initialActiveVariants], {
    hideFromDataPicker: true,
  });
  const $props = {
    ...args,
    // Hide $props.<stateName> from data picker to avoid confusion with
    // $state.<stateName>, which should be preferred.
    ...Object.fromEntries(
      component.states.map((s) => [
        mkMetaName(getStateValuePropName(s)),
        { hidden: true },
      ])
    ),
    // we need to use the canvas constructors
    ...viewCtx.canvasCtx.win().JSON.parse(JSON.stringify(variantProps)),
    // Hide $props.on<propName>Change from data picker.
    ...Object.fromEntries(
      withoutNils(component.states.map((s) => getStateOnChangePropName(s))).map(
        (s) => [mkMetaName(s), { hidden: true }]
      )
    ),
  };

  const dataSourcesCtx = sub.dataSourcesContext?.usePlasmicDataSourceContext();

  const [$queries, setDollarQueries] = sub.React.useState({});

  const refsRef = sub.React.useRef({});
  const $refs = refsRef.current;

  // We will use $ccVariants to store the variants that are triggered
  // by the code component root, to keep the number of hooks stable. We will
  // always create these values during the canvas component initialization.
  const [$ccVariants, setDollarCcVariants] = sub.React.useState({});
  const updateVariant = sub.React.useCallback(
    (changes: Record<string, boolean>) => {
      setDollarCcVariants((prev) => {
        if (!Object.keys(changes).some((k) => prev[k] !== changes[k])) {
          return prev;
        }
        return { ...prev, ...changes };
      });
    },
    []
  );

  const $globalActions = sub.useGlobalActions?.();

  const env = {
    $props,
    $ctx,
    $refs,
    $$: viewCtx.customFunctions,
    dataSourcesCtx,
    $globalActions,
    $queries,
    ...(viewCtx.studioCtx.siteInfo.hasAppAuth
      ? { currentUser: viewCtx.studioCtx.currentAppUser }
      : {}),
  };

  const projectFlags = computedProjectFlags(viewCtx.site);

  const stateSpecs = component.states.map((state) => ({
    path: getStateVarName(state),
    type: state.accessType as "private" | "readonly" | "writable",
    initFunc: mkInitFunc(
      state,
      Array.from(initialActiveVariants),
      viewCtx,
      env,
      { component, projectFlags, inStudio: true }
    ),
    initFuncHash: mkInitFuncHash(
      state,
      Array.from(initialActiveVariants),
      viewCtx,
      { component, projectFlags, inStudio: true }
    ),
    ...(state.accessType !== "private"
      ? { onChangeProp: getStateOnChangePropName(state) }
      : {}),
    ...(isWritableState(state) && viewCtx.component !== component
      ? { valueProp: getStateValuePropName(state) }
      : {}),
    variableType: state.variableType as StateVariableType,
    ...(state.tplNode &&
    isTplCodeComponent(state.tplNode) &&
    tplHasRef(state.tplNode)
      ? { refName: nodeNamer(state.tplNode) }
      : {}),
    ...(state.tplNode &&
    isTplCodeComponent(state.tplNode) &&
    isCodeComponentWithHelpers(state.tplNode.component) &&
    meta &&
    isKnownNamedState(state.implicitState)
      ? {
          onMutate: tryGetStateHelpers(meta.meta, state.implicitState)
            ?.onMutate,
        }
      : {}),
  }));
  const $state = sub.reactWeb.useDollarState(
    stateSpecs,
    { $props, $queries, $ctx, $refs },
    {
      inCanvas: true,
    }
  );

  const activeVariants = deriveActiveVariants(
    component,
    $state,
    viewState.pinMap,
    viewState.globalPins,
    renderingCtx
  );
  if (viewCtx.studioCtx.isInteractiveMode && viewCtx.component === component) {
    const variantsController = makeVariantsController(viewCtx.studioCtx);
    viewCtx.change(() => {
      variantsController?.setVariantsFrom$State($state);
    });
  }

  const ctx: RenderingCtx = {
    ...renderingCtx,
    valKey: renderingCtx.valKey + "." + component.tplTree.uuid,
    activeVariants,
    nodeNamer,
    env: { ...env, $state },
    wrappingEnv: { ...env, $state },
    overrides,
    ownerComponent: component,
    ownerKey: renderingCtx.valKey,
    ownersStack: [...renderingCtx.ownersStack, renderingCtx.valKey],
    $stateSnapshot: cloneDeep($state),
    forceValComponentKeysWithDefaultSlotContents:
      viewState.forceValComponentKeysWithDefaultSlotContents,
    setDollarQueries,
    stateSpecs,
    $ccVariants,
    updateVariant: updateVariant,
  };
  return ctx;
}

function deriveActiveVariants(
  component: Component,
  variants: Record<string, any>,
  pinMap: PinMap,
  globalPins: Map<Variant, boolean>,
  ctx: RenderingCtx
) {
  return new Set<Variant>([
    ...[...globalPins.entries()].filter(([_, b]) => !!b).map(([v]) => v),
    ...[...(pinMap.get(ctx.valKey)?.entries() ?? [])]
      .filter(([_, b]) => !!b)
      .map(([v]) => v),
    ...component.variantGroups.flatMap((vg) =>
      vg.variants.filter((v) => {
        const groupName = toVarName(vg.param.variable.name);
        const variantName = toVarName(v.name);
        return ctx.sub.reactWeb.hasVariant(variants, groupName, variantName);
      })
    ),
  ]);
}

function variantsToProps(
  component: Component,
  variants: Variant[],
  opts?: { hideFromDataPicker: boolean }
): Record<string, string | string[] | boolean | undefined> {
  const props = Object.fromEntries(
    component.variantGroups.map((vg) => {
      const vgName = toVarName(vg.param.variable.name);
      const values = vg.variants
        .filter((v) => variants.includes(v))
        .map((v) => toVarName(v.name));
      if (values.length === 1) {
        return [vgName, values[0]];
      }
      if (vg.multi) {
        return [vgName, values];
      }
      return [vgName, undefined];
    })
  );
  if (opts?.hideFromDataPicker) {
    const keys = Object.keys(props);
    for (const key of keys) {
      props[mkMetaName(key)] = { hidden: true };
    }
  }
  return props;
}

function buildForceValComponentKeyWithDefaultSlotContents(vc: ViewCtx) {
  const keys = new Set<string>();
  if (vc.showDefaultSlotContents()) {
    // We need to tell the evaluator which ValComponents should be rendered with
    // default slot contents instead of args.  This should be the current spotlit
    // ValComponent, plus all ValComponents up the componentStackFrames.
    const valComp = vc.currentComponentCtx()?.valComponent();
    if (valComp) {
      keys.add(valComp.key);
      // The componentStackFrames() don't track ValComponent, only TplComponent,
      // so we walk up the valComp owners and cross reference them with TplComponents
      // in the componentStackFrames().
      const contextTplComponents = new Set(
        vc.componentStackFrames().map((f) => f.tplComponent)
      );
      let owner = valComp.valOwner;
      while (owner) {
        if (contextTplComponents.has(owner.tpl)) {
          keys.add(owner.key);
        }
        owner = owner.valOwner;
      }
    }
  }
  return keys;
}

interface ViewState {
  globalPins: Map<Variant, boolean>;
  pinMap: PinMap;
  forceValComponentKeysWithDefaultSlotContents: Set<string>;
}

const createViewStateContext = computedFn(
  (viewCtx: ViewCtx) => {
    const sub = viewCtx.canvasCtx.Sub;
    return sub.React.createContext<ViewState | undefined>(undefined);
  },
  {
    keepAlive: true,
    name: "createViewStateProvider",
  }
);

export function useRenderedFrameRoot(
  viewCtx: ViewCtx,
  root: TplNode
): React.ReactElement {
  const sub = viewCtx.canvasCtx.Sub;
  const ViewStateContext = createViewStateContext(viewCtx);
  const { globalPins, pinMap } = computed(() => buildViewCtxPinMaps(viewCtx), {
    equals: (a, b) => {
      // Building the pin map
      return (
        mapEquals(a.globalPins, b.globalPins) &&
        pinMapEquals(a.pinMap, b.pinMap)
      );
    },
    name: `renderFrameRoot.buildViewCtxPinMaps[${root.uuid}]`,
  }).get();
  const forceValComponentKeysWithDefaultSlotContents = computed(
    () => buildForceValComponentKeyWithDefaultSlotContents(viewCtx),
    {
      equals: (a, b) => setEquals(a, b),
      name: `renderFrameRoot.buildForceValComponentKeyWithDefaultSlotContents`,
    }
  ).get();

  const viewState = sub.React.useMemo(
    () => ({
      globalPins,
      pinMap,
      forceValComponentKeysWithDefaultSlotContents,
    }),
    [globalPins, pinMap, forceValComponentKeysWithDefaultSlotContents]
  );

  const r = sub.React.createElement;

  const content = r(
    ViewStateContext.Provider,
    { value: viewState },
    renderTplNode(root, {
      ...makeEmptyRenderingCtx(viewCtx, root.uuid),
      activeVariants: new Set([
        viewCtx.site.globalVariant,
        ...[...globalPins.entries()].filter(([_, b]) => !!b).map(([v]) => v),
      ]),
    })
  );

  const reactMajorVersion = +sub.React.version.split(".")[0];

  if (reactMajorVersion >= 18 && !!sub.DataProvider) {
    return r(
      sub.DataProvider,
      {
        name: enableLoadingBoundaryKey,
        hidden: true,
        data: true,
      },
      r(
        sub.React.Suspense,
        {
          fallback: "Loading...",
        },
        content
      )
    );
  }

  return content;
}

function makeEmptyRenderingCtx(viewCtx: ViewCtx, valKey: string): RenderingCtx {
  return {
    activeVariants: new Set(),
    env: {
      $ctx: {},
      $props: {},
      $state: {},
      $queries: {},
      $refs: {},
      $$: {},
      currentUser: {},
    },
    wrappingEnv: {
      $ctx: {},
      $props: {},
      $state: {},
      $queries: {},
      $refs: {},
      $$: {},
      currentUser: {},
    },
    ownersStack: [],
    reactHookSpecs: [],
    triggerProps: {},
    nodeNamer: undefined,
    ownerComponent: undefined,
    ownerKey: undefined,
    overrides: {},
    projectFlags: computedProjectFlags(viewCtx.site),
    rootClassName: "",
    site: viewCtx.site,
    sub: viewCtx.canvasCtx.Sub,
    valKey: valKey,
    viewCtx,
    visibilityOptions: {
      showSlotPlaceholders: viewCtx.studioCtx.showSlotPlaceholder(),
      showContainersPlaceholders: viewCtx.studioCtx.showContainerPlaceholder(),
    },
    $stateSnapshot: {},
    setDollarQueries: () => {},
    stateSpecs: [],
    plasmicInvalidate: undefined,
    $ccVariants: {},
    updateVariant: () => {},
  };
}

export function renderTplNode(node: TplNode, ctx: RenderingCtx) {
  globalHookCtx.uuidToTplNode.set(node.uuid, new WeakRef(node));
  globalHookCtx.valKeyToOwnerKey.set(ctx.valKey, ctx.ownerKey);
  return withErrorDisplayFallback(
    ctx.sub.React,
    ctx,
    node,
    () => cachedRenderTplNode(node, ctx, () => renderReppable(node, ctx)),
    {
      hasLoadingBoundary: ctx.env.$ctx[hasLoadingBoundaryKey],
    }
  );
}

function renderReppable(tplNode: TplNode, ctx: RenderingCtx) {
  const node = ensureInstance(tplNode, TplTag, TplComponent, TplSlot);
  const activeVSettings = getSortedActiveVariantSettings(node, ctx);
  const dataRep = last(activeVSettings.map((vs) => vs.dataRep).filter(Boolean));
  if (dataRep) {
    const collection = ensureArray(
      evalCodeWithEnv(
        getCodeExpressionWithFallback(
          ensureInstance(dataRep.collection, CustomCode, ObjectPath),
          {
            component: ctx.ownerComponent ?? null,
            projectFlags: ctx.projectFlags,
            inStudio: true,
          }
        ),
        ctx.env,
        ctx.viewCtx.canvasCtx.win()
      )
    );
    const idx = getNumberOfRepeatingAncestors(node) - 1;
    const elementInternalName = getRepetitionItemInternalName(idx);
    const indexInternalName = getRepetitionIndexInternalName(idx);
    const contents = withoutNils(
      collection.map((item, index) =>
        maybe(
          renderNonReppable(
            node,
            {
              ...ctx,
              env: {
                ...ctx.env,
                [getRepetitionElementName(dataRep)]: item,
                [getRepetitionIndexName(dataRep)]: index,
                [elementInternalName]: item,
                [indexInternalName]: index,
              },
              wrappingEnv: ctx.env,
            },
            activeVSettings
          ),
          (rendered) => mkRepeatedElement(ctx.sub.React)(index, rendered)
        )
      )
    );
    if (contents.length === 0) {
      return null;
    } else if (contents.length === 1) {
      return contents[0];
    } else {
      const contentKeys = new Set<React.Key | null>();
      [...contents].forEach((elt, index) => {
        if (elt.key != null && contentKeys.has(elt.key)) {
          let suffix = 2;
          while (contentKeys.has(`${elt.key}-${suffix}`)) {
            suffix++;
          }
          contents[index] = ctx.sub.React.cloneElement(elt, {
            key: `${elt.key}-${suffix}`,
          });
        }
        contentKeys.add(contents[index].key);
      });
      return ctx.sub.React.createElement(
        ctx.sub.React.Fragment,
        {
          key: `${repFragmentKey}-${ctx.valKey}`,
        },
        ...contents
      );
    }
  } else {
    return renderNonReppable(
      node,
      {
        ...ctx,
        wrappingEnv: ctx.env,
      },
      activeVSettings
    );
  }
}

export function getSortedActiveVariantSettings(
  tpl: TplNode,
  ctx: Pick<RenderingCtx, "site" | "activeVariants" | "ownerComponent">
) {
  const activeSettings = getActiveVariantSettings(tpl, ctx.activeVariants);
  if (activeSettings.length <= 1) {
    return activeSettings;
  }

  return sortedVariantSettings(
    activeSettings,
    makeVariantComboSorter(
      ctx.site,
      ensure(
        ctx.ownerComponent,
        () => `ownerComponent should exist in tplNodes with multiple vsettings`
      )
    )
  );
}

function renderNonReppable(
  node: TplNode,
  ctx: RenderingCtx,
  activeVSettings: VariantSetting[]
) {
  return switchType(node)
    .when(TplComponent, (tpl) => renderTplComponent(tpl, ctx, activeVSettings))
    .when(TplTag, (tpl) => renderTplTag(tpl, ctx, activeVSettings))
    .when(TplSlot, (tpl) => renderTplSlot(tpl, ctx, activeVSettings))
    .result();
}

function maybeGetCodeComponentMeta(viewCtx: ViewCtx, component: Component) {
  return DEVFLAGS.ccStubs || !isCodeComponent(component)
    ? undefined
    : viewCtx.canvasCtx
        .getRegisteredCodeComponentsAndContextsMap()
        .get(component.name);
}

function renderTplComponent(
  node: TplComponent,
  ctx: RenderingCtx,
  activeVSettings: VariantSetting[]
): React.ReactElement | null {
  const dataCondExpr = getCondExpr(activeVSettings, ctx);
  const exprCtx: ExprCtx = {
    component: ctx.ownerComponent ?? null,
    projectFlags: ctx.projectFlags,
    inStudio: true,
  };
  const dataCond =
    dataCondExpr == null
      ? true
      : evalCodeWithEnv(
          getCodeExpressionWithFallback(dataCondExpr, exprCtx),
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        );

  if (!dataCond) {
    return null;
  }

  let ComponentImpl:
    | React.ComponentType<any>
    | React.DetailedReactHTMLElement<any, any>;

  const meta = maybeGetCodeComponentMeta(ctx.viewCtx, node.component);
  if (
    !meta &&
    !DEVFLAGS.ccStubs &&
    isTplCodeComponent(node) &&
    isHostLessCodeComponent(node.component) &&
    ctx.viewCtx.canvasCtx.isUpdatingCcRegistry()
  ) {
    return null;
  }

  const effectiveVs = new EffectiveVariantSetting(
    node,
    activeVSettings,
    ctx.site
  );
  const props = computeTplComponentArgs(node, effectiveVs, ctx);
  const isComponentRoot = ctx.ownerComponent?.tplTree === node;
  const positionClassName = uniqifyClassName(
    [
      makeWabInstanceClassName({ targetEnv: "canvas" }),
      isComponentRoot && ctx.rootClassName,
      ...activeVSettings.map((vs) => classNameForRuleSet(vs.rs)),
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (isCodeComponent(node.component)) {
    ComponentImpl = meta
      ? meta.impl
      : getCodeComponentStub(node.component, ctx.sub.React);

    const ccClassNameProp =
      node.component.codeComponentMeta.classNameProp || "className";

    props[ccClassNameProp] = withoutNils([
      props[ccClassNameProp],
      isComponentRoot ? ctx.rootClassName : undefined,
      ...(isComponentRoot
        ? getComponentRootTagResetClassNames(ctx, false)
        : []),
      ...getRealClassNames(positionClassName),
    ]).join(" ");
    props[setControlContextDataProp] = ctx.viewCtx.createSetContextDataFn(
      ctx.valKey
    );

    if (isComponentRoot && isTplRootWithCodeComponentVariants(node)) {
      props["plasmicUpdateVariant"] = ctx.updateVariant;
    }

    if (meta) {
      for (const [prop, propMeta] of Object.entries(meta.meta.props)) {
        const isSlotProp =
          propMeta === "slot" ||
          (isPlainObjectPropType(propMeta) && propMeta.type === "slot");
        if (isSlotProp && props[prop] == null) {
          const param = node.component.params.find(
            (p) => p.variable.name === prop
          );
          if (param) {
            const selKey = slotSelectionKeyFromRenderingCtx(
              ensure(
                ctx.valKey,
                () => `valKey should exist for slot placeholders`
              ),
              param
            );
            if (
              !ctx.viewCtx.studioCtx.showSlotPlaceholder() ||
              // We don't show placeholder unless we're currently
              // editing the owner component
              !(ctx.ownerKey && isKeyInEditableStack(ctx, ctx.ownerKey)) ||
              // We don't render a placeholder if hidePlaceholder:true and
              // it is not the currently focused selectable or the user
              // has chosen to hide slot placeholders
              (isPlainObjectPropType(propMeta) &&
                propMeta.hidePlaceholder &&
                // We wrap this in computed() so we don't re-render the
                // TplComponent every time the focusedSelectable changes;
                // we re-render only if the key has changed to match or not
                // match selKey
                computed(
                  () =>
                    makeSelectableKey(ctx.viewCtx.focusedSelectable()) !==
                    selKey
                ).get())
            ) {
              continue;
            }
            const slotPlaceholder = ctx.sub.React.createElement(
              mkCanvasSlotPlaceholder(ctx.sub),
              {
                ctx,
                param,
                component: node.component,
                isPropOrSlot: "prop",
                slotSelectionKey: selKey,
              }
            );
            props[prop] = isRenderFuncType(param.type)
              ? () => slotPlaceholder
              : slotPlaceholder;
          }
        }
      }
      const isFetcherComponent =
        isBuiltinCodeComponent(node.component) &&
        node.component.name ===
          getBuiltinComponentRegistrations().PlasmicFetcher.meta.name;
      if (isFetcherComponent) {
        props["queries"] = ctx.env.$queries;
      }
    }
  } else {
    props[renderingCtxProp] = { ...ctx, rootClassName: positionClassName };
    ComponentImpl = createCanvasComponent(ctx.viewCtx, node.component);
  }
  props[valKeyProp] = ctx.valKey;
  props[classNameProp] = positionClassName;
  props[dataCanvasEnvsProp] = getEnvId(ctx);
  if (ctx.ownerKey) {
    props[valOwnerProp] = ctx.ownerKey;
  }
  if (isFrameRoot(ctx)) {
    props[frameUidProp] = ctx.viewCtx.arenaFrame().uid;
  }
  if (isCodeComponent(node.component) && meta) {
    const remountProps = Object.entries(meta.meta.props)
      .filter(
        ([_name, propType]) =>
          isPlainObjectPropType(propType) && (propType as any).forceRemount
      )
      .map(([name]) => props[name]);
    props["key"] =
      props["key"] ?? `${ctx.valKey}-${JSON.stringify(remountProps)}`;
  } else {
    props["key"] = props["key"] ?? ctx.valKey;
  }

  const dataReps = serializeDataRepsIndexName(node).map(
    (varName) => ctx.env[varName]
  );
  const builtinEventHandlers: Record<string, any[]> = {};
  ctx.ownerComponent?.states
    .filter((state) => state.tplNode === node)
    .forEach((state) => {
      assert(
        !!state.implicitState,
        `${getStateDisplayName(state)} should be an implicit state`
      );
      const tplVarName = toVarName(state.tplNode!.name ?? "undefined");
      const statePath = [
        tplVarName,
        ...dataReps,
        toVarName(getLastPartOfImplicitStateName(state)),
      ];
      const maybeOnChangePropName = getStateOnChangePropName(
        state.implicitState
      );
      const stateHelpers =
        isTplCodeComponent(node) && meta
          ? tryGetStateHelpers(
              meta.meta,
              ensureKnownNamedState(state.implicitState)
            )
          : undefined;
      if (maybeOnChangePropName) {
        const pushEventHandler = (handler: any) => {
          withDefaultFunc(
            builtinEventHandlers,
            maybeOnChangePropName,
            () => []
          ).push(handler);
        };
        if (node.component.plumeInfo) {
          const plugin = getPlumeCodegenPlugin(node.component);
          pushEventHandler((...args: unknown[]) => {
            ctx.sub.reactWeb.generateStateOnChangeProp(
              ctx.env.$state,
              statePath
            )(
              plugin?.genOnChangeEventToValue
                ? evalCodeWithEnv(
                    plugin.genOnChangeEventToValue,
                    mkEventHandlerEnvFromRenderingCtx(ctx),
                    ctx.viewCtx.canvasCtx.win()
                  ).apply(null, args)
                : args[0]
            );
          });
        } else if (
          isTplCodeComponent(node) &&
          stateHelpers?.onChangeArgsToValue
        ) {
          pushEventHandler((...eventArgs: any[]) => {
            ctx.sub.reactWeb.generateStateOnChangeProp(
              ctx.env.$state,
              statePath
            )(stateHelpers.onChangeArgsToValue?.apply(null, eventArgs));
          });
        } else {
          pushEventHandler(
            ctx.sub.reactWeb.generateStateOnChangeProp(
              ctx.env.$state,
              statePath
            )
          );
        }
      }
      if (isWritableState(state.implicitState)) {
        props[getStateValuePropName(state.implicitState)] =
          ctx.sub.reactWeb.generateStateValueProp(ctx.env.$state, statePath);
      }
    });
  if (ctx.ownerComponent) {
    mergeEventHandlers(
      props,
      builtinEventHandlers,
      getComponentStateOnChangePropNames(ctx.ownerComponent, node)
    );
  }

  ctx.ownerComponent?.states.forEach((state) => {
    if (state.tplNode !== node) {
      return;
    }
    const initFuncExpr = mkInitFuncExpr(
      state,
      Array.from(ctx.activeVariants),
      ctx.viewCtx,
      exprCtx,
      true
    );
    if (
      initFuncExpr &&
      (exprUsesCtxOrFreeVars(initFuncExpr) || dataReps.length > 0)
    ) {
      ctx.env.$state.registerInitFunc?.(
        getStateVarName(state),
        mkInitFuncFromExpr(initFuncExpr, ctx.viewCtx, ctx.env, exprCtx, true),
        dataReps
      );
    }
  });

  if (tplHasRef(node)) {
    const refProp = node.component.codeComponentMeta?.refProp ?? "ref";
    props[refProp] = (ref: any) =>
      (ctx.env.$refs[
        ensure(ctx.nodeNamer?.(node), `Only named tpls can have ref`)
      ] = ref);
  }

  if (
    meta &&
    ctx.ownerComponent &&
    shouldHaveImplicitState(ctx.ownerComponent, node)
  ) {
    const stateHelpers = meta.meta.componentHelpers?.helpers.states ?? {};

    // We loop by ctx.ownerComponent.states, instead of by meta.meta.states,
    // because for hostless components, if we add new states but haven't
    // upgraded yet, meta.meta.states will have states that are not yet in
    // ctx.ownerComponent.states.
    ctx.ownerComponent.states.map((state) => {
      if (state.tplNode === node && isKnownNamedState(state.implicitState)) {
        const stateName = state.implicitState.name;
        const stateHelper = stateHelpers[stateName];
        if (stateHelper && "initFunc" in stateHelper) {
          // first we search for initFunc in the helper
          ctx.env.$state.registerInitFunc?.(
            getStateVarName(state),
            ({ $props }) => stateHelper.initFunc?.($props),
            dataReps,
            { $props: props }
          );
        }
      }
    });
  }

  if (isCodeComponent(node.component) && ctx.projectFlags.autoOpen) {
    const codeComponentSelectionInfo = computedFn(
      () => {
        // Ensuring that the depencies are tracked
        const isInteractive = ctx.viewCtx.studioCtx.isInteractiveMode;
        const isAutoOpenMode = ctx.viewCtx.studioCtx.isAutoOpenMode;

        // The reason why we are using the focusedTplDeepAncestorPath is because
        // we can't rely on ValNodes or the dom to determine if a node is selected
        // or not. Since code components are able to conditonally render content
        // without our knowledge, even us being the ones that provide the content
        // for the slot, we can't be sure wether the content is attached to the
        // React tree. Our option is to rely on the model and based on the tpl nodes
        // stretch the focused elements to include all the tpls that we are able to find.
        //
        // The reason for streching the selection is because code components can
        // have the slot being proxied by a plasmic component, so we need to make sure
        // that the selection is also handled through it.
        const path = ctx.viewCtx.focusedTplAncestorsThroughComponents();
        const nodeIdx = path?.findIndex((s) => s === node) ?? -1;

        if (isInteractive || !isAutoOpenMode || !path || nodeIdx === -1) {
          return {
            id: node.uuid,
            isSelected: false,
            selectedSlotName: null,
          };
        }

        // We now need to know whether this node is really selected or not since
        // when dealing with proxied components the same node will be reused for
        // rendering, we will then look into all tpl node ancestors and if they
        // are present in the valKey
        const nodeAncestors = path.slice(nodeIdx);
        const isSelected = nodeAncestors.every((ancestor) => {
          return (
            isSlotSelection(ancestor) || ctx.valKey.includes(ancestor.uuid)
          );
        });

        const descendant = nodeIdx > 0 ? path[nodeIdx - 1] : null;

        return {
          id: node.uuid,
          isSelected,
          selectedSlotName:
            isSelected && isSlotSelection(descendant)
              ? descendant?.slotParam?.variable.name
              : null,
        };
      },
      {
        name: "canvasCodeComponentCtxValue",
        equals: comparer.structural,
      }
    )();

    props[INTERNAL_CC_CANVAS_SELECTION_PROP] = codeComponentSelectionInfo;
  }

  let elt = createPlasmicElementProxy(node, ctx, ComponentImpl, props);
  if (isTplTag(node.parent) && isCodeComponent(node.component)) {
    // When we're rendering a code component, we wrap it in an error boundary,
    // but only when it's a child of a TplTag. This is because code components
    // can be picky about the type of elements that are passed in as props
    // so we can't just wrap always wrap them. Even normal Plasmic TplComponent
    // may be picky since it may render a code component under the hood.  But
    // we know for sure that TplTags are not picky, so this is the easiest /
    // best we can do.
    elt = ctx.sub.React.createElement<CanvasErrorBoundaryProps>(
      mkCanvasErrorBoundary(ctx.sub.React, ctx.viewCtx),
      {
        ctx,
        nodeOrComponent: node,
        children: elt,
        nodeProps: props,
      }
    );
  }
  return elt;
}

function isFrameRoot(ctx: RenderingCtx) {
  return !ctx.valKey.includes(".");
}

function maybeUnwrapFragments(
  sub: SubDeps,
  child: React.ReactElement | undefined | null
) {
  if (
    child?.type === sub.React.Fragment &&
    (child.key || child.props.key)?.startsWith(repFragmentKey)
  ) {
    return child.props.children;
  }
  return child;
}

function computeRenderedArg(
  param: Param,
  tpls: TplNode[],
  ctx: RenderingCtx,
  envOverrides: Partial<CanvasEnv>
) {
  if (tpls.length === 0) {
    return null;
  }

  const elements = withoutNils(
    tpls
      .flatMap((child) => {
        const elt = renderTplNode(child, {
          ...ctx,
          env: {
            ...ctx.env,
            ...envOverrides,
          },
          wrappingEnv: {
            ...ctx.wrappingEnv,
            ...envOverrides,
          },
          valKey: ctx.valKey + "." + child.uuid,
        });
        // When passing args to code components, code components
        // can be picky about what they receive. Specifically, components
        // like react-slick will create slides based on each element in
        // the children array. If the `child` is a repeated element,
        // then `renderTplNode` will wrap the repeated elements in a
        // Fragment, which we now unwrap so that we pass in an array
        // of elements as expected by the code component.
        return maybeUnwrapFragments(ctx.sub, elt);
      })
      .map((v) => {
        if (!v) {
          return v;
        }
        let attrs: Record<string, string> = {
          [slotArgCompKeyProp]: ctx.valKey,
          [slotArgParamProp]: param.uuid,
        };
        if (v.type === ctx.sub.React.Fragment) {
          const existingKey = v.key || v.props.key;
          if (
            isString(existingKey) &&
            existingKey.startsWith(slotFragmentKey)
          ) {
            const existingAttrs = JSON.parse(
              existingKey.slice(slotFragmentKey.length)
            );
            attrs = { ...existingAttrs, ...attrs };
          }
          attrs = {
            key: `${slotFragmentKey}${JSON.stringify(attrs)}`,
          };
        }
        return ctx.sub.React.cloneElement(v, attrs);
      })
  );
  if (param.variable.name === "children") {
    return elements;
  }
  return elements.length === 0
    ? null
    : elements.length === 1
    ? elements[0]
    : ctx.sub.React.createElement(ctx.sub.React.Fragment, {}, elements);
}

function computeTplComponentArgs(
  tpl: TplComponent,
  effectiveVs: EffectiveVariantSetting,
  ctx: RenderingCtx
) {
  const ofCodeComponent = isCodeComponent(tpl.component);
  const exprCtx = {
    component: ctx.ownerComponent ?? null,
    projectFlags: ctx.projectFlags,
    inStudio: true,
  };

  const evalArgExpr = (
    param: DeepReadonly<Param>,
    expr: DeepReadonly<Expr>
  ) => {
    return switchType(expr)
      .when(RenderExpr, (_expr) => {
        if (_expr.tpl.length === 0) {
          return null;
        } else {
          const contents = (envOverrides: Partial<CanvasEnv>) => {
            if (isRenderFuncType(param.type)) {
              const paramType = param.type;
              return (...args: any[]) => {
                return ctx.sub.React.createElement(
                  mkCanvasObserver(ctx.sub, ctx.viewCtx),
                  {
                    children: () =>
                      ctx.sub.React.createElement(
                        ctx.sub.React.Fragment,
                        {},
                        computeRenderedArg(param, _expr.tpl, ctx, {
                          ...envOverrides,
                          ...zipObject(
                            paramType.params.map((p) => p.argName),
                            args
                          ),
                        })
                      ),
                  }
                );
              };
            } else {
              return computeRenderedArg(param, _expr.tpl, ctx, envOverrides);
            }
          };
          if (shouldWrapSlotContentInDataCtxReader(tpl.component, param)) {
            return wrapInDataCtxReader(
              ctx,
              ($newCtx) =>
                withErrorDisplayFallback(
                  ctx.sub.React,
                  ctx,
                  tpl,
                  () =>
                    ctx.sub.React.createElement(mkCanvasWrapper(ctx.sub), {
                      // Whenever we read the data ctx for a slot, we provide
                      // the updated canvas env to the React tree so we can use
                      // these values in the data picker in case the descendent
                      // nodes end up not being rendered.
                      [slotExtraCanvasEnvProp]:
                        ensureType<ExtraSlotCanvasEnvData>({
                          env: {
                            ...ctx.env,
                            $ctx: { ...$newCtx },
                          },
                          slotPropUuid: param.uuid,
                          tplComponentValKey: ctx.valKey,
                        }),
                      children: contents({ $ctx: $newCtx }),
                    }),
                  {
                    hasLoadingBoundary:
                      $newCtx?.[hasLoadingBoundaryKey] ||
                      ctx.env.$ctx?.[hasLoadingBoundaryKey],
                  }
                ),
              `DataCtxReaderChildren(${tpl.uuid}.${param.variable.name})`
            );
          }
          return contents({});
        }
      })
      .when(CustomCode, (_expr) => {
        return evalCodeWithEnv(
          getCodeExpressionWithFallback(_expr, exprCtx),
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        );
      })
      .when(DataSourceOpExpr, (_expr) => {
        // Remove currentUser from env so that it doesn't get passed to the operations for now
        const { currentUser: _, ...rest } = ctx.env;
        return evalCodeWithEnv(
          asCode(_expr, exprCtx).code,
          rest,
          ctx.viewCtx.canvasCtx.win()
        );
      })
      .when(VarRef, (_expr) => {
        const component = ensure(
          ctx.ownerComponent,
          () => `ownerComponent should exist as we're passing VarRef args`
        );
        const referencedParam = extractReferencedParam(component, _expr);
        if (!referencedParam) {
          return undefined;
        }
        return ctx.env.$props[canvasParamToVarName(component, referencedParam)];
      })
      .when(StyleTokenRef, (_expr) => {
        if (isKnownColorPropType(param.type) && param.type.noDeref) {
          return mkTokenRef(_expr.token);
        }
        const vsh = new VariantedStylesHelper(ctx.site, [
          ...ctx.activeVariants,
        ]);
        const resolver = makeTokenValueResolver(ctx.site);
        return resolver(_expr.token, vsh);
      })
      .when(PageHref, (_expr) =>
        evalCodeWithEnv(
          asCode(_expr, exprCtx).code,
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        )
      )
      .when(ImageAssetRef, (_expr) =>
        ofCodeComponent
          ? _expr.asset.dataUri
          : maybeMakePlasmicImgSrc(_expr.asset, exprCtx)
      )
      .when(VariantsRef, (_expr) =>
        _expr.variants.map((v) => toVarName(v.name))
      )
      .when(ObjectPath, (_expr) =>
        evalCodeWithEnv(
          getCodeExpressionWithFallback(_expr, exprCtx),
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        )
      )
      .when(EventHandler, (_expr) => {
        return evalCodeWithEnv(
          getRawCode(expr, exprCtx),
          mkEventHandlerEnvFromRenderingCtx(ctx),
          ctx.viewCtx.canvasCtx.win()
        );
      })
      .when(FunctionArg, (functionArg) => evalArgExpr(param, functionArg.expr))
      .when(CollectionExpr, (collectionExpr) => [
        ...collectionExpr.exprs.map((_expr) =>
          _expr ? evalArgExpr(param, _expr) : undefined
        ),
      ])
      .when(MapExpr, (_expr) =>
        Object.fromEntries(
          Object.entries(_expr.mapExpr).map(([name, iexpr]) => [
            name,
            evalCodeWithEnv(
              getRawCode(iexpr, exprCtx),
              ctx.env,
              ctx.viewCtx.canvasCtx.win()
            ),
          ])
        )
      )
      .when(StyleExpr, (_expr) => {
        // For a ClassNamePropType (with StyleExpr value), we actually don't
        // want to just use the styles for this specific _expr. Instead,
        // we want to include all the "active" StyleExprs across different
        // VariantSettings. So if there are overrides on base variant, and
        // color=blue variant, we want this to evaluate to
        // `pcls_base pcls_type_blue`, and not just `pcls_type_blue` (which
        // is what `_expr` corresponds to). So we actually ignore `_expr`,
        // and we look at what the all the active variant settings, and
        // string together all the active StyleExpr class names.
        const classes: string[] = [];
        for (const vs of effectiveVs.variantSettings) {
          const arg2 = vs.args.find((arg) => arg.param === param);
          if (arg2 && isKnownStyleExpr(arg2.expr)) {
            classes.push(makeStyleExprClassName(arg2.expr));
          }
        }
        return classes.join(" ");
      })
      .when(TemplatedString, (templatedString) =>
        evalCodeWithEnv(
          getRawCode(templatedString, exprCtx),
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        )
      )
      .when(FunctionExpr, (functionExpr) =>
        evalCodeWithEnv(
          asCode(functionExpr, exprCtx).code,
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        )
      )
      .when(TplRef, (_expr) =>
        unexpected(`Cannot evaluate TplRef as a component arg`)
      )
      .when(QueryInvalidationExpr, (_expr) =>
        unexpected(`Cannot evaluate QueryInvalidationExpr as component arg`)
      )
      .when(CompositeExpr, (_expr) =>
        evalCodeWithEnv(
          asCode(_expr, exprCtx).code,
          mkEventHandlerEnvFromRenderingCtx(ctx),
          ctx.viewCtx.canvasCtx.win()
        )
      )
      .result();
  };

  const args: Record<string, any> = {};

  const addToEnv = (param: DeepReadonly<Param>, val: any) => {
    // The following check for param.variable.name may seem unnecessary, but
    // it is required to force mobx to re-compute this when a variable name
    // changes; see https://app.shortcut.com/plasmic/story/25230/
    if (!param.variable.name) {
      return;
    }
    args[canvasParamToVarName(tpl.component, param)] = val;
  };

  for (const arg of effectiveVs.args) {
    // Do not add event handlers if studio is not in interactive mode.
    if (
      !ctx.viewCtx.studioCtx.isInteractiveMode &&
      isKnownEventHandler(arg.expr)
    ) {
      continue;
    }
    addToEnv(arg.param, evalArgExpr(arg.param, arg.expr));
  }

  if (ctx.viewCtx.studioCtx.isInteractiveMode) {
    // Add event handler props to env.
    for (const [name, expr] of Object.entries(effectiveVs.attrs)) {
      const tempParam = mkParam({
        name,
        type: typeFactory.any(),
        paramType: "prop",
      });
      addToEnv(tempParam, evalArgExpr(tempParam, expr));
    }
  }

  let rootDefaults: Record<string, any> | undefined = undefined;
  if (tpl === ctx.viewCtx.componentArgsContainer()) {
    // This is the root TplComponent!
    const plugin = getPlumeEditorPlugin(tpl.component);
    if (plugin?.getArtboardRootDefaultProps) {
      rootDefaults = plugin.getArtboardRootDefaultProps(tpl.component);
    }
  }

  const isInCurrentComponentStack = computed(
    () => {
      const currentComponentSet = new Set(
        ctx.viewCtx.componentStackFrames().map((f) => f.tplComponent)
      );
      return currentComponentSet.has(tpl);
    },
    { name: "computeTplComponentArgs.isInCurrentComponentStack" }
  ).get();

  const ccMeta = maybeGetCodeComponentMeta(ctx.viewCtx, tpl.component);

  for (const param of tpl.component.params) {
    const maybePropMeta = ccMeta?.meta.props[param.variable.name];

    if (
      ctx.viewCtx.component === tpl.component &&
      tpl.component.variantGroups.find((vg) => vg.param === param)
    ) {
      // Do not set variants, because they are managed inside the component
      // using pin manager and $state.
      continue;
    } else if (
      ctx.viewCtx.studioCtx.isInteractiveMode &&
      maybePropMeta &&
      isPlainObjectPropType(maybePropMeta) &&
      (maybePropMeta as any).editOnly
    ) {
      // Do not pass editOnly props on interactive mode.
      continue;
    } else if (
      param.previewExpr &&
      // We don't do this initialization for state params, as their initial
      // values are initialized in `$state`.  A state prop's initial expr
      // may not make sense in this context; for example, a state's initial
      // value may reference other `$state.value` or `$queries.something`,
      // and we take special care when initializing `$state` and `$queries`
      // to take that into account, but we don't do that here.
      !isKnownStateParam(param) &&
      isInCurrentComponentStack &&
      !(canvasParamToVarName(tpl.component, param) in args)
    ) {
      addToEnv(param, evalArgExpr(param, param.previewExpr));
    } else if (
      param.defaultExpr &&
      !isKnownStateParam(param) &&
      !(canvasParamToVarName(tpl.component, param) in args)
    ) {
      addToEnv(param, evalArgExpr(param, param.defaultExpr));
    } else if (isKnownStyleScopeClassNamePropType(param.type)) {
      addToEnv(
        param,
        makeStyleScopeClassName(
          tpl,
          makeCanvasRuleNamers(tpl.component).nonInteractive,
          param.type.scopeName
        )
      );
    } else if (isKnownDefaultStylesClassNamePropType(param.type)) {
      addToEnv(
        param,
        getComponentRootTagResetClassNames(
          ctx,
          param.type.includeTagStyles
        ).join(" ")
      );
    } else if (isKnownDefaultStylesPropType(param.type)) {
      addToEnv(
        param,
        makeDefaultStyleValuesDict(ctx.site, Array.from(ctx.activeVariants))
      );
    } else if (
      rootDefaults &&
      param.variable.name in rootDefaults &&
      !(canvasParamToVarName(tpl.component, param) in args)
    ) {
      addToEnv(param, rootDefaults[param.variable.name]);
    }
  }

  return args;
}

function getComponentRootTagResetClassNames(
  ctx: RenderingCtx,
  includeTagStyles: boolean
) {
  const component = ensure(
    ctx.ownerComponent,
    "isComponentRoot means it must have an owning component"
  );
  const rootResetClass = makeRootResetClassName(
    `${getOwnerSite(component).uid}`,
    { targetEnv: "canvas", useCssModules: false }
  );
  return withoutNils([
    "plasmic-tokens",
    rootResetClass,
    includeTagStyles ? `${rootResetClass}_tags` : undefined,
    `${makeCssClassNameForVariantCombo(
      Array.from(ctx.activeVariants).filter(
        (v) => isGlobalVariant(v) && !isScreenVariant(v) && !isBaseVariant(v)
      ),
      {
        targetEnv: "canvas",
        prefix: "__wab_",
      }
    )}`,
  ]);
}

function canvasParamToVarName(
  component: Component,
  param: DeepReadonly<Param>
) {
  return paramToVarName(component, param, { useControlledProp: true });
}

function mergeEventHandlers(
  userAttrs: Record<string, any>,
  builtinEventHandlers: Record<string, any[]>,
  onChangeAttrs: Set<JsIdentifier> = new Set()
) {
  const chained = (
    attr: string,
    attrBuiltinEventHandlers: any[],
    userAttr: any[]
  ) => {
    return async (...args: unknown[]) => {
      for (const handler of attrBuiltinEventHandlers) {
        await handler.apply(null, args);
      }

      // Check if we should skip user attr handlers because of state initialization trigger
      if (
        onChangeAttrs.has(toJsIdentifier(attr)) &&
        args.length > 1 &&
        args[1]
      ) {
        return;
      }

      for (const handler of userAttr) {
        await handler.apply(null, args);
      }
    };
  };
  Object.keys(builtinEventHandlers).forEach((key) => {
    userAttrs[key] = chained(
      toJsIdentifier(key),
      withoutNils(builtinEventHandlers[key]),
      withoutNils([userAttrs[key]])
    );
  });
}

function renderTplTag(
  node: TplTag,
  ctx: RenderingCtx,
  activeVSettingsWithoutDisabled: VariantSetting[]
): React.ReactElement | null {
  const effectiveVsWithoutDisabled = new EffectiveVariantSetting(
    node,
    activeVSettingsWithoutDisabled,
    ctx.site
  );
  const { activeVSettings, evaledAttrs, effectiveVs, isComponentRoot } =
    computeActiveVariantsForMaybeDisabledTag(
      node,
      ctx,
      activeVSettingsWithoutDisabled,
      effectiveVsWithoutDisabled
    );

  const dataCondExpr = getCondExpr(activeVSettings, ctx);
  const dataCond =
    dataCondExpr == null
      ? true
      : evalCodeWithEnv(
          getCodeExpressionWithFallback(dataCondExpr, {
            component: ctx.ownerComponent ?? null,
            projectFlags: ctx.projectFlags,
            inStudio: true,
          }),
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        );
  if (!dataCond) {
    return null;
  }

  const variantRuleSetClasses = activeVSettings.map((vs) =>
    classNameForRuleSet(vs.rs)
  );
  // classNames for variant settings where all variants either evaluate to true,
  // or is a private pseudo selector.  That's because we should always include
  // the classes targeting pseudo elements, like ::placeholder.
  const pseudoVariantClasses = getActivePseudoElementVariantClasses(
    isComponentRoot,
    node,
    ctx
  );
  const isPlaceholder =
    (node.tag === "img" && !evaledAttrs["src"]) ||
    (node.tag === "svg" && !evaledAttrs["outerHTML"]);

  let tag: string | React.ElementType = node.tag;
  if (isPlaceholder) {
    delete evaledAttrs["outerHTML"];
    evaledAttrs["src"] = placeholderImgUrl(node.tag === "svg");
    tag = "img";
  } else if (node.tag === "img" && ctx.projectFlags.usePlasmicImg) {
    tag = ctx.sub.reactWeb.PlasmicImg;
  } else if (node.tag === "svg") {
    tag = mkCanvasIcon(ctx.sub.React);
    evaledAttrs.placeholderUrl = placeholderImgUrl(true);
  }
  const classes = uniqifyClassName(
    [
      ...defaultStyleClassNames(
        studioDefaultStylesClassNameBase,
        tag === ctx.sub.reactWeb.PlasmicImg ? "PlasmicImg" : node.tag
      ),
      ...variantRuleSetClasses,
      ...pseudoVariantClasses,
      isComponentRoot ? ctx.rootClassName : undefined,
      isComponentRoot && "__wab_val_root",
      ...(isComponentRoot
        ? getComponentRootTagResetClassNames(ctx, false)
        : []),
      "__wab_tag",
      ctx.inline && "__wab_inline",
      effectiveVs.rsh().get("display") === "grid" && "__wab_grid",
      isTplImage(node) &&
        (node.tag === "img" ? "__wab_img_instance" : "__wab_svg"),
    ]
      .filter(Boolean)
      .join(" ")
  );
  const attrs = {
    ...evaledAttrs,
    onAuxClick: (e: MouseEvent) => {
      if (tag === "a") {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    className: cx(classes, evaledAttrs["className"]),
    ...(ctx.slate && !isTplImage(node)
      ? {
          children: ctx.sub.React.createElement(
            mkSlateChildren(ctx.sub.React),
            {
              node,
              inline: !!ctx.inline,
              slate: ctx.slate,
              effectiveVs,
              ctx,
            }
          ),
        }
      : !isTplImage(node) && !isTplTextBlock(node)
      ? { children: deriveTplTagChildren(node, ctx, effectiveVs, evaledAttrs) }
      : {}),
    ...(ctx.slate
      ? { ...ctx.slate.attributes, "data-nonselectable": true }
      : {}),
  };

  if (tag === ctx.sub.reactWeb.PlasmicImg) {
    plasmicImgAttrStyles.forEach((prop) => {
      const reactProp = toReactAttr(`display-${prop}`);
      if (!(reactProp in attrs)) {
        const val = effectiveVs.rsh().getRaw(prop);
        if (val) {
          attrs[reactProp] = deriveSizeStyleValue(prop as any, val);
        }
      }
    });
    attrs["loader"] = "plasmic";
  }
  const state = ctx.ownerComponent?.states.find(
    (istate) => istate.tplNode === node
  );
  if (state) {
    assert(state.tplNode?.name, "a stateful tag should have a named tplNode");
    const dataReps = ancestorsUp(node)
      .filter(isTplRepeated)
      .map(
        (parentNode) =>
          ctx.env[getRepetitionIndexName(parentNode.vsettings[0].dataRep!)]
      )
      .reverse();

    const tplVarName = toVarName(state.tplNode.name);
    const stateVarName = toVarName(getLastPartOfImplicitStateName(state));
    const statePath = [tplVarName, ...dataReps, stateVarName];
    attrs["value"] = ctx.sub.reactWeb.generateStateValueProp(
      ctx.env.$state,
      statePath
    );
    const builtinEventHandlers: Record<string, any> = {
      onChange: [
        (e: React.ChangeEvent<HTMLInputElement>) =>
          ctx.sub.reactWeb.generateStateOnChangeProp(
            ctx.env.$state,
            statePath
          )(e.target.value),
      ],
    };
    mergeEventHandlers(attrs, builtinEventHandlers);
  }
  adjustFinalAttrs(attrs, node, activeVSettings);

  attrs[valKeyProp] = ctx.valKey;
  attrs[classNameProp] = classes;
  attrs[dataCanvasEnvsProp] = getEnvId(ctx);
  if (ctx.ownerKey) {
    attrs[valOwnerProp] = ctx.ownerKey;
  }
  attrs["key"] = attrs["key"] ?? ctx.valKey;

  if (tplHasRef(node)) {
    attrs["ref"] = (ref: any) =>
      (ctx.env.$refs[ensure(node.name, `Only named tpls can have ref`)] = ref);
  }

  if (isTplTextBlock(node)) {
    return ctx.sub.React.createElement(mkRichText(ctx.sub.React), {
      ctx,
      node,
      effectiveVs,
      attrs,
      tag,
    });
  }

  return createPlasmicElementProxy(node, ctx, tag, attrs);
}

/**
 * Computes active variant settings and other related results for
 * a tag.  The main complication here is that if a tag is disabled,
 * we need to enable the corresponding :disabled variant settings.
 */
function computeActiveVariantsForMaybeDisabledTag(
  node: TplTag,
  ctx: RenderingCtx,
  activeVSettings: VariantSetting[],
  effectiveVs: EffectiveVariantSetting
) {
  const evaledAttrs = Object.fromEntries(
    Object.entries(effectiveVs.attrs).map(([attr, expr]) =>
      tuple(
        attr,
        !ctx.viewCtx.studioCtx.isInteractiveMode && isKnownEventHandler(expr)
          ? null
          : evalCodeWithEnv(
              evalTagAttrExprToString(node, attr, expr, ctx),
              mkEventHandlerEnvFromRenderingCtx(ctx),
              ctx.viewCtx.canvasCtx.win()
            )
      )
    )
  );

  if (node.tag === "input") {
    evaledAttrs["autoComplete"] = "new-password";
  }

  const disabled = evaledAttrs["disabled"] === true;
  const component = ensure(
    ctx.ownerComponent,
    () => `TplTag should have have owner component`
  );
  const isComponentRoot = component.tplTree === node;

  if (disabled) {
    // This element is disabled! We need to activate the variant settings
    // targeting :disabled.  Note that this is the only style selector we have
    // that depends on an attr; all other pseudoselectors correspond to actual
    // interactions (like :hover, etc) and so don't need to be special-cased
    // in this way.

    // First, we check for active VariantSettings for this element that
    // has a :disabled selector
    const activeDisabledVSettings = node.vsettings.filter((vs) => {
      if (activeVSettings.includes(vs)) {
        // Already activated (via pinning), so no need to add
        return false;
      }
      const disabledVariants = vs.variants.filter((v) =>
        isDisabledPseudoSelectorVariantForTpl(v, isComponentRoot)
      );
      if (
        disabledVariants.length > 0 &&
        without(vs.variants, ...disabledVariants).every(
          (v) => isBaseVariant(v) || ctx.activeVariants.has(v)
        )
      ) {
        return true;
      }
      return false;
    });
    if (activeDisabledVSettings.length > 0) {
      // Found some, so update the list of activeVSettings and the effectiveVs
      // We don't need to recomptue evaledAttrs because attrs cannot be targeted
      // from private variants.
      activeVSettings = sortedVariantSettings(
        [...activeVSettings, ...activeDisabledVSettings],
        makeVariantComboSorter(ctx.site, component)
      );
      effectiveVs = new EffectiveVariantSetting(
        node,
        activeVSettings,
        ctx.site
      );
    }
    if (isComponentRoot) {
      // If this is a component root, we'll also want to activate the component-level
      // :disabled variants, so that children elements can render accordingly.  Note that
      // this is also the only time where we are modifying the `ctx.activeVariants`
      // while evaluating a TplTag!
      const activeDisabledCompVariants = allComponentVariants(component).filter(
        (v) =>
          (isDisabledPseudoSelectorVariantForTpl(v, true) &&
            isBaseVariant(v)) ||
          ctx.activeVariants.has(v)
      );
      if (activeDisabledCompVariants.length > 0) {
        ctx.activeVariants = new Set([
          ...ctx.activeVariants,
          ...activeDisabledCompVariants,
        ]);
      }
    }
  }

  return {
    activeVSettings,
    effectiveVs,
    evaledAttrs,
    ctx,
    isComponentRoot,
  };
}

/**
 * Evaluates attribute expression to a string
 */
function evalTagAttrExprToString(
  tpl: TplTag,
  attr: string,
  expr: Expr,
  ctx: RenderingCtx
): string {
  const exprCtx = {
    component: ctx.ownerComponent ?? null,
    projectFlags: ctx.projectFlags,
    inStudio: true,
  };

  return switchType(expr)
    .when(CustomCode, (customCode: CustomCode) => {
      if (isRealCodeExpr(customCode)) {
        return getCodeExpressionWithFallback(customCode, exprCtx);
      }
      return customCode.code;
    })
    .when(VarRef, (varRef: VarRef) => {
      return `$props.${toVarName(varRef.variable.name)}`;
    })
    .when(ImageAssetRef, (imageAssetRef: ImageAssetRef) => {
      const dataUri = imageAssetRef.asset.dataUri;
      if (isTplIcon(tpl) && attr === "outerHTML" && dataUri) {
        return JSON.stringify(parseDataUrlToSvgXml(dataUri));
      }
      return JSON.stringify(
        maybeMakePlasmicImgSrc(imageAssetRef.asset, exprCtx)
      );
    })
    .when(PageHref, (pageHref: PageHref) => {
      return asCode(pageHref, exprCtx).code;
    })
    .when(ObjectPath, (objectPath: ObjectPath) => {
      return getCodeExpressionWithFallback(objectPath, exprCtx);
    })
    .when(EventHandler, (eventHandler: EventHandler) => {
      return getRawCode(eventHandler, exprCtx);
    })
    .when(TemplatedString, (templatedString: TemplatedString) => {
      return asCode(templatedString, exprCtx).code;
    })
    .when(
      [
        DataSourceOpExpr,
        VariantsRef,
        FunctionArg,
        StrongFunctionArg,
        CollectionExpr,
        MapExpr,
        RenderExpr,
        VirtualRenderExpr,
        StyleExpr,
        StyleTokenRef,
        FunctionExpr,
        TplRef,
        QueryInvalidationExpr,
        CompositeExpr,
      ],
      (_) => {
        assert(false, "Unexpected expr type");
      }
    )
    .result();
}

function getActivePseudoElementVariantClasses(
  isComponentRoot: boolean,
  tpl: TplNode,
  ctx: RenderingCtx
) {
  const settings = tpl.vsettings.filter((vs) => {
    if (
      vs.variants.some((v) => isPseudoElementVariantForTpl(v, isComponentRoot))
    ) {
      return vs.variants.every(
        (v) =>
          isBaseVariant(v) ||
          ctx.activeVariants.has(v) ||
          isPseudoElementVariantForTpl(v, isComponentRoot)
      );
    }
    return false;
  });
  return settings.map((vs) => classNameForRuleSet(vs.rs));
}

function adjustFinalAttrs(
  finalAttrs: any,
  tpl: TplTag,
  activeVariantSettings: VariantSetting[]
) {
  if (tpl.tag === "input" || tpl.tag === "textarea") {
    // When rendering input, we always set "value", so that we are always
    // a "controlled" input, even when there's no value attr actually set on the
    // TplNode.  That's because if we switch between setting and not setting
    // the "value" attr, we are switching between "controlled" and "uncontrolled",
    // and the behavior there is undefined.  Specifically, if we set a "value",
    // and then unset it, we will see that the DOM input element will still have
    // that value set.
    finalAttrs["value"] =
      finalAttrs["value"] || finalAttrs["defaultValue"] || "";

    if (
      activeVariantSettings.some((vs) =>
        vs.variants.some((v) =>
          variantHasPrivatePseudoElementSelector(v, "::placeholder")
        )
      )
    ) {
      // If we are explicitly targeting the
      // ::placeholder variant, then temporarily blank out the `value`
      // attribute so that the browser is indeed showing the ::placeholder
      // styles.
      finalAttrs["value"] = "";
    }
  }

  // Don't actually render element in disabled state since disabled
  // element won't trigger mouse events.
  if (finalAttrs["disabled"]) {
    delete finalAttrs["disabled"];
  }
}

function getCondExpr(
  activeVSettings: VariantSetting[],
  _ctx: RenderingCtx
): CustomCode | ObjectPath | null {
  const condExpr = last(
    activeVSettings.map((vs) => vs.dataCond).filter(Boolean)
  );
  if (condExpr) {
    assert(
      isKnownCustomCode(condExpr) || isKnownObjectPath(condExpr),
      "Unknown dataCond type. Only CustomCode or ObjectPath available in dataCond"
    );
    return condExpr;
  }
  return null;
}

function deriveTplTagChildren(
  node: TplTag,
  ctx: RenderingCtx,
  effectiveVs: EffectiveVariantSetting,
  evaledAttrs: Record<string, any>
): React.ReactNode {
  const r = ctx.sub.React.createElement;
  if (node.tag === "select") {
    return [...node.children].map((child) => {
      assert(
        isTplTag(child),
        "Select is expected to have only TplTag children"
      );
      const childEffectiveVs = new EffectiveVariantSetting(
        child,
        getSortedActiveVariantSettings(child, ctx),
        ctx.site
      );
      return r(
        "option",
        {
          value: evalCodeWithEnv(
            evalTagAttrExprToString(
              node,
              "value",
              childEffectiveVs.attrs.value,
              ctx
            ),
            ctx.env,
            ctx.viewCtx.canvasCtx.win()
          ),
        },
        ...(isRawText(childEffectiveVs.text)
          ? [childEffectiveVs.text.text]
          : [])
      );
    });
  } else if (evaledAttrs.children) {
    return evaledAttrs.children;
  } else if (node.children.length > 0) {
    if (hasGapStyle(node)) {
      // This is a flex container with column/row gaps specified! We need to
      // create a few wrappers to polyfill column/row gaps, so that it looks
      // like  div.this-node div.__wab_flex-container
      // div.__wab_flex-item.child1 div.child1 div.__wab_flex-item.child2
      // div.child2  We put the child1/child2 classes on the __wab_flex-item
      // elements so that the item wrapper contains the positioning styles from
      // the child (width/height/flex-grow/etc.)  Other styles that we don't
      // want to put on the item wrapper (background, border, etc) are blanked
      // out in the definition for __wab_flex-item.  Similarly, the definition
      // for __wab_flex-item blanks out the styles that it is taking over from
      // the actual child element. See
      // https://paper.dropbox.com/doc/Fake-Flex-Gap-Design-Doc--At09n0msC1b~sPjVPx~72YohAg-8s3S2rQWctLAHLUs8KE1Z for more details.
      return r(
        "div",
        { className: makeWabFlexContainerClassName({ targetEnv: "canvas" }) },
        ...node.children.flatMap((child) =>
          renderTplNode(child, {
            ...ctx,
            valKey: ctx.valKey + "." + child.uuid,
          })
        )
      );
    } else {
      const children = node.children.flatMap((child) =>
        renderTplNode(child, {
          ...ctx,
          valKey: ctx.valKey + "." + child.uuid,
        })
      );
      if (children.length === 1) {
        return children[0];
      }
      return children;
    }
  } else if (canAddChildren(node)) {
    const suppressPlaceholder = supressContainerPlaceholder(
      node,
      ctx,
      effectiveVs
    );
    if (!suppressPlaceholder) {
      return r(mkEmptyContainerPlaceholder(ctx.sub), {
        summary: summarizeTpl(node, effectiveVs.rsh()),
        node: node,
        onAutoResized: () => {
          // This can be very expensive as you go in and out of spotlight
          // mode, as all the empty containers will end up calling this and
          // triggering a ton of re-rendering of the Studio UI. At a glance,
          // removing this call messes up the spotlight shading a bit
          // (when a container suddenly becomes empty, the spotlight is
          // off), but that gets fixed upon the next action. The hoverbox
          // etc all seems fine.  Anyway, may be worth turning off
          // and observing for now.
          // ctx.viewCtx.studioCtx.styleChanged.dispatch()
        },
        effectiveVs,
        ctx,
      });
    }
  }
  return null;
}

function supressContainerPlaceholder(
  node: TplTag,
  ctx: RenderingCtx,
  effectiveVs: EffectiveVariantSetting
) {
  if (!ctx.viewCtx.studioCtx.showContainerPlaceholder()) {
    return true;
  }
  if (!(ctx.ownerKey && isKeyInEditableStack(ctx, ctx.ownerKey))) {
    return true;
  }
  if (effectiveVs.rsh().get("display") === "grid") {
    return true;
  }
  return false;
}

interface EmptyContainerPlaceholderProps {
  summary: string;
  ctx: RenderingCtx;
  node: TplTag;
  onAutoResized: () => void;
  effectiveVs: EffectiveVariantSetting;
}

const mkEmptyContainerPlaceholder = computedFn(
  (sub: SubDeps) =>
    function EmptyContainerPlaceholder({
      node,
      onAutoResized,
      summary,
      ctx,
      effectiveVs,
    }: EmptyContainerPlaceholderProps) {
      return mkUseCanvasObserver(ctx.sub, ctx.viewCtx)(
        () =>
          withErrorDisplayFallback(
            ctx.sub.React,
            ctx,
            node,
            () => {
              const domRef = sub.React.useRef<HTMLDivElement>();

              sub.React.useEffect(() => {
                if (!domRef.current) {
                  return;
                }

                const placeholderElt = domRef.current;
                const doResize = () => {
                  const resized = resizePlaceholder(placeholderElt, {
                    forceAutoHeight: isTplColumn(node) || isGridChild(node),
                    isContainerSized: isExplicitlySized(effectiveVs),
                  });
                  if (resized && onAutoResized) {
                    onAutoResized();
                  }
                };

                doResize();

                const elt = domRef.current;
                const containerElt = elt.parentElement as HTMLElement;

                const observer = new sub.ResizeObserver(() => {
                  doResize();
                });

                observer.observe(containerElt);
                return () => {
                  observer.unobserve(containerElt);
                  observer.disconnect();
                };
              }, [onAutoResized, effectiveVs, node]);

              const r = sub.React.createElement;

              // We always use a unique key, because we always want to reset / re-render the DOM
              // elements to determine the right size for the placeholder
              return r(
                "div",
                { className: "__wab_placeholder", ref: domRef },
                r("div", { className: "__wab_placeholder__inner" }),
                r("div", { className: "__wab_placeholder__tag" }, summary),
                r(
                  "div",
                  { className: "__wab_placeholder_border" },
                  r("div", { className: "__wab_placeholder_border_inner" })
                )
              );
            },
            {
              hasLoadingBoundary: ctx.env.$ctx[hasLoadingBoundaryKey],
            }
          ),
        `mkEmptyContainerPlaceholder(${node.uuid})`
      );
    },
  {
    keepAlive: true,
  }
);

interface CanvasIconProps extends React.ComponentProps<"svg"> {
  outerHTML: string;
  placeholderUrl: string;
}

const mkCanvasIcon = computedFn(
  (react: typeof React) =>
    function CanvasIcon(props: CanvasIconProps) {
      const { outerHTML, className, placeholderUrl, ...restProps } = props;
      if (outerHTML) {
        return react.createElement("div", {
          className: `${className} svg-icon-wrapper`,
          dangerouslySetInnerHTML: { __html: outerHTML },
          ...restProps,
        });
      } else {
        return react.createElement("img", {
          className,
          src: placeholderUrl,
          ...restProps,
        });
      }
    },
  {
    keepAlive: true,
  }
);

const mkRepeatedElement = computedFn(
  (react: typeof React) => genRepeatedElement(react),
  {
    keepAlive: true,
    name: "mkRepeatedElement",
  }
);

interface RichTextProps {
  ctx: RenderingCtx;
  node: TplTextTag;
  attrs: Record<string, any>;
  effectiveVs: EffectiveVariantSetting;
  tag: string | React.ElementType;
}

const mkRichText = computedFn(
  (react: typeof React) =>
    react.forwardRef(function RichText(
      { ctx, node, attrs, tag, effectiveVs, ...rest }: RichTextProps,
      ref
    ) {
      return mkUseCanvasObserver(ctx.sub, ctx.viewCtx)(
        () =>
          withErrorDisplayFallback(
            ctx.sub.React,
            ctx,
            node,
            () => {
              const eltRef = react.useRef<HTMLElement | null>(null);

              const [isEditing, setEditing] = react.useState(() => false);

              // Use a computed() here so we don't re-render when the valRoot is set
              const isTextEditable = computed(() => isEditable(node, ctx), {
                name: `isRichTextEditable`,
              }).get();

              const richTextHandle = {
                enterEdit: () => {
                  if (eltRef.current) {
                    if (
                      getComputedStyle(eltRef.current).visibility === "hidden"
                    ) {
                      return "Cannot edit the text on canvas because it is hidden. Please edit it on the right side bar.";
                    }
                    setEditing(true);
                    return undefined;
                  }
                  return "Cannot edit the text on canvas because Plasmic is not ready";
                },
                exitEdit: () => {
                  setEditing(false);
                },
              };

              const subOnChange = react.useCallback(
                (text: string, markers: Marker[]) => {
                  const textCtx = ctx.viewCtx.editingTextContext();
                  if (textCtx) {
                    textCtx.draftText = new RawTextLike(text, markers);
                  }
                },
                [ctx.viewCtx]
              );

              const subOnUpdateContext = react.useCallback(
                (partialCtx: Partial<EditingTextContext>) => {
                  const textCtx = ctx.viewCtx.editingTextContext();
                  if (textCtx) {
                    Object.assign(textCtx, partialCtx);
                  }
                },
                [ctx.viewCtx]
              );

              return ctx.sub.React.createElement(
                mkCanvasErrorBoundary(ctx.sub.React, ctx.viewCtx),
                {
                  ctx: ctx,
                  nodeOrComponent: node,
                  children: createPlasmicElementProxy(node, ctx, tag, {
                    ...attrs,
                    className: cx(attrs.className, [
                      ...(isTextEditable
                        ? [
                            makeWabTextClassName({ targetEnv: "canvas" }),
                            "__wab_editor",
                          ]
                        : []),
                      isExprText(effectiveVs.text) &&
                        effectiveVs.text.html &&
                        makeWabHtmlTextClassName({ targetEnv: "canvas" }),
                      isEditing && "__wab_editing",
                    ]),
                    [richTextProp]: {
                      text: effectiveVs.text,
                      handle: richTextHandle,
                    },
                    // This element may have been cloned to append data-plasmic-* props
                    // (data-plasmic-index for dataRep, and data-plasmic-slot-* as slot args)
                    // or arbitrary non-data-plasmic-* props from code components.
                    // Since this RichText component is a renderless component, we pass on
                    // those props to the actual element we are rendering, so they can be
                    // read by globalHook
                    ...rest,
                    ref: (el: any) => {
                      eltRef.current = el;
                      if (typeof ref === "function") {
                        ref(el);
                      } else if (ref != null) {
                        ref.current = el;
                      }
                    },
                    children:
                      attrs.children ??
                      react.createElement(mkCanvasText(react), {
                        node,
                        readOnly: !isEditing,
                        onChange: subOnChange,
                        onUpdateContext: subOnUpdateContext,
                        inline: !!ctx.inline,
                        ctx,
                        effectiveVs,
                        key: String(!isEditing),
                      }),
                  }),
                }
              );
            },
            {
              hasLoadingBoundary: ctx.env.$ctx[hasLoadingBoundaryKey],
            }
          ),
        `mkRichText(${node.uuid})`
      );
    }),
  {
    keepAlive: true,
  }
);

function isEditable(node: TplNode, ctx: RenderingCtx) {
  if (!ctx.viewCtx.studioCtx.isDevMode) {
    return false;
  }

  if (ctx.ownerKey == null || ctx.viewCtx.valComponentStack().length === 0) {
    return true;
  }

  return ctx.ownerKey === last(ctx.viewCtx.valComponentStack())?.key;
}

function renderTplSlot(
  node: TplSlot,
  ctx: RenderingCtx,
  activeVSettings: VariantSetting[]
): React.ReactElement | null {
  const dataCondExpr = getCondExpr(activeVSettings, ctx);
  const dataCond =
    dataCondExpr == null
      ? true
      : evalCodeWithEnv(
          getCodeExpressionWithFallback(dataCondExpr, {
            component: ctx.ownerComponent ?? null,
            projectFlags: ctx.projectFlags,
            inStudio: true,
          }),
          ctx.env,
          ctx.viewCtx.canvasCtx.win()
        );

  if (!dataCond) {
    return null;
  }

  const varName = toVarName(node.param.variable.name);

  let contents: React.ReactNode[] | undefined;
  if (
    ctx.forceValComponentKeysWithDefaultSlotContents?.has(ctx.ownerKey!) ||
    ctx.env.$props[varName] === undefined
  ) {
    // Render default contents if we are forced to do so, or if there's nothing
    // passed in for the corresponding arg.
    // When the default contents, clear out component specific values to avoid
    // user confusion.
    if (node.defaultContents.length > 0) {
      contents = node.defaultContents.flatMap((child) =>
        renderTplNode(child, {
          ...ctx,
          env: {
            ...ctx.env,
            $props: {},
            $queries: {},
            $state: {},
          },
          valKey: ctx.valKey + "." + child.uuid,
        })
      );
    } else {
      contents = undefined;
    }
  } else {
    contents = withoutNils(ensureArray(ctx.env.$props[varName]));
  }

  const slotClass =
    contents && contents.length > 0 && isStyledTplSlot(node)
      ? [
          makeWabSlotClassName({ targetEnv: "canvas" }),
          ...activeVSettings.map((vs) => classNameForRuleSet(vs.rs)),
        ].join(" ")
      : undefined;

  if (
    (contents == null || contents.length === 0) &&
    !supressSlotPlaceholder(node, ctx)
  ) {
    const ownerKey = ensure(
      ctx.ownerKey,
      () => `ownerKey should exist for slot placeholders`
    );
    contents = [
      ctx.sub.React.createElement(mkCanvasSlotPlaceholder(ctx.sub), {
        ctx,
        node,
        param: node.param,
        component: ensure(
          ctx.ownerComponent,
          "Must be rendering slot belonging to some component"
        ),
        isPropOrSlot: isKeyInEditableStack(ctx, ctx.valKey) ? "slot" : "prop",
        slotSelectionKey: slotSelectionKeyFromRenderingCtx(
          ownerKey,
          node.param
        ),
      }),
    ];
  }

  const internalAttrs = {
    [valKeyProp]: ctx.valKey,
    // We're not passing the CanvasEnv for unstyled TplSlots because `getEnvId`
    // is not stable, so it would change the fragment key every time, making the
    // slot subtree unmount and remount.
    // [dataCanvasEnvsProp]: getEnvId(ctx),
    ...(ctx.ownerKey ? { [valOwnerProp]: ctx.ownerKey } : {}),
    ...(slotClass
      ? { [dataCanvasEnvsProp]: getEnvId(ctx), [classNameProp]: slotClass }
      : {}),
  };

  if (slotClass) {
    return ctx.sub.React.createElement(
      "div",
      {
        className: slotClass,
        ...internalAttrs,
      },
      ...(contents ?? [])
    );
  } else {
    return ctx.sub.React.createElement(
      ctx.sub.React.Fragment,
      { key: `${slotFragmentKey}${JSON.stringify(internalAttrs)}` },
      ...(contents ?? [])
    );
  }
}

function supressSlotPlaceholder(node: TplSlot, ctx: RenderingCtx) {
  if (!ctx.viewCtx.studioCtx.showSlotPlaceholder()) {
    return true;
  }
  if (!ctx.viewCtx.studioCtx.showContainerPlaceholder()) {
    return true;
  }
  return !(
    // We should show placeholder for this TplSlot if:
    // 1. This is a TplSlot of a component we are currently editing
    (
      (ctx.ownerKey && isKeyInEditableStack(ctx, ctx.ownerKey)) ||
      // 2. This is a SlotSelection of a component instance that belongs
      //    to the component we're currently editing
      (ctx.ownersStack.length > 1 &&
        isKeyInEditableStack(ctx, ctx.ownersStack[ctx.ownersStack.length - 2]))
    )
  );
}

function isKeyInEditableStack(ctx: RenderingCtx, valKey: string) {
  return computed(
    () => {
      return ctx.viewCtx.valComponentStack().some((v) => v.key === valKey);
    },
    { name: "isKeyInEditableStack" }
  ).get();
}

interface CanvasSlotPlaceholderProps {
  ctx: RenderingCtx;
  component: Component;
  // If empty, is a SlotSelection for a code component
  node?: TplSlot;
  param: Param;
  // if `prop`, it's in a TplComponent in current context;
  // if `slot`, it's TplSlot of current editable component
  isPropOrSlot: "prop" | "slot";
  slotSelectionKey: string;
}

const mkCanvasSlotPlaceholder = computedFn(
  (sub: SubDeps) =>
    function CanvasSlotPlaceholder({
      ctx,
      component,
      node,
      param,
      isPropOrSlot,
      slotSelectionKey,
    }: CanvasSlotPlaceholderProps) {
      return mkUseCanvasObserver(ctx.sub, ctx.viewCtx)(
        () =>
          withErrorDisplayFallback(
            ctx.sub.React,
            ctx,
            node ?? component,
            () => {
              const r = sub.React.createElement;
              return r(
                "div",
                {
                  className: "__wab_placeholder",
                  style: { display: "block" },
                  [slotPlaceholderAttr]: slotSelectionKey,
                },
                r("div", {
                  className: cx({
                    __wab_placeholder__inner: true,
                    __wab_placeholder__inner__autoWidth: true,
                    __wab_placeholder__inner__autoHeight: true,
                    "__wab_placeholder__inner__autoHeight--text":
                      node && isLikelyTextTplSlot(node),
                  }),
                }),
                r(
                  "div",
                  { className: "__wab_placeholder__tag" },
                  `${getComponentDisplayName(component)} ${
                    isPropOrSlot === "prop" ? "Slot" : "Slot Target"
                  }: ${param.variable.name}`
                ),
                r(
                  "div",
                  {
                    className: cx({ __wab_placeholder_border: true }),
                  },
                  r("div", {
                    className: cx({ __wab_placeholder_border_inner: true }),
                  })
                )
              );
            },
            {
              hasLoadingBoundary: ctx.env.$ctx[hasLoadingBoundaryKey],
            }
          ),
        `mkCanvasSlotPlaceholder(${component.name}.${param.variable.name})`
      );
    },
  {
    keepAlive: true,
  }
);

// Should keep in sync with `makeSlotSelectionKey` and parse it in globalHook.ts
function slotSelectionKeyFromRenderingCtx(tplCompKey: string, param: Param) {
  return `${tplCompKey}~${param.uuid}`;
}

export function getCodeComponentStub(
  component: Component,
  react: typeof React
) {
  assert(isCodeComponent(component), "Expected Code component");
  const slotNames = getSlotParams(component).map(
    (param) => param.variable.name
  );
  return (props: object) => {
    return react.createElement(
      "div",
      omit(props, slotNames),
      ...withoutNils(slotNames.map((name) => props[name]))
    );
  };
}

function createPlasmicElementProxy(
  node: TplNode,
  ctx: RenderingCtx,
  impl: React.ElementType<any> | string,
  attrs: object
) {
  const nodeName = ctx.nodeNamer?.(node);
  const triggeredHooks = ctx.reactHookSpecs.filter(
    (spec) => spec.triggerNode === node
  );
  return ctx.sub.reactWeb.createPlasmicElementProxy(impl as React.ElementType, {
    ...attrs,
    ...(nodeName != null
      ? {
          "data-plasmic-name": nodeName,
          "data-plasmic-override":
            ctx.overrides[nodeName] ??
            (isKnownTplTag(node) &&
            !node.name &&
            nodeName in nodeNameBackwardsCompatibility
              ? ctx.overrides[
                  nodeNameBackwardsCompatibility[
                    nodeName as keyof typeof nodeNameBackwardsCompatibility
                  ]
                ]
              : undefined),
        }
      : {}),
    ...(node === ctx.ownerComponent?.tplTree
      ? { "data-plasmic-root": true }
      : {}),
    ...(triggeredHooks.length > 0
      ? {
          "data-plasmic-trigger-props": triggeredHooks.flatMap((spec) =>
            spec
              .getTriggerPropNames()
              .map((propName) => ctx.triggerProps[propName])
          ),
        }
      : {}),
  }) as React.ReactElement;
}

export interface CanvasFrameInfo {
  // Using constants to avoid pulling in Arenas.ts
  viewMode: "stretch" | "centered";
  height: number;
  isHeightAutoDerived: boolean;
  bgColor: string | undefined;
  pageSizeType?: PageSizeType;
  containerType?: ContainerType;
  defaultInitialPageFrameSize?: number;
}

export const mkCanvas = computedFn(
  (sub: SubDeps, vc: ViewCtx) =>
    (props: {
      children?: React.ReactNode;
      frameInfo: IObservableValue<CanvasFrameInfo>;
    }) => {
      const forceUpdate = useCanvasForceUpdate(sub);

      return mkUseCanvasObserver(sub, vc)(
        () => {
          const { children, frameInfo } = props;
          const { viewMode, height, isHeightAutoDerived, bgColor } =
            frameInfo.get();

          const appUserCtx = vc.studioCtx.currentAppUserCtx;

          sub.React.useEffect(() => {
            vc.canvasCtx.doc().body.style.backgroundColor = bgColor || "unset";
          }, [bgColor]);

          let wrapped: React.ReactElement = sub.React.createElement(
            "div",
            {
              className: cx({
                __wab_root: true,
                "__wab_root--stretch": viewMode === "stretch",
                "__wab_root--centered": viewMode === "centered",
                "__wab_root--checkerboard": viewMode === "centered" && !bgColor,
                "__wab_root--page-stretch": isHeightAutoDerived,
              }),
              style: {
                minHeight: `${height}px`,
                "--viewport-height": `${height}px`,
              },
            },
            children
          );

          if (sub.dataSourcesContext?.PlasmicDataSourceContextProvider) {
            wrapped = sub.React.createElement(
              sub.dataSourcesContext.PlasmicDataSourceContextProvider,
              {
                value: {
                  user: {
                    email: appUserCtx.appUser.email,
                    roleId: appUserCtx.appUser.roleId,
                    roleName: appUserCtx.appUser.roleName,
                    roleIds: appUserCtx.appUser.roleIds?.map(
                      (roleId) => roleId
                    ),
                    roleNames: appUserCtx.appUser.roleNames?.map(
                      (roleName) => roleName
                    ),
                    isLoggedIn: appUserCtx.appUser.isLoggedIn,
                  } as any,
                  userAuthToken: appUserCtx.fakeAuthToken,
                },
              },
              wrapped
            );
          }

          return wrapped;
        },
        "mkCanvas",
        forceUpdate
      );
    },
  {
    keepAlive: true,
  }
);

// We want to store the `env` for this node in the props. However, `tplSlots`
// might render React fragments, which store all the data in the fragment key.
// Since we can't stringify the envs, we need to create an ID for them.
let envIdCount = 1;
export function getEnvId(ctx: RenderingCtx) {
  const envs = { env: ctx.env, wrappingEnv: ctx.wrappingEnv };
  const id = `${envIdCount}`;
  envIdCount++;
  // We create a mobx observable and then subscribe to changes, so we ensure it
  // will only be garbage collected when we're no longer reading from it.
  const box = observable.box(envs, { deep: false });
  globalHookCtx.envIdToEnvs.set(id, new WeakRef(box.get()));
  return id;
}

// A wrapper for providing extra props consumed by the global hook. Just renders
// the children.
const mkCanvasWrapper = computedFn(function mkCanvasWrapper(sub: SubDeps) {
  return function CanvasWrapper(props: {
    children: React.ReactNode;
    [prop: string]: any;
  }) {
    return sub.React.createElement(sub.React.Fragment, {}, props.children);
  };
});

function wrapInDataCtxReader(
  ctx: RenderingCtx,
  contents: ($ctx: DataDict | undefined) => React.ReactNode,
  label: string
) {
  return ctx.sub.React.createElement(
    ctx.sub.DataCtxReader as React.FunctionComponent<{
      children: ($ctx: DataDict | undefined) => React.ReactNode;
    }>,
    {
      children: ($newCtx) => {
        return mkUseCanvasObserver(ctx.sub, ctx.viewCtx)(
          () => contents($newCtx),
          label
        );
      },
    }
  );
}

/**
 * We need to create a wrapper for component-level queries because the number
 * of React hooks to be used depend on the number of queries to be made, but
 * React requires each component to use a constant number of hooks, so we need
 * to generate a new React Component whenever the number of queries changes.
 */
const mkComponentLevelQueryFetcher = computedFn(
  (sub: SubDeps, viewCtx: ViewCtx, _dataQueriesCount: number) =>
    ({
      ctx,
      component,
    }: {
      ctx: RenderingCtx;
      component: Component;
    }): React.ReactElement | null => {
      return mkUseCanvasObserver(
        sub,
        viewCtx
      )(() => {
        const getDataOp = (query: ComponentDataQuery) =>
          query.op
            ? () => {
                return evalCodeWithEnv(
                  asCode(removeFallbackFromDataSourceOp(query.op!), {
                    component,
                    projectFlags: ctx.projectFlags,
                    inStudio: true,
                  }).code,
                  ctx.env,
                  ctx.viewCtx.canvasCtx.win()
                );
              }
            : undefined;
        const new$Queries = Object.fromEntries(
          component.dataQueries
            .filter((query) => !!query.op)
            .map(
              (query) =>
                [
                  toVarName(query.name),
                  sub.dataSources?.usePlasmicDataOp(getDataOp(query)),
                ] as const
            )
        );
        defer(() => {
          Object.keys(new$Queries).forEach((k) => {
            try {
              if (new$Queries[k]?.isLoading) {
                // Force kickoff all fetches
                (new$Queries[k] as any).data.value;
              }
            } catch {
              /* Empty */
            }
          });
        });
        // In codegen we update $queries in the render function, but we can't
        // do it here as this is not the `Component` render function, so we
        // update the object itself to delete old queries and add the new ones.
        let shouldUpdate = false;
        Object.keys(new$Queries).forEach((k) => {
          if (!(k in ctx.env.$queries)) {
            ctx.env.$queries[k] = new$Queries[k];
            shouldUpdate = true;
          }
        });
        [...Object.keys(ctx.env.$queries)].forEach((k) => {
          if (!(k in new$Queries)) {
            delete ctx.env.$queries[k];
            shouldUpdate = true;
          }
        });

        Object.keys(new$Queries).forEach((k) => {
          if (new$Queries[k] !== ctx.env.$queries[k]) {
            ctx.env.$queries[k] = new$Queries[k];
            shouldUpdate = true;
          }
        });

        ctx.env.$state.eagerInitializeStates(ctx.stateSpecs);

        sub.React.useLayoutEffect(() => {
          if (shouldUpdate) {
            ctx.setDollarQueries(new$Queries);
          }
        }, [shouldUpdate, new$Queries, ctx.env.$queries]);

        return renderTplNode(component.tplTree, ctx);
      });
    }
);

/**
 * Renders the component root, wrapped in data queries fetcher
 */
function wrapInComponentDataQueries(ctx: RenderingCtx, component: Component) {
  return ctx.sub.React.createElement(
    mkComponentLevelQueryFetcher(
      ctx.sub,
      ctx.viewCtx,
      component.dataQueries.filter((query) => !!query.op).length
    ),
    {
      ctx,
      component,
    }
  );
}

function pinMapEquals(map1: PinMap, map2: PinMap) {
  if (map1.size !== map2.size) {
    return false;
  }
  for (const key of map1.keys()) {
    if (!map2.has(key)) {
      return false;
    }
    const sub1 = map1.get(key);
    const sub2 = map2.get(key);
    if (!(sub1 && sub2) || !mapEquals(sub1, sub2)) {
      return false;
    }
  }
  return true;
}
