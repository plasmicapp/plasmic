import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  isStandaloneVariantGroup,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  assert,
  assertNever,
  ensure,
  mkShortId,
  remove,
  unexpected,
  uniqueName,
  withoutNils,
} from "@/wab/shared/common";
import {
  getComponentDisplayName,
  removeComponentParam,
} from "@/wab/shared/core/components";
import {
  ExprCtx,
  InteractionConditionalMode,
  asCode,
  code,
  codeLit,
  isFallbackSet,
  isRealCodeExpr,
  isRealCodeExprEnsuringType,
  tryExtractJson,
  tryExtractLit,
} from "@/wab/shared/core/exprs";
import * as Lang from "@/wab/shared/core/lang";
import { ParamExportType } from "@/wab/shared/core/lang";
import { extractComponentUsages, writeable } from "@/wab/shared/core/sites";
import * as Tpls from "@/wab/shared/core/tpls";
import { isTplComponent } from "@/wab/shared/core/tpls";
import { DevFlagsType } from "@/wab/shared/devflags";
import { parseExpr } from "@/wab/shared/eval/expression-parser";
import { ensureComponentsObserved } from "@/wab/shared/mobx-util";
import {
  Component,
  ComponentVariantGroup,
  CustomCode,
  EventHandler,
  Expr,
  Interaction,
  NameArg,
  NamedState,
  Param,
  PropParam,
  Site,
  State,
  StateChangeHandlerParam,
  StateParam,
  TplComponent,
  TplNode,
  TplTag,
  VariantGroup,
  VariantGroupState,
  ensureKnownFunctionType,
  ensureKnownNamedState,
  isKnownCollectionExpr,
  isKnownCustomCode,
  isKnownFunctionArg,
  isKnownFunctionExpr,
  isKnownGenericEventHandler,
  isKnownImageAssetRef,
  isKnownNamedState,
  isKnownObjectPath,
  isKnownPageHref,
  isKnownTplComponent,
  isKnownTplRef,
  isKnownTplTag,
  isKnownVarRef,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import { getPublicUrl } from "@/wab/shared/urls";
import { isArray } from "lodash";

export const STATE_VARIABLE_TYPES = [
  "text",
  "number",
  "boolean",
  "array",
  "object",
  "dateString",
  "dateRangeStrings",
  "variant",
] as const;
export const DEFAULT_STATE_VARIABLE_TYPE = STATE_VARIABLE_TYPES[0];
export type StateVariableType = (typeof STATE_VARIABLE_TYPES)[number];

export const STATE_ACCESS_TYPES = ["private", "readonly", "writable"] as const;
export const DEFAULT_STATE_ACCESS_TYPE = STATE_ACCESS_TYPES[0];
export type StateAccessType = (typeof STATE_ACCESS_TYPES)[number];

export const DEFAULT_STATE_VARIABLE_NAME = "variable";

export type StateType = Omit<State, "accessType" | "variableType"> & {
  accessType: StateAccessType;
  variableType: StateVariableType;
};

export function getDefaultValueForStateVariableType(
  variableType: StateVariableType
) {
  switch (variableType) {
    case "text":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
    case "dateString":
      return new Date().toISOString();
    case "dateRangeStrings":
      return [];
    default:
      unexpected(`unexpected variable type: ${variableType}`);
  }
}

export function getAccessTypeDisplayName(accessType: StateAccessType) {
  switch (accessType) {
    case "private":
      return "Private";
    case "readonly":
      return "Read only";
    case "writable":
      return "Read and write";
    default:
      assertNever(accessType);
  }
}

export function mkImplicitState(
  state: State,
  tplNode: TplComponent | TplTag,
  param: StateParam,
  onChangeParam: StateChangeHandlerParam
) {
  let implicitVariableType = state.variableType;
  if (
    (state.variableType as StateVariableType) === "variant" &&
    isTplComponent(tplNode)
  ) {
    const vg = tplNode.component.variantGroups.find(
      (iVg) => iVg.param === state.param
    );
    if (isStandaloneVariantGroup(vg)) {
      implicitVariableType = "boolean" as StateVariableType;
    } else {
      implicitVariableType = "text" as StateVariableType;
    }
  }
  const implicitState = new State({
    param,
    accessType: "private",
    onChangeParam,
    tplNode,
    implicitState: state,
    variableType: implicitVariableType,
  });

  writeable(implicitState.param).state = implicitState;
  writeable(onChangeParam).state = implicitState;

  return implicitState;
}

export function mkState(
  stateProps: {
    param: StateParam;
    onChangeParam: StateChangeHandlerParam;
    variantGroup: ComponentVariantGroup;
    variableType: "variant";
  } & Partial<StateType>
): VariantGroupState;
export function mkState(
  stateProps: {
    param: StateParam;
    onChangeParam: StateChangeHandlerParam;
    variantGroup?: ComponentVariantGroup;
  } & Partial<StateType>
): State;
export function mkState(
  stateProps: {
    param: StateParam;
    onChangeParam: StateChangeHandlerParam;
    variantGroup?: ComponentVariantGroup;
  } & Partial<StateType>
): State {
  const {
    param,
    accessType = "private",
    onChangeParam,
    tplNode = null,
    implicitState = null,
    variableType = "text",
    variantGroup,
  } = stateProps;
  let state: State;
  if (variableType === "variant") {
    state = new VariantGroupState({
      param,
      accessType,
      onChangeParam,
      tplNode,
      implicitState,
      variableType,
      variantGroup: ensure(
        variantGroup,
        () => `VariantGroup should be set for variant non-implicit states`
      ),
    });
    writeable(state.variantGroup).linkedState = state;
  } else {
    state = new State({
      param,
      accessType,
      onChangeParam,
      tplNode,
      implicitState,
      variableType,
    });
  }
  writeable(state.param).state = state;
  writeable(onChangeParam).state = state;

  return state;
}

export function mkNamedState(
  stateProps: {
    param: StateParam;
    onChangeParam: StateChangeHandlerParam | PropParam;
    name: string;
    variableType?: Exclude<StateVariableType, "variant">;
  } & Partial<StateType>
) {
  const {
    param,
    name,
    accessType = "private",
    onChangeParam,
    tplNode = null,
    implicitState = null,
    variableType = "text",
  } = stateProps;
  return new NamedState({
    param,
    name,
    accessType,
    onChangeParam,
    tplNode,
    implicitState,
    variableType,
  });
}

export function removeImplicitStatesAfterRemovingTplNode(
  site: Site,
  component: Component,
  node: TplNode
) {
  component.states
    .filter((state) => state.tplNode === node)
    .forEach((state) => removeComponentState(site, component, state));
}

export function ensureCorrectImplicitStates(
  site: Site,
  owner: Component,
  tpl: TplComponent | TplTag
) {
  if (shouldHaveImplicitState(owner, tpl)) {
    addImplicitStatesAfterInsertingTplNode(site, owner, tpl);
  } else {
    removeImplicitStatesAfterRemovingTplNode(site, owner, tpl);
  }
}

export function shouldHaveImplicitState(
  owner: Component,
  tpl: TplComponent | TplTag
) {
  if (isTplComponent(tpl)) {
    if (!tpl.component.states.find((s) => isPublicState(s))) {
      // No public states, so no need to create implicit states
      return false;
    }
  }

  if (Tpls.isTplTag(tpl)) {
    if (!deriveStatefulTagName(tpl)) {
      return false;
    }
  }

  // This tpl is stateful.  But if it is in slot default content,
  // it also shouldn't have an implicit state. The implicit state for this
  // tpl should belong to the parent of `component` and not `component`.
  if (
    $$$(tpl)
      .parents()
      .toArrayOfTplNodes()
      .some((parent) => Tpls.isTplSlot(parent))
  ) {
    return false;
  }

  return true;
}

function addImplicitStatesAfterInsertingTplNode(
  site: Site,
  owner: Component,
  node: TplComponent | TplTag
) {
  const tplMgr = new TplMgr({ site });

  if (isKnownTplComponent(node)) {
    for (const state of node.component.states) {
      if (isPrivateState(state)) {
        continue;
      }

      if (
        owner.states.find(
          (s) => s.tplNode === node && s.implicitState === state
        )
      ) {
        continue;
      }

      const paramName = genImplicitStateParamName(node, state);
      const { onChangeParam, valueParam } = Lang.mkParamsForImplicitState(
        state,
        tplMgr.getUniqueParamName(owner, paramName),
        tplMgr.getUniqueParamName(owner, genOnChangeParamName(paramName))
      );
      const implicitState = mkImplicitState(
        state,
        node,
        valueParam,
        onChangeParam
      );
      addComponentState(site, owner, implicitState);
    }
  } else if (isKnownTplTag(node)) {
    // Set `addItemKey` iff we need to create a value state for this node.
    const addItemKey = deriveStatefulTagName(node);

    if (addItemKey) {
      if (!node.name) {
        tplMgr.renameTpl(owner, node, addItemKey);
      }
      const valueState = mkValueStateForTextInput(node, owner, tplMgr);
      if (
        owner.states.find(
          (s) =>
            s.tplNode === node &&
            isKnownNamedState(s) &&
            s.name === valueState.name
        )
      ) {
        // Implicit state already added.
        return;
      }
      addComponentState(site, owner, valueState);
    }
  }
}

function deriveStatefulTagName(node: TplTag) {
  const tagSummary = Tpls.summarizeTplTag(node);
  const addItemKey =
    node.tag === "textarea"
      ? AddItemKey.textarea
      : tagSummary === "password input"
      ? AddItemKey.password
      : tagSummary.endsWith(" input")
      ? AddItemKey.textbox
      : undefined;
  return addItemKey;
}

function flattenImplicitStates(state: State) {
  const states = [state];
  while (state.implicitState) {
    states.push(state.implicitState);
    state = state.implicitState;
  }
  return states;
}

export function getLastPartOfImplicitStateName(state: State) {
  if (state.implicitState) {
    return isKnownNamedState(state.implicitState)
      ? state.implicitState.name
      : state.implicitState.param.variable.name;
  } else {
    return ensureKnownNamedState(state).name;
  }
}

export function getStateVarName(state: State) {
  if (state.tplNode) {
    const dataReps = Tpls.ancestorsUp(state.tplNode).filter(
      Tpls.isTplRepeated
    ).length;
    const tplName = toVarName(
      ensure(state.tplNode.name, "TplNode with public states must be named")
    );
    const stateName = toVarName(getLastPartOfImplicitStateName(state));
    return `${tplName}${"[]".repeat(dataReps)}.${stateName}`;
  } else {
    return toVarName(state.param.variable.name);
  }
}

type StateIn$State = {
  obj: {};
  key: string;
};

export function findStateIn$State(state: State, $state: {}): StateIn$State[] {
  const recurse = (curObj: {} | [], curParts: string[]): StateIn$State[] => {
    if (curParts.length < 1) {
      return [];
    }
    const curPart = curParts[0];
    if (curParts.length === 1) {
      return [{ obj: curObj, key: curPart }];
    } else if (curPart === "[]") {
      assert(isArray(curObj), "");
      return curObj.flatMap((obj) => recurse(obj, curParts.slice(1)));
    } else {
      return recurse(curObj[curPart], curParts.slice(1));
    }
  };

  const allParts = getStateVarName(state).replaceAll("[", ".[").split(".");
  return recurse($state, allParts);
}

export function getStateDisplayName(
  state: State,
  mode: "short" | "long" = "long",
  humanize = true
) {
  if (state.tplNode) {
    const dataReps = Tpls.ancestorsUp(state.tplNode).filter(
      Tpls.isTplRepeated
    ).length;
    const tplName = ensure(
      state.tplNode.name,
      "TplNode with public states must be named"
    );
    const rawName = getLastPartOfImplicitStateName(state);
    const stateName = humanize ? smartHumanize(rawName) : rawName;
    return mode === "short"
      ? `${stateName}`
      : `${tplName}${dataReps ? " (repeated)" : ""} → ${stateName}`;
  } else {
    return humanize
      ? smartHumanize(state.param.variable.name)
      : state.param.variable.name;
  }
}

function genImplicitStateParamName(node: TplTag | TplComponent, state: State) {
  const name = node.name
    ? node.name
    : isTplComponent(node)
    ? node.component.name
    : "";
  return (name + " " + state.param.variable.name).trim();
}

export function genOnChangeParamName(valueParamName: string) {
  return `On ${valueParamName} change`;
}

export function getStateValuePropName(state: State) {
  return toVarName(state.param.variable.name);
}

export function getStateOnChangePropName(state: State) {
  const onChangeParam = state.onChangeParam;
  return onChangeParam ? toVarName(onChangeParam.variable.name) : undefined;
}

export function getComponentStateOnChangePropNames(
  component: Component,
  node: TplComponent
) {
  return new Set(
    withoutNils(
      component.states.map((state) =>
        state.tplNode === node && !!state.implicitState
          ? getStateOnChangePropName(state.implicitState)
          : null
      )
    )
  );
}

export function isPrivateState(state: State) {
  return state.accessType === "private";
}

export function isPublicState(
  state: State
): state is State & { onChangeParam: Param } {
  return state.accessType !== "private";
}

export function isOnChangeParam(param: Param, component: Component) {
  return component.states.some((state) => state.onChangeParam === param);
}

export function isWritableState(state: State) {
  return state.accessType === "writable";
}

export function isReadonlyState(state: State) {
  return state.accessType === "readonly";
}

export function updateStateAccessType(
  site: Site,
  component: Component,
  state: State,
  newAccessType: StateAccessType,
  opts?: {
    onChangeProp?: string;
  }
) {
  const isPrevStatePrivate = isPrivateState(state);
  state.accessType = newAccessType;
  state.param.exportType =
    newAccessType === "writable" ||
    component.variantGroups.find((vg) => vg.linkedState === state)
      ? ParamExportType.External
      : ParamExportType.ToolsOnly;
  const isCurrStatePrivate = isPrivateState(state);
  if (isPrevStatePrivate && !isCurrStatePrivate) {
    addImplicitStates(site, component);
    const onChangePropName = new TplMgr({ site }).getUniqueParamName(
      component,
      opts?.onChangeProp ?? genOnChangeParamName(state.param.variable.name),
      state.onChangeParam
    );
    state.onChangeParam.variable.name = onChangePropName;
    state.onChangeParam.exportType = ParamExportType.External;
  } else if (!isPrevStatePrivate && isCurrStatePrivate) {
    removeImplicitStates(site, component, state);
    state.onChangeParam.exportType = ParamExportType.ToolsOnly;
  }
}

export function addImplicitStates(site: Site, component: Component) {
  const tplMgr = new TplMgr({ site });
  Tpls.findAllInstancesOfComponent(site, component).forEach(
    ({ referencedComponent, tpl }) => {
      ensureComponentsObserved([referencedComponent]);
      if (!tpl.name) {
        // Auto-name TplComponents with public states.
        tplMgr.renameTpl(
          referencedComponent,
          tpl,
          getComponentDisplayName(component)
        );
      }
      ensureCorrectImplicitStates(site, referencedComponent, tpl);
    }
  );
}

export function findImplicitStates(
  site: Site,
  component: Component,
  state: State
) {
  return extractComponentUsages(site, component).components.flatMap(
    (refComponent) =>
      refComponent.states
        .filter((refState) => refState.implicitState === state)
        .map((refState) => ({ component: refComponent, state: refState }))
  );
}

export function* findRecursiveImplicitStates(site: Site, state: State) {
  for (const component of site.components) {
    for (const componentState of component.states) {
      if (state === componentState) {
        continue;
      }

      const implicitStates = flattenImplicitStates(componentState);
      if (!implicitStates.some((st2) => st2 === state)) {
        continue;
      }

      yield { component, state: componentState };
    }
  }
}

export function removeImplicitStates(
  site: Site,
  component: Component,
  state: State
) {
  for (const { component: refComponent, state: refState } of findImplicitStates(
    site,
    component,
    state
  )) {
    removeComponentState(site, refComponent, refState);
  }
}

export function addComponentState(
  site: Site,
  component: Component,
  state: State
) {
  component.states.push(state);
  if (!component.params.includes(state.param)) {
    component.params.push(state.param);
  }
  if (!component.params.includes(state.onChangeParam)) {
    component.params.push(state.onChangeParam);
  }
  if (isPublicState(state)) {
    addImplicitStates(site, component);
  }
}

export function removeComponentState(
  site: Site,
  component: Component,
  state: State
) {
  removeComponentParam(site, component, state.param);
  removeComponentParam(site, component, state.onChangeParam);
}

/**
 * Removes the component state and references to it, without removing
 * corresponding params
 */
export function removeComponentStateOnly(
  site: Site,
  component: Component,
  state: State
) {
  if (!isPrivateState(state)) {
    removeImplicitStates(site, component, state);
  }
  remove(component.states, state);
}

export function getKeysToFlatForDollarState(component: Component) {
  return component.states.map((state) => {
    if (state.tplNode) {
      const dataReps = Tpls.ancestorsUp(state.tplNode).filter(
        Tpls.isTplRepeated
      ).length;
      if (!dataReps) {
        return [
          "$state",
          toVarName(
            ensure(
              state.tplNode.name,
              "TplNode with public states must be named"
            )
          ),
        ];
      }
    }
    return ["$state"];
  });
}

/**
 * Returns implicit states created by nodes in the flattened tree.
 */
export function findImplicitStatesOfNodesInTree(
  component: Component,
  tree: TplNode
): State[] {
  const nodes = new Set(Tpls.flattenTpls(tree));
  return component.states.filter((s) => s.tplNode && nodes.has(s.tplNode));
}

/**
 * Returns boolean indicating whether `expr` is referencing `state`.
 */
export function isStateUsedInExpr(
  state: State,
  expr: Expr | null | undefined
): boolean {
  if (isRealCodeExpr(expr) || isKnownFunctionExpr(expr)) {
    assert(
      isKnownCustomCode(expr) ||
        isKnownObjectPath(expr) ||
        isKnownFunctionExpr(expr),
      "Real code expression must be CustomCode or ObjectPath"
    );
    const info = parseExpr(expr);
    const varName = getStateVarName(state);
    return (
      info.usedDollarVarKeys.$state.has(varName) ||
      (isRealCodeExprEnsuringType(expr) &&
        isStateUsedInExpr(state, expr.fallback))
    );
  } else if (isKnownVarRef(expr)) {
    return (
      expr.variable === state.param.variable ||
      expr.variable === state.onChangeParam?.variable
    );
  } else if (isKnownVariantsRef(expr)) {
    return expr.variants.some(
      (v) => v.parent?.param.variable === state.param.variable
    );
  }

  return false;
}

/**
 * Returns implicit usages of `state` in `site`.
 */
export function findImplicitUsages(site: Site, state: State) {
  const output: { component: Component; state: State; expr: Expr }[] = [];

  for (const {
    component,
    state: componentState,
  } of findRecursiveImplicitStates(site, state)) {
    const refs = Tpls.findExprsInComponent(component).filter(({ expr }) =>
      isStateUsedInExpr(componentState, expr)
    );
    output.push(
      ...refs.map(({ expr }) => ({ component, state: componentState, expr }))
    );
  }

  return output;
}

type DistributedKeyOf<T> = T extends any ? keyof T : never;

interface SiteCtx {
  projectId: string;
  platform: "nextjs" | "gatsby" | "react";
  projectFlags: DevFlagsType;
  inStudio: boolean;
}

export enum UpdateVariableOperations {
  // common
  NewValue,
  ClearValue,
  // number
  Increment,
  Decrement,
  // boolean
  Toggle,
  // array
  Push,
  Splice,
}

/** Each operation's functionBody should return the updated value. */
export const updateVariableOperations: {
  label: string;
  value: UpdateVariableOperations;
  hidden?: (
    variableType: string | undefined,
    isImplicitStateArray: boolean | undefined
  ) => boolean;
  functionBody: string;
}[] = [
  {
    label: "Increment variable",
    value: UpdateVariableOperations.Increment,
    hidden: (variableType, isImplicitStateArray) =>
      isImplicitStateArray || variableType !== "number",
    functionBody: `
    const oldValue = $stateGet(objRoot, variablePath);
    $stateSet(objRoot, variablePath, oldValue+1);
    return oldValue+1;
  `,
  },
  {
    label: "Decrement variable",
    value: UpdateVariableOperations.Decrement,
    hidden: (variableType, isImplicitStateArray) =>
      isImplicitStateArray || variableType !== "number",
    functionBody: `
    const oldValue = $stateGet(objRoot, variablePath);
    $stateSet(objRoot, variablePath, oldValue-1);
    return oldValue-1;
  `,
  },
  {
    label: "Toggle variable",
    value: UpdateVariableOperations.Toggle,
    hidden: (variableType, isImplicitStateArray) =>
      isImplicitStateArray || variableType !== "boolean",
    functionBody: `
    const oldValue = $stateGet(objRoot, variablePath);
    $stateSet(objRoot, variablePath, !oldValue);
    return !oldValue;
  `,
  },
  {
    label: "Add element",
    value: UpdateVariableOperations.Push,
    hidden: (variableType, isImplicitStateArray) =>
      !isImplicitStateArray && variableType !== "array",
    functionBody: `
    const arr = $stateGet(objRoot, variablePath);
    arr.push(value);
    return arr;
  `,
  },
  {
    label: "Remove elements",
    value: UpdateVariableOperations.Splice,
    hidden: (variableType, isImplicitStateArray) =>
      !isImplicitStateArray && variableType !== "array",
    functionBody: `
    const arr = $stateGet(objRoot, variablePath);
    arr.splice(startIndex, deleteCount);
    return arr;
  `,
  },
  {
    label: "New value",
    value: UpdateVariableOperations.NewValue,
    functionBody: `
    $stateSet(objRoot, variablePath, value);
    return value;
  `,
  },
  {
    label: "Clear value",
    value: UpdateVariableOperations.ClearValue,
    functionBody: `
    $stateSet(objRoot, variablePath, undefined);
    return undefined;
  `,
  },
];

export enum UpdateVariantOperations {
  NewValue,
  ClearValue,
  Toggle,
  MultiToggle,
  Activate,
  MultiActivate,
  Deactivate,
  MultiDeactivate,
}

/**
 *  Each operation's functionBody should return the updated variant value, depending on the variant type:
 *  - Toggle: boolean
 *  - Single-select: string | undefined
 *  - Multi-select: string[] | undefined
 */
export const updateVariantOperations: {
  label: string;
  value: UpdateVariantOperations;
  hidden?: (vg: VariantGroup) => boolean;
  functionBody: string;
}[] = [
  {
    label: "New value",
    value: UpdateVariantOperations.NewValue,
    functionBody: `
    $stateSet($state, vgroup, value);
    return value;
  `,
    hidden: (vg) => isStandaloneVariantGroup(vg),
  },
  {
    label: "Clear variant",
    value: UpdateVariantOperations.ClearValue,
    functionBody: `
    $stateSet($state, vgroup, undefined);
    return undefined;
  `,
    hidden: (vg) => isStandaloneVariantGroup(vg),
  },
  {
    label: "Toggle variant",
    value: UpdateVariantOperations.Toggle,
    hidden: (vg) => !isStandaloneVariantGroup(vg),
    functionBody: `
    const oldValue = $stateGet($state, vgroup);
    $stateSet($state, vgroup, !oldValue);
    return !oldValue;
  `,
  },
  {
    label: "Toggle variant",
    value: UpdateVariantOperations.MultiToggle,
    hidden: (vg) => isStandaloneVariantGroup(vg) || !vg.multi,
    functionBody: `
    let activeVariants = $stateGet($state, vgroup) ?? [];
    if (typeof activeVariants === "string") {
      activeVariants = [activeVariants];
    }
    for (const variant of value) {
      if (activeVariants.includes(variant)) {
        activeVariants.splice(activeVariants.indexOf(variant), 1);
      } else {
        activeVariants.push(variant);
      }
    }
    $stateSet($state, vgroup, activeVariants);
    return activeVariants;
  `,
  },
  {
    label: "Activate variant",
    value: UpdateVariantOperations.Activate,
    hidden: (vg) => !isStandaloneVariantGroup(vg),
    functionBody: `
    $stateSet($state, vgroup, true);
    return true;
  `,
  },
  {
    label: "Activate variant",
    value: UpdateVariantOperations.MultiActivate,
    hidden: (vg) => isStandaloneVariantGroup(vg) || !vg.multi,
    functionBody: `
    let activeVariants = $stateGet($state, vgroup) ?? [];
    if (typeof activeVariants === "string") {
      activeVariants = [activeVariants];
    }
    for (const variant of value) {
      if (!activeVariants.includes(variant)) {
        activeVariants.push(variant)
      }
    }
    $stateSet($state, vgroup, activeVariants);
    return activeVariants;
  `,
  },
  {
    label: "Deactivate variant",
    value: UpdateVariantOperations.Deactivate,
    hidden: (vg) => !isStandaloneVariantGroup(vg),
    functionBody: `
    $stateSet($state, vgroup, false);
    return false;
  `,
  },
  {
    label: "Deactivate variant",
    value: UpdateVariantOperations.MultiDeactivate,
    hidden: (vg) => isStandaloneVariantGroup(vg) || !vg.multi,
    functionBody: `
    const activeVariants = $stateGet($state, vgroup) ?? [];
    if (typeof activeVariants === "string") {
      activeVariants = [activeVariants];
    }
    const filteredVariants = activeVariants.filter(variant => !value.includes(variant));
    $stateSet($state, vgroup, filteredVariants);
    return filteredVariants;
  `,
  },
];

export const DATA_SOURCE_ACTIONS = ["dataSourceOp", "invalidateDataQuery"];
export const LOGIN_ACTIONS = ["login"];

export interface ACTION_TYPE<P> {
  function: ((args: NameArg[]) => string) | string;
  onSerialize?: (args: Expr) => Expr;
  parameters: {
    [parameter in DistributedKeyOf<P>]: {
      onSerializeArg?: (value: Expr, component: Component) => Expr;
    };
  };
}

export const ACTIONS: Record<string, ACTION_TYPE<any>> = {};

export const initBuiltinActions = (siteCtx: SiteCtx) =>
  Object.assign(ACTIONS, {
    updateVariable: {
      parameters: {
        variable: {
          onSerializeArg: (value) => {
            if (!value) {
              return value;
            }
            assert(
              isKnownObjectPath(value),
              "custom function must be a custom code"
            );
            return new CustomCode({
              fallback: null,
              code: `{
                objRoot: ${value.path[0]},
                variablePath: [${value.path
                  .slice(1)
                  .map((val) => `"${val}"`)
                  .join(", ")}]
              }`,
            });
          },
        },
      },
      function: (args) => {
        const operation = updateVariableOperations.find((op) =>
          args.find(
            (iarg) =>
              iarg.name === "operation" &&
              op.value === tryExtractJson(iarg.expr)
          )
        );
        return `({ variable, value, startIndex, deleteCount }) => {
          if (!variable) {
            return ;
          }
          const { objRoot, variablePath } = variable;
          ${operation?.functionBody}
        }`;
      },
    },
    updateVariant: {
      parameters: {
        vgroup: {
          onSerializeArg: (arg, component) => {
            if (isKnownVarRef(arg)) {
              const varRef = arg;
              const maybeState = component?.states.find(
                (s) => s.param.variable === varRef.variable
              );
              if (maybeState) {
                // We serialize just to the name of the variant group,
                // as we use `vgroup` as a string to look up into
                // $state.
                return codeLit(getStateVarName(maybeState));
              }
            }
            return arg;
          },
        },
      },
      function: (args) => {
        const operation = updateVariantOperations.find((op) =>
          args.find(
            (iarg) =>
              iarg.name === "operation" &&
              op.value === tryExtractJson(iarg.expr)
          )
        );
        return `({ vgroup, value }) => {
          if (typeof value === "string") {
            value = [value];
          }
          ${operation?.functionBody}
        }`;
      },
    },
    invokeEventHandler: {
      parameters: {},
      function: `({ eventRef, args }) => {
        return eventRef?.(...(args ?? []))
      }`,
    },
    customFunction: {
      parameters: {
        customFunction: {
          onSerializeArg(value, comp) {
            const codeStr = asCode(value, {
              projectFlags: siteCtx.projectFlags,
              component: comp,
              inStudio: siteCtx.inStudio,
            }).code;
            return code(`async ${codeStr}`);
          },
        },
      },
      function: `({ customFunction }) => {
        return customFunction();
      }`,
    },
    dataSourceOp: {
      parameters: {},
      function: `async ({ dataOp, continueOnError }) => {
        try {
          const response = await executePlasmicDataOp(dataOp, { userAuthToken: dataSourcesCtx?.userAuthToken, user: dataSourcesCtx?.user });
          await plasmicInvalidate(dataOp.invalidatedKeys);
          return response;
        } catch(e) {
          if(!continueOnError) {
            throw(e);
          }
          return e;
        }
      }`,
    },
    invalidateDataQuery: {
      parameters: {},
      function: `async ({ queryInvalidation }) => {
        if(!queryInvalidation) {
          return;
        }
        await plasmicInvalidate(queryInvalidation);
      }`,
    },
    login: {
      parameters: {},
      function: `async ({ continueTo }) => {
        function uuidv4() {
          return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (
              c ^
              (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
            ).toString(16)
          );
        }

        async function sha256(text) {
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          return hashHex;
        }

        const state = JSON.stringify({ continueTo: continueTo || window.location.href });
        const code_verifier = uuidv4();
        localStorage.setItem("code_verifier", code_verifier);
        const code_challenge = await sha256(code_verifier);

        const params = new URLSearchParams();
        params.set("client_id", "${siteCtx.projectId}");
        params.set("state", state);
        params.set("response_type", "code");
        params.set("code_challenge", code_challenge);
        params.set("code_challenge_method", "S256");
        params.set("origin_host", window.location.host);

        if (dataSourcesCtx?.authRedirectUri) {
          params.set("redirect_uri", dataSourcesCtx.authRedirectUri);
        }

        if (window.__PLASMIC_AUTH_OVERRIDE) {
          window.__PLASMIC_AUTH_OVERRIDE();
        } else {
          const url = \`${getPublicUrl()}/authorize?\${params.toString()}\`;
          window.location.assign(url);
        }
      }`,
    },
    logout: {
      parameters: {},
      function: `async ({ continueTo }) => {
        try {
          localStorage.removeItem("plasmic_user");
          localStorage.removeItem("$user.${siteCtx.projectId}");
        } catch(e) {}

        if (window.__PLASMIC_AUTH_OVERRIDE) {
          window.__PLASMIC_AUTH_OVERRIDE();
        } else {
          window.location.assign(continueTo || window.location.href);
        }
      }`,
    },
    navigation: {
      parameters: {},
      function: `({ destination }) => {
        if (typeof destination === "string" && destination.startsWith("#")) {
          document.getElementById(destination.substr(1)).scrollIntoView({ behavior: "smooth" });
        } else {
          ${
            siteCtx.platform === "nextjs"
              ? "__nextRouter?.push"
              : siteCtx.platform === "gatsby"
              ? "__gatsbyNavigate"
              : "location.assign"
          }(destination);
        }
      }`,
    },
    invokeRefAction: {
      parameters: {
        tplRef: {
          onSerializeArg: (arg) => {
            if (isKnownTplRef(arg) && Tpls.isTplNamable(arg.tpl)) {
              return codeLit(toVarName(arg.tpl.name ?? ""));
            } else {
              return arg;
            }
          },
        },
      },
      function: (args) => {
        const argsArg = args.find((arg) => arg.name === "args");
        const argsExpr = argsArg?.expr;
        if (isKnownCollectionExpr(argsExpr)) {
          for (const expr of argsExpr.exprs) {
            if (expr) {
              assert(
                isKnownFunctionArg(expr),
                "exprs for ref action should be of type FunctionArg"
              );
            }
          }
        }
        return `({tplRef, action, args}) => {
          return $refs?.[tplRef]?.[action]?.(...(args ?? []));
        }`;
      },
    },
  } as Record<string, ACTION_TYPE<any>>);

export const serializeActionArg = (
  component: Component,
  actionName: string,
  parameterName: string,
  value: Expr
) => {
  const action = ACTIONS[actionName];
  if (action) {
    const serializeArg = action.parameters[parameterName]?.onSerializeArg;
    if (serializeArg) {
      return serializeArg(value, component);
    } else {
      return value;
    }
  } else {
    assert(
      actionName.includes("."),
      `didn't find an action named ${actionName}`
    );
    return value;
  }
};

export const isGlobalAction = (interaction: Interaction) =>
  !ACTIONS[interaction.actionName] && interaction.actionName.includes(".");

export const serializeActionFunction = (interaction: Interaction) => {
  const actionName = interaction.actionName;
  const action = ACTIONS[actionName];
  if (action) {
    return typeof action.function === "function"
      ? action.function(interaction.args)
      : action.function;
  } else {
    assert(
      isGlobalAction(interaction),
      `didn't find an action named ${actionName}`
    );
    const [contextName, contextActionName] = actionName.split(".");
    return `$globalActions["${contextName}.${contextActionName}"]`;
  }
};

/**
 * The initial value for writable states works similarly to virtual slots.
 * If some value is set for the tpl component arg, we use it. Otherwise,
 * we reference the value set in the original component.
 * Special case: If the state is implicit implicit, it can have different intial values
 * for different variants. In this case, we reference the base variant initial value.
 **/
export const getVirtualWritableStateInitialValue = (
  state: State
): Expr | undefined => {
  if (state.tplNode) {
    // is a implicit implicit state, so the initial value is saved in tpl component arg.
    const baseVs = tryGetBaseVariantSetting(state.tplNode);
    if (isKnownTplTag(state.tplNode)) {
      return baseVs?.attrs[toVarName(ensureKnownNamedState(state).name)];
    } else {
      const maybeArg = baseVs?.args.find(
        (arg) => arg.param === state.implicitState?.param
      );
      return maybeArg
        ? maybeArg.expr
        : getVirtualWritableStateInitialValue(
            ensure(
              state.implicitState,
              "state referencing a tplNode should also have an implicit state"
            )
          );
    }
  } else {
    return state.param.defaultExpr ?? undefined;
  }
};

/**
 * Used to make a `Value` state for `input` and `textarea` tags.
 */
export function mkValueStateForTextInput(
  tplNode: TplTag,
  owner: Component,
  tplMgr: TplMgr
) {
  const { valueParam, onChangeParam } = Lang.mkParamsForState({
    name: `${tplNode.name} Value`,
    variableType: "text",
    accessType: "private",
    onChangeProp: tplMgr.getUniqueParamName(
      owner,
      genOnChangeParamName(`${tplNode.name} Value`)
    ),
  });
  const state = mkNamedState({
    name: "Value",
    param: valueParam,
    tplNode,
    onChangeParam,
  });
  writeable(state.param).state = state;
  writeable(onChangeParam).state = state;
  return state;
}

export const extractLit = (
  param: Param,
  expr: Expr | null | undefined = param.defaultExpr
) => {
  if (!expr) {
    return undefined;
  }
  if (isKnownPageHref(expr)) {
    return expr;
  }
  if (isKnownImageAssetRef(expr)) {
    return expr.asset;
  }
  return tryExtractLit(expr);
};

export function findKeyForEventHandler(
  component: Component,
  expr: EventHandler
) {
  const { eventHandlerKey } =
    Tpls.flattenTpls(component.tplTree)
      .flatMap((tpl) => Tpls.getAllEventHandlersForTpl(component, tpl))
      .find(
        ({ expr: expr2 }) =>
          expr2 === expr ||
          (expr2 && isFallbackSet(expr2) && expr2.fallback === expr2)
      ) ?? {};
  if (eventHandlerKey) {
    return eventHandlerKey;
  }
  const param = component.params.find((iparam) => iparam.defaultExpr === expr);
  assert(param, "event handler expr not found");
  return { param };
}

export function mkInteraction(
  eventHandler: EventHandler,
  actionName: string,
  interactionName: string,
  args: Record<string, Expr>
) {
  return new Interaction({
    interactionName: uniqueName(
      eventHandler.interactions.map((it) => it.interactionName),
      interactionName
    ),
    actionName,
    condExpr: null,
    conditionalMode: InteractionConditionalMode.Always,
    args: Object.entries(args).map(([name, expr]) =>
      Lang.mkNameArg({
        name,
        expr,
      })
    ),
    parent: eventHandler,
    uuid: mkShortId(),
  });
}

export const extractEventArgsNameFromEventHandler = (
  expr: EventHandler,
  exprCtx: ExprCtx
) => {
  if (isKnownGenericEventHandler(expr)) {
    return expr.handlerType.params.map((p) => `${p.argName}`);
  } else if (exprCtx.component) {
    const eventHandlerKey = findKeyForEventHandler(exprCtx.component, expr);
    if (Tpls.isEventHandlerKeyForParam(eventHandlerKey)) {
      return ensureKnownFunctionType(eventHandlerKey.param.type).params.map(
        (p) => `${p.argName}`
      );
    }
  }
  return ["event"];
};
