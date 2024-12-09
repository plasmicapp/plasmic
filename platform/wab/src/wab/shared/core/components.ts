import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { removeFromArray } from "@/wab/commons/collections";
import { DeepReadonly } from "@/wab/commons/types";
import { removeVariantGroupFromArenas } from "@/wab/shared/Arenas";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import {
  cloneSlotDefaultContents,
  getTplSlot,
  getTplSlots,
  isSlot,
} from "@/wab/shared/SlotUtils";
import { TplMgr, setTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantCombo,
  ensureBaseRuleVariantSetting,
  ensureVariantSetting,
  getBaseVariant,
  getReferencedVariantGroups,
  isBaseVariant,
  isCodeComponentVariant,
  isComponentStyleVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isPseudoElementVariant,
  isStyleOrCodeComponentVariant,
  isVariantSettingEmpty,
  mkBaseVariant,
  mkComponentVariantGroup,
  mkGlobalVariantGroup,
  mkVariant,
  mkVariantSetting,
  splitVariantCombo,
} from "@/wab/shared/Variants";
import {
  findAllDataSourceOpExprForComponent,
  findAllQueryInvalidationExprForComponent,
} from "@/wab/shared/cached-selectors";
import { isBuiltinCodeComponent } from "@/wab/shared/code-components/builtin-code-components";
import {
  CodeComponentWithHelpers,
  isCodeComponentWithHelpers,
  makePlumeComponentMeta,
} from "@/wab/shared/code-components/code-components";
import {
  paramToVarName,
  toClassName,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  arrayEqIgnoreOrder,
  assert,
  assertNever,
  checkDistinct,
  ensure,
  ensureInstance,
  filterFalsy,
  insert,
  mergeMaps,
  mkShortId,
  strictZip,
  switchType,
  tuple,
} from "@/wab/shared/common";
import { clone as cloneExpr, isRealCodeExpr } from "@/wab/shared/core/exprs";
import * as Lang from "@/wab/shared/core/lang";
import { cloneParamAndVar } from "@/wab/shared/core/lang";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  UNINITIALIZED_VALUE,
  isHostLessPackage,
  writeable,
} from "@/wab/shared/core/sites";
import { removeVariantGroupFromSplits } from "@/wab/shared/core/splits";
import {
  DATA_SOURCE_ACTIONS,
  LOGIN_ACTIONS,
  genOnChangeParamName,
  isOnChangeParam,
  mkState,
  removeComponentStateOnly,
} from "@/wab/shared/core/states";
import { EXTRACT_COMPONENT_PROPS } from "@/wab/shared/core/style-props";
import { cloneRuleSet, mkRuleSet } from "@/wab/shared/core/styles";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  findExprsInNode,
  findVariantSettingsUnderTpl,
  flattenTpls,
  getAllEventHandlersForTpl,
  isTplComponent,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import { DEVFLAGS, HostLessPackageInfo } from "@/wab/shared/devflags";
import {
  EffectiveVariantSetting,
  getEffectiveVariantSetting,
  getTplComponentActiveVariants,
} from "@/wab/shared/effective-variant-setting";
import { CanvasEnv } from "@/wab/shared/eval";
import {
  ParsedExprInfo,
  mergeParsedExprInfos,
  parseExpr,
} from "@/wab/shared/eval/expression-parser";
import {
  getFolderDisplayName,
  getFolderTrimmed,
} from "@/wab/shared/folders/folders-util";
import { ensureComponentsObserved } from "@/wab/shared/mobx-util";
import {
  ArenaFrame,
  Arg,
  CodeComponentHelper,
  CodeComponentMeta,
  CodeComponentVariantMeta,
  Component,
  ComponentDataQuery,
  ComponentParams,
  ComponentTemplateInfo,
  ComponentVariantGroup,
  DataSourceOpExpr,
  Expr,
  FigmaComponentMapping,
  GlobalVariantGroup,
  GlobalVariantGroupParam,
  NameArg,
  NamedState,
  ObjectPath,
  PageMeta,
  PageMetaParams,
  Param,
  PlumeInfo,
  PropParam,
  QueryRef,
  RenderExpr,
  Rep,
  Site,
  SlotParam,
  State,
  StateChangeHandlerParam,
  StateParam,
  TplComponent,
  TplNode,
  TplTag,
  Type,
  Var,
  VarRef,
  Variant,
  VariantGroup,
  VariantGroupState,
  VariantsRef,
  ensureKnownArgType,
  ensureKnownSlotParam,
  ensureKnownStateParam,
  ensureKnownTplComponent,
  ensureKnownVariantGroup,
  ensureKnownVariantGroupState,
  isKnownArgType,
  isKnownComponentVariantGroup,
  isKnownEventHandler,
  isKnownFunctionArg,
  isKnownFunctionType,
  isKnownNamedState,
  isKnownPageHref,
  isKnownRenderExpr,
  isKnownStateChangeHandlerParam,
  isKnownStateParam,
  isKnownStrongFunctionArg,
  isKnownTplRef,
  isKnownVarRef,
  isKnownVariantGroupState,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  replaceQueryWithPropInCodeExprs,
  replaceStateWithPropInCodeExprs,
  replaceVarWithPropInCodeExprs,
} from "@/wab/shared/refactoring";
import { naturalSort } from "@/wab/shared/sort";
import { smartHumanize } from "@/wab/shared/strs";
import {
  TplVisibility,
  clearTplVisibility,
  getEffectiveTplVisibility,
  hasVisibilitySetting,
  setTplVisibility,
} from "@/wab/shared/visibility-utils";
import { CodeComponentMeta as ComponentRegistration } from "@plasmicapp/host/registerComponent";
import L, { cloneDeep, uniq } from "lodash";
import memoizeOne from "memoize-one";

export enum ComponentType {
  Plain = "plain",
  Page = "page",
  Code = "code",
  Frame = "frame",
}

export interface PageComponent extends Component {
  type: ComponentType.Page;
  pageMeta: PageMeta;
}

export interface CodeComponent extends Component {
  type: ComponentType.Code;
  codeComponentMeta: CodeComponentMeta;
  _meta?: ComponentRegistration<any> /* Unset when DEVFLAGS.ccStubs is set */;
}

export function groupComponents(components: Component[]) {
  return {
    components: components.filter((it) => !isPageComponent(it) && it.name),
    pages: components.filter((it) => isPageComponent(it)),
  };
}

export const defaultComponentKinds = {
  button: "Button",
  checkbox: "Checkbox",
  "checkbox-group": "Checkbox Group",
  combobox: "Combobox",
  drawer: "Drawer",
  modal: "Modal",
  popover: "Popover",
  radio: "Radio",
  "radio-group": "Radio Group",
  "range-slider": "Range Slider",
  select: "Select",
  slider: "Slider",
  switch: "Switch",
  tooltip: "Tooltip",
  "text-input": "Text Input",
  unauthorized: "Unauthorized",
};

export type DefaultComponentKind = keyof typeof defaultComponentKinds;

export const isDefaultComponentKind = (
  kind: string
): kind is DefaultComponentKind => kind in defaultComponentKinds;

export const asDefaultComponentKind = (kind: string): DefaultComponentKind => {
  assert(isDefaultComponentKind(kind), "Expecting a default component kind");
  return kind;
};

export const getDefaultComponentLabel = (kind: string) =>
  defaultComponentKinds[kind] ?? kind;

export const getDefaultComponentKind = (site: Site, component: Component) =>
  Object.entries(site.defaultComponents).find(
    ([_kind, c]) => c === component
  )?.[0];

export const isDefaultComponent = (site: Site, component: Component) =>
  getDefaultComponentKind(site, component) !== undefined;

/**
 * This low-level utility requires all the same props as the Component() ctor to
 * ensure (say) clonComponent is explicitly passing everything in, but still
 * performs some bookkeeping common to mkComponent and cloneComponent.
 */
function mkRawComponent(props: Omit<ComponentParams, "uuid">) {
  const { superComp } = props;
  const component = new Component({ uuid: mkShortId(), ...props });
  Tpls.trackComponentRoot(component);
  if (superComp) {
    superComp.subComps.push(component);
  }
  return component;
}

/**
 * If variants includes the base variant, it must be at index 0.  If it doesn't
 * include the base variant, a base variant will be automatically inserted at
 * index 0.
 *
 * If there's no tplTree/body, then it's treated as a foreign component
 */
export function mkComponent(obj: {
  name?: string;
  params?: ReadonlyArray<Param>;
  tplTree: TplNode | ((base: Variant) => TplNode);
  variants?: Variant[];
  variantGroups?: Array<ComponentVariantGroup>;
  pageMeta?: PageMeta | null;
  codeComponentMeta?: CodeComponentMeta | null;
  type: ComponentType;
  superComp?: Component;
  plumeInfo?: PlumeInfo | null;
  templateInfo?: ComponentTemplateInfo | null;
  states?: State[];
  figmaMappings?: FigmaComponentMapping[];
  alwaysAutoName?: boolean;
  trapsFocus?: boolean;
}): Component {
  const {
    name = null,
    params = [],
    variants = [],
    variantGroups = [],
    pageMeta = null,
    codeComponentMeta = null,
    type = ComponentType.Plain,
    superComp = null,
    plumeInfo = null,
    templateInfo = null,
    states = [],
  } = obj;
  let baseVariant = variants.find((v) => isBaseVariant(v));
  if (!baseVariant) {
    baseVariant = mkBaseVariant();
    insert(variants, 0, baseVariant);
  }
  const tplTree = L.isFunction(obj.tplTree)
    ? obj.tplTree(baseVariant)
    : obj.tplTree;
  const component = mkRawComponent({
    name: name ?? "UnnamedComponent",
    params: (() => {
      checkDistinct(params.map((p: /*TWZ*/ Param) => p.variable.name));
      return params.slice();
    })(),
    tplTree,
    variants,
    variantGroups,
    pageMeta,
    codeComponentMeta,
    type,
    editableByContentEditor: type !== ComponentType.Plain,
    hiddenFromContentEditor: false,
    superComp,
    subComps: [],
    plumeInfo,
    templateInfo,
    metadata: {},
    states,
    dataQueries: [],
    figmaMappings: obj.figmaMappings ?? [],
    alwaysAutoName: obj.alwaysAutoName ?? false,
    trapsFocus: obj.trapsFocus ?? false,
  });
  return component;
}

export function mkPageMeta(obj: Partial<PageMetaParams>): PageMeta {
  const {
    path = "",
    params = {},
    query = {},
    title = null,
    description = "",
    openGraphImage = null,
    canonical = null,
    roleId = null,
  } = obj;
  return new PageMeta({
    path,
    params,
    query,
    title,
    description,
    openGraphImage,
    canonical,
    roleId,
  });
}

function extractStyleRulesAndDataSettings(
  tpl: TplTag | TplComponent,
  props: string[]
) {
  return tpl.vsettings.map((srcVs) => {
    const dstVs = mkVariantSetting({ variants: [...srcVs.variants] });
    L.assignIn(dstVs, Tpls.cloneDataSettings(srcVs));
    dstVs.rs = mkRuleSet({});
    const src = RSH(srcVs.rs, tpl);
    const dst = RSH(dstVs.rs, tpl);
    dst.merge(
      Object.fromEntries(
        // don't create default positioning styles, which may override the
        // settings in the base variant.
        props
          .filter((prop) => src.has(prop))
          .map((prop) => tuple(prop, src.get(prop)))
      )
    );
    return dstVs;
  });
}

export function cloneComponentVariants(component: Component) {
  const oldToNewVariants = new Map<Variant, Variant>();
  const oldToNewVariantGroups = new Map<
    ComponentVariantGroup,
    ComponentVariantGroup
  >();
  for (const oldVariant of component.variants) {
    const newVariant = cloneVariant(oldVariant);
    oldToNewVariants.set(oldVariant, newVariant);
  }

  for (const oldGroup of component.variantGroups) {
    const newGroup = cloneVariantGroup(oldGroup);
    oldToNewVariantGroups.set(oldGroup, newGroup);
    for (const [oldVariant, newVariant] of strictZip(
      oldGroup.variants,
      newGroup.variants
    )) {
      oldToNewVariants.set(oldVariant, newVariant);
    }
  }

  return {
    oldToNewVariants,
    oldToNewVariantGroups,
  };
}

export interface ComponentCloneResult {
  component: Component;
  oldComponent: Component;
  oldToNewVariant: Map<Variant, Variant>;
  oldToNewVar: Map<Var, Var>;
  oldToNewParam: Map<Param, Param>;
  oldToNewState: Map<State, State>;
  subCompResults: ComponentCloneResult[];
  oldToNewTpls: Map<TplNode, TplNode>;
  oldToNewComponentQuery: Map<ComponentDataQuery, ComponentDataQuery>;
}

export function cloneCodeComponentHelpers(
  codeHelpers: CodeComponentHelper | null | undefined
) {
  return codeHelpers
    ? new CodeComponentHelper({
        importName: codeHelpers.importName,
        importPath: codeHelpers.importPath,
        defaultExport: codeHelpers.defaultExport,
      })
    : null;
}

export function cloneCodeComponentVariantMeta(variantMeta: {
  [key: string]: CodeComponentVariantMeta;
}) {
  return Object.fromEntries(
    Object.entries(variantMeta).map(([selector, meta]) => [
      selector,
      new CodeComponentVariantMeta({
        cssSelector: meta.cssSelector,
        displayName: meta.displayName,
      }),
    ])
  );
}

export function cloneCodeComponentMeta(
  codeMeta: CodeComponentMeta | null | undefined
) {
  return codeMeta
    ? new CodeComponentMeta({
        defaultExport: codeMeta.defaultExport,
        importPath: codeMeta.importPath,
        classNameProp: codeMeta.classNameProp,
        refProp: codeMeta.refProp,
        displayName: codeMeta.displayName,
        importName: codeMeta.importName,
        description: codeMeta.description,
        section: codeMeta.section,
        thumbnailUrl: codeMeta.thumbnailUrl,
        defaultStyles:
          codeMeta.defaultStyles && cloneRuleSet(codeMeta.defaultStyles),
        defaultDisplay: codeMeta.defaultDisplay,
        isHostLess: codeMeta.isHostLess,
        isContext: codeMeta.isContext,
        isAttachment: codeMeta.isAttachment,
        providesData: codeMeta.providesData,
        isRepeatable: codeMeta.isRepeatable,
        hasRef: codeMeta.hasRef,
        styleSections: codeMeta.styleSections,
        helpers: cloneCodeComponentHelpers(codeMeta.helpers),
        defaultSlotContents: cloneDeep(codeMeta.defaultSlotContents),
        variants: cloneCodeComponentVariantMeta(codeMeta.variants),
      })
    : null;
}

export function clonePageMeta<T extends PageMeta | null | undefined>(
  pageMeta: T
): T {
  return pageMeta
    ? (new PageMeta({
        path: pageMeta.path,
        params: pageMeta.params,
        query: pageMeta.query,
        title: pageMeta.title,
        description: pageMeta.description,
        openGraphImage: pageMeta.openGraphImage,
        canonical: pageMeta.canonical,
        roleId: pageMeta.roleId,
      }) as T)
    : pageMeta;
}

export function cloneComponentDataQuery(query: ComponentDataQuery) {
  const cloned = new ComponentDataQuery({
    uuid: mkShortId(),
    name: query.name,
    op: query.op ? (cloneExpr(query.op) as DataSourceOpExpr) : query.op,
  });
  if (cloned.op) {
    cloned.op.parent = new QueryRef({ ref: cloned });
  }
  return cloned;
}

export function cloneQueryRef(queryRef: QueryRef) {
  return new QueryRef({ ref: queryRef.ref });
}

export function clonePlumeInfo(info: PlumeInfo | null | undefined) {
  return info
    ? new PlumeInfo({
        type: info.type,
      })
    : null;
}

export function cloneTemplateInfo(
  info: ComponentTemplateInfo | null | undefined
) {
  return info
    ? new ComponentTemplateInfo({
        name: info.name,
        projectId: info.projectId,
        componentId: info.componentId,
      })
    : null;
}

/**
 * Fixes an arg that belongs to a TplComponent, whose TplComponent.component
 * is oldComponent.  Replaces references to oldComponent parts with new
 * component parts
 */
export function fixArgForCloneComponent(
  arg: Arg,
  oldComponent: Component,
  oldToNewVariant: Map<Variant, Variant>,
  oldToNewParam: Map<Param, Param>
) {
  // If this is an arg referencing the old component's variants, switch
  // to referencing new component's variants
  const r = tryGetVariantGroupValueFromArg(oldComponent, arg);
  if (r instanceof VariantGroupArg && !isRealCodeExpr(arg.expr)) {
    const newVariants = r.variants.map((v) =>
      ensure(oldToNewVariant.get(v), "All variants should be mapped")
    );
    arg.expr = mkVariantGroupArgExpr(newVariants);
  }

  // Switch to referencing new components' params
  arg.param = ensure(oldToNewParam.get(arg.param), "Param should be mapped");

  // We shouldn't need to fix if arg.expr is VarRef, because VarRef is always
  // referencing vars of component enclosing the TplComponent, not
  // TplComponent.component
}

export function cloneNameArg(nameArg: NameArg) {
  return new NameArg({
    name: nameArg.name,
    expr: cloneExpr(nameArg.expr),
  });
}
export function cloneState(state: State) {
  const commonProps = {
    param: cloneParamAndVar(state.param),
    accessType: state.accessType,
    onChangeParam: cloneParamAndVar(state.onChangeParam),
    tplNode: state.tplNode,
    implicitState: state.implicitState,
    variableType: state.variableType,
  };
  if (isKnownNamedState(state)) {
    return new NamedState({
      ...commonProps,
      name: state.name,
      variableType: state.variableType,
    });
  } else if (isKnownVariantGroupState(state)) {
    return new VariantGroupState({
      ...commonProps,
      variantGroup: UNINITIALIZED_VALUE,
    });
  } else {
    return new State({
      ...commonProps,
    });
  }
}

export function cloneComponent(
  fromComponent: Component,
  name: string,
  superInfo?: {
    superComp: Component;
    oldToNewSuperVariants: Map<Variant, Variant>;
  }
): ComponentCloneResult {
  if (fromComponent.superComp) {
    assert(
      superInfo,
      `Expected oldToNewSuperVariants mapping for a sub-component`
    );
  }

  const oldToNewVar = new Map<Var, Var>();
  const oldToNewParam = new Map<Param, Param>();
  const oldToNewType = new Map<Type, Type>();

  const findTypes = (type: Type) => {
    let innerTypes: Type[] = [];
    if (isKnownFunctionType(type)) {
      innerTypes = type.params.flatMap((t) => findTypes(t));
    } else if (isKnownArgType(type)) {
      innerTypes = findTypes(type.type);
    }
    return [type, ...innerTypes];
  };

  fromComponent.params.forEach((p) => {
    const newParam = cloneParamAndVar(p);
    oldToNewParam.set(p, newParam);
    oldToNewVar.set(p.variable, newParam.variable);
    const oldTypes = findTypes(p.type);
    const newTypes = findTypes(newParam.type);
    ensure(
      oldTypes.length === newTypes.length,
      "Every old type should be mapped to a new type"
    );
    strictZip(oldTypes, newTypes).forEach(([oldType, newType]) =>
      oldToNewType.set(oldType, newType)
    );
  });

  const { oldToNewVariants, oldToNewVariantGroups } =
    cloneComponentVariants(fromComponent);
  const oldToNewState = new Map<State, State>();
  for (const state of fromComponent.states) {
    oldToNewState.set(state, cloneState(state));
  }

  // Clone tpl tree.
  const newTplTree = Tpls.clone(fromComponent.tplTree);
  const oldTpls = flattenTpls(fromComponent.tplTree);
  const newTpls = flattenTpls(newTplTree);
  const oldToNewTpls = new Map(strictZip(oldTpls, newTpls));

  // Fix params and tplNodes in states.
  for (const [oldState, newState] of oldToNewState.entries()) {
    writeable(newState).param = ensureKnownStateParam(
      oldToNewParam.get(oldState.param)
    );
    writeable(newState.param).state = newState;
    const onChangeParam = ensureInstance(
      oldToNewParam.get(oldState.onChangeParam),
      PropParam,
      StateChangeHandlerParam
    );
    writeable(newState).onChangeParam = onChangeParam;
    if (isKnownStateChangeHandlerParam(onChangeParam)) {
      writeable(onChangeParam).state = newState;
    }
    if (oldState.tplNode) {
      newState.tplNode = ensure(
        oldToNewTpls.get(oldState.tplNode) as any,
        "All tpl nodes should be mapped"
      );
    }
  }

  // Fix params and states in variant groups.
  for (const [oldVg, newVg] of oldToNewVariantGroups.entries()) {
    writeable(newVg).param = ensureKnownStateParam(
      oldToNewParam.get(oldVg.param)
    );
    const state = ensureKnownVariantGroupState(
      oldToNewState.get(oldVg.linkedState)
    );
    writeable(newVg).linkedState = state;
    writeable(state).variantGroup = newVg;
  }

  const oldToNewComponentQuery = new Map<
    ComponentDataQuery,
    ComponentDataQuery
  >();

  const component = mkRawComponent({
    name,
    params: [...oldToNewParam.values()],
    tplTree: newTplTree,
    variants: fromComponent.variants.map((v) =>
      ensure(oldToNewVariants.get(v), "All variants should be mapped")
    ),
    variantGroups: [...oldToNewVariantGroups.values()],
    pageMeta: clonePageMeta(fromComponent.pageMeta),
    type: fromComponent.type as ComponentType,
    editableByContentEditor: fromComponent.editableByContentEditor,
    hiddenFromContentEditor: fromComponent.hiddenFromContentEditor,
    codeComponentMeta: cloneCodeComponentMeta(fromComponent.codeComponentMeta),
    superComp: superInfo?.superComp,
    plumeInfo: clonePlumeInfo(fromComponent.plumeInfo),
    templateInfo: cloneTemplateInfo(fromComponent.templateInfo),
    // Explicitly leaving out subComps till later
    subComps: [],
    metadata: { ...fromComponent.metadata },
    states: [...oldToNewState.values()],
    dataQueries: fromComponent.dataQueries.map((componentDataQuery) => {
      const cloned = cloneComponentDataQuery(componentDataQuery);
      oldToNewComponentQuery.set(componentDataQuery, cloned);
      return cloned;
    }),
    figmaMappings: fromComponent.figmaMappings.map(
      (c) => new FigmaComponentMapping({ ...c })
    ),
    alwaysAutoName: fromComponent.alwaysAutoName,
    trapsFocus: fromComponent.trapsFocus,
  });

  const fixQueryRef = (ref: QueryRef | string) => {
    if (typeof ref !== "string") {
      const maybeCloned = switchType(ref.ref)
        .when(TplNode, (tpl) => oldToNewTpls.get(tpl))
        .when(ComponentDataQuery, (refQuery) =>
          oldToNewComponentQuery.get(refQuery)
        )
        .result();
      if (maybeCloned) {
        ref.ref = maybeCloned;
      }
    }
  };

  const fixDataOp = (op: DataSourceOpExpr | null | undefined) => {
    op?.queryInvalidation?.invalidationQueries.forEach((ref) => {
      fixQueryRef(ref);
    });

    if (op?.parent) {
      fixQueryRef(op.parent);
    }
  };

  findAllDataSourceOpExprForComponent(component).forEach((op) => fixDataOp(op));
  findAllQueryInvalidationExprForComponent(component).forEach(
    (queryInvalidation) => {
      queryInvalidation.invalidationQueries.forEach((ref) => {
        fixQueryRef(ref);
      });
    }
  );

  const getNewVariant = (variant: Variant) => {
    if (isGlobalVariant(variant)) {
      return variant;
    } else if (oldToNewVariants.has(variant)) {
      return ensure(oldToNewVariants.get(variant), "Checked before");
    } else if (superInfo && superInfo.oldToNewSuperVariants.has(variant)) {
      return ensure(
        superInfo.oldToNewSuperVariants.get(variant),
        "Checked before"
      );
    } else {
      return variant;
    }
  };

  const fixExprRefs = (expr: Expr) => {
    if (isKnownVarRef(expr)) {
      // Try to fix VarRef. It may not be possible to fix it now because it
      // can reference a variable of another component.
      expr.variable = oldToNewVar.get(expr.variable) ?? expr.variable;
    } else if (isKnownVariantsRef(expr)) {
      expr.variants = expr.variants.map((v) => getNewVariant(v));
    } else if (isKnownPageHref(expr)) {
      for (const paramExpr of Object.values(expr.params)) {
        fixExprRefs(paramExpr);
      }
    } else if (isKnownFunctionArg(expr) && !isKnownStrongFunctionArg(expr)) {
      expr.argType = ensureKnownArgType(
        ensure(oldToNewType.get(expr.argType), "All arg types should be mapped")
      );
    } else if (isKnownTplRef(expr)) {
      expr.tpl = ensure(
        oldToNewTpls.get(expr.tpl),
        "All tpls should be mapped"
      );
    }
  };

  // now fix all param references to point to the new param.
  // First, fix the references in VariantSettings
  const vsAndTpls = [...findVariantSettingsUnderTpl(newTplTree)];
  for (const [vs, tpl] of vsAndTpls) {
    // Fix the variants
    vs.variants = vs.variants.map((v) => getNewVariant(v));

    for (const variant of vs.variants) {
      if (isPrivateStyleVariant(variant)) {
        // Fix up the private style variant pointer to point to the new tpl
        variant.forTpl = tpl;
      }
    }
  }

  // take the opportunity to prune obsolete style variants
  const tplsSet = new Set(flattenTpls(newTplTree));
  component.variants = component.variants.filter(
    (v) =>
      !isPrivateStyleVariant(v) ||
      tplsSet.has(ensure(v.forTpl, "Variant should have Tpl"))
  );

  // Fix refs in exprs
  for (const tpl of tplsSet) {
    if (isTplVariantable(tpl)) {
      for (const { expr } of findExprsInNode(tpl)) {
        fixExprRefs(expr);
      }
    }
  }

  // fix slot param references
  getTplSlots(component).forEach((tplSlot) => {
    const slotParam = ensureKnownSlotParam(oldToNewParam.get(tplSlot.param));
    writeable(tplSlot).param = slotParam;
    writeable(slotParam).tplSlot = tplSlot;
  });

  const subCompResults: ComponentCloneResult[] = [];
  if (fromComponent.subComps.length > 0) {
    const newSuperInfo = {
      superComp: component,
      oldToNewSuperVariants: mergeMaps(
        oldToNewVariants,
        superInfo?.oldToNewSuperVariants ?? new Map()
      ),
    };
    for (const fromSubComp of fromComponent.subComps) {
      const subCompResult = cloneComponent(
        fromSubComp,
        fromSubComp.name,
        newSuperInfo
      );
      // Don't need to push to component.subComps, as it should be already added
      // by mkComponent()
      subCompResults.push(subCompResult);
    }

    // Now replace all references from all subComponents to each other
    const oldToNewSubCompResults = new Map(
      subCompResults.map((r) => tuple(r.oldComponent, r))
    );
    for (const newRoot of [
      newTplTree,
      ...subCompResults.map((r) => r.component.tplTree),
    ]) {
      for (const tpl of flattenTpls(newRoot)) {
        if (isTplComponent(tpl) && oldToNewSubCompResults.has(tpl.component)) {
          const oldComp = tpl.component;
          const subCompResult = ensure(
            oldToNewSubCompResults.get(tpl.component),
            "All subComponents should be mapped"
          );
          tpl.component = subCompResult.component;
          for (const vs of tpl.vsettings) {
            for (const arg of vs.args) {
              fixArgForCloneComponent(
                arg,
                oldComp,
                subCompResult.oldToNewVariant,
                subCompResult.oldToNewParam
              );
            }
          }
        }
      }
    }
  }

  return {
    component,
    oldComponent: fromComponent,
    oldToNewVariant: oldToNewVariants,
    oldToNewVar,
    oldToNewParam,
    oldToNewState,
    subCompResults,
    oldToNewTpls,
    oldToNewComponentQuery,
  };
}

export function findPropUsages(component: Component, prop: Param) {
  /**
   *
   * - Usage in dynamic value (expressions) via $prop
   * - Usage via Prop linking
   *
   */
  const varName = paramToVarName(component, prop);
  const exprs = Tpls.findExprsInComponent(component).filter((expr) => {
    const parsed = parseExpr(expr.expr);

    // prop linking
    if (expr.expr.typeTag === "VarRef") {
      return expr.expr.variable.uid === prop.variable.uid;
    }

    // The Tpls.findExprsInComponent util returns redundant exprs. E.g. if its a Templated string `${props.test}`, it would return an expr of type ClsTemplateString with items "", (`${props.test}`), "", and 3 CustomCode exprs too for each of these items. Likewise in case of expr of type FunctionExpr
    if (
      expr.expr.typeTag === "TemplatedString" ||
      expr.expr.typeTag === "FunctionExpr"
    ) {
      return false;
    }

    // Usage in dynamic value (expressions) via $prop
    if (
      [...parsed.usedDollarVarKeys.$props].filter(
        (propName) => propName === varName
      ).length > 0
    ) {
      return true;
    }

    // remaining expressions do not use this prop.
    return false;
  });
  return exprs;
}

/**
 * This function is used to iterate through the tpl tree rooted on tpl,
 * parse code expressions and return the used params, queries and vars.
 */
export function findObjectsUsedInExprs(
  component: Component,
  tpl: TplTag | TplComponent
): { params: Param[]; queries: ComponentDataQuery[]; vars: string[] } {
  const infos: ParsedExprInfo[] = [];
  Tpls.flattenTpls(tpl).forEach((node) => {
    if (!Tpls.isTplVariantable(node)) {
      return;
    }

    for (const { expr } of findExprsInNode(node)) {
      infos.push(parseExpr(expr));
    }
  });

  const info = mergeParsedExprInfos(infos);
  const params =
    info.usesUnknownDollarVarKeys.$props || info.usesUnknownDollarVarKeys.$state
      ? component.params
      : uniq(
          filterFalsy(
            [
              ...info.usedDollarVarKeys.$props,
              ...info.usedDollarVarKeys.$state,
            ].map((key) => getParamByVarName(component, key))
          )
        );
  const queries = info.usesUnknownDollarVarKeys.$queries
    ? component.dataQueries
    : uniq(
        filterFalsy(
          [...info.usedDollarVarKeys.$queries].map((key) =>
            getComponentDataQueryByVarName(component, key)
          )
        )
      );

  return { params, queries, vars: [...info.usedFreeVars] };
}

export function extractComponent({
  site,
  name,
  // The component that contains tpl
  containingComponent,
  tpl,

  // If true, then slots and VarRefs found under `tpl` will be params for the new Component
  // _and_ remain params for the `containingComponent`, and `containingComponent`
  // will have its slots "piped through" to the new Component.  If false, the
  // corresponding params and slots will be removed from the `containingComponent`.
  resurfaceParams,
  tplMgr,
  getCanvasEnvForTpl,
}: {
  site: Site;
  name: string;
  tpl: TplTag | TplComponent;
  containingComponent: Component;
  resurfaceParams?: boolean;
  tplMgr: TplMgr;
  getCanvasEnvForTpl: (node: TplNode) => CanvasEnv | undefined;
}) {
  // First, clone the tpl.  After cloning, the Tpl nodes are new, but they are still
  // referencing Variants from the old component.
  const clonedTpl = Tpls.clone(tpl) as TplTag | TplComponent;

  // Always reset dataRep of the new root element
  clonedTpl.vsettings[0].dataRep = null;

  const oldTpls = flattenTpls(tpl);
  const newTpls = flattenTpls(clonedTpl);

  const oldFlattenedVariantables = oldTpls.filter(isTplVariantable);
  const oldFlattenedVariantablesSet = new Set(oldFlattenedVariantables);
  const flattenedVariantables = newTpls.filter(isTplVariantable);
  const oldToNewVariantables = new Map<TplNode, TplNode>(
    strictZip(oldFlattenedVariantables, flattenedVariantables)
  );
  const newToOldVariantables = new Map<TplNode, TplNode>(
    strictZip(flattenedVariantables, oldFlattenedVariantables)
  );

  // Remove empty variant settings, so we don't end up carrying over variants that
  // the extracted component doesn't care about
  for (const _tpl of flattenedVariantables) {
    for (const vs of [..._tpl.vsettings]) {
      if (!isBaseVariant(vs.variants) && isVariantSettingEmpty(vs)) {
        removeFromArray(_tpl.vsettings, vs);
      }
    }
  }

  // But some variant settings are empty but necessary (specifically,
  // "base rule variant settings", so we add them back
  for (const _tpl of flattenedVariantables) {
    for (const vs of [..._tpl.vsettings]) {
      ensureBaseRuleVariantSetting(_tpl, vs.variants, clonedTpl);
    }
  }

  // Clone the variants and variant groups
  const { oldToNewVariants } = cloneComponentVariants(containingComponent);

  // And now, we want to fix up all the VariantSettings in each tpl to point to
  // the new variants instead.
  const vsAndTpls = [...findVariantSettingsUnderTpl(clonedTpl)];
  const oldToNewCombo = (variants: Variant[]) => {
    return variants.map((v) =>
      isGlobalVariant(v)
        ? v
        : ensure(oldToNewVariants.get(v), "All variants should be mapped")
    );
  };
  for (const [vs, _tpl] of vsAndTpls) {
    vs.variants = oldToNewCombo(vs.variants);
    for (const variant of vs.variants) {
      if (isPrivateStyleVariant(variant)) {
        // Also fix up variant.forTpl to reference the new tpl node
        variant.forTpl = _tpl;
      }
    }
  }

  // Some private style variants on the root should now be hoisted
  // up as component-level style variants.
  const rootPrivateVariantsToPromote = L.uniq(
    clonedTpl.vsettings
      .flatMap((vs) => vs.variants)
      .filter((v) => isPrivateStyleVariant(v) && !isPseudoElementVariant(v))
  );
  for (const variant of rootPrivateVariantsToPromote) {
    // If there's already a component-level hover style variant, then
    // we should switch to using that instead, and discard this one
    const eqCompStyleVariant = containingComponent.variants
      .map((v) =>
        ensure(oldToNewVariants.get(v), "All variants should be mapped")
      )
      .find(
        (v) =>
          isComponentStyleVariant(v) &&
          arrayEqIgnoreOrder(
            ensure(v.selectors, "Variant should have selectors"),
            ensure(variant.selectors, "Variant should have selectors")
          )
      );
    if (eqCompStyleVariant) {
      // Replace all references to the private variant to the component one
      clonedTpl.vsettings.forEach(
        (vs) =>
          (vs.variants = L.uniq(
            vs.variants.map((v) => (v === variant ? eqCompStyleVariant : v))
          ))
      );
      // It could've been that this tpl had a VariantSetting that references a
      // component-level Hover, and a private Hover, that are now merged into a
      // component-level Hover (and so we use L.uniq above to avoid having two
      // referencing to component-level Hover).  But now that VariantSetting
      // may collide with another VariantSetting that also references the
      // component-level Hover; suddenly their vs.variants match!  We should smartly
      // merge these two VariantSettings, but for now we're just picking one
      // arbitrarily :-p
      clonedTpl.vsettings = L.uniqBy(clonedTpl.vsettings, (vs) =>
        vs.variants
          .map((v) => v.uuid)
          .sort()
          .join("-")
      );
    } else {
      // Directly promote to non-private
      variant.forTpl = null;
    }
  }

  // Reset sizing and positioning on the new root
  for (const vs of clonedTpl.vsettings) {
    const newRsh = RSH(vs.rs, clonedTpl);

    // We clear all the positioning styles, which should now belong to the TplComponent
    // instead.  We still keep width/height, though, as the root size
    for (const prop of EXTRACT_COMPONENT_PROPS) {
      newRsh.clear(prop);
    }
    if (isBaseVariant(vs.variants)) {
      newRsh.set("position", "relative");
    }
  }

  // Now we are done fixing up the tpl tree!  Let's see what variants we ended up with
  // for the new component.  This will be a subset of the old variants, because the
  // extracted component may not care about all the variants that the containingComponent
  // had.
  const allUsedNewVariants = new Set(
    vsAndTpls.flatMap(([vs, _tpl]) => vs.variants)
  );
  const allUsedNewGroups = [
    ...getReferencedVariantGroups(allUsedNewVariants),
  ].filter(isKnownComponentVariantGroup);

  const variantGroupsParams = allUsedNewGroups.map((g) => g.param);
  const params: Param[] = [...variantGroupsParams];

  // Create linked states for variant groups.
  // TODO: Maybe we want to copy states from the containing component instead.
  const states: State[] = [];
  for (const vg of allUsedNewGroups) {
    const state = mkState({
      param: vg.param,
      variableType: "variant",
      variantGroup: vg,
      onChangeParam: Lang.mkOnChangeParamForState(
        "variant",
        genOnChangeParamName(vg.param.variable.name),
        { privateState: true }
      ),
    });
    states.push(state);
    params.push(state.onChangeParam);
  }

  // Move implicit states of tplNodes in the extracted sub-tree.
  for (const state of [...containingComponent.states]) {
    if (state.tplNode && oldFlattenedVariantablesSet.has(state.tplNode)) {
      state.tplNode = oldToNewVariantables.get(state.tplNode) as any;
      params.push(state.param);
      params.push(state.onChangeParam);
      states.push(state);
      tplMgr.removeState(containingComponent, state);
    }
  }

  // Finally, create the new component!
  const component = mkComponent({
    name,
    params,
    tplTree: clonedTpl,
    variants: containingComponent.variants
      .map((v) =>
        ensure(oldToNewVariants.get(v), "All variants should be mapped")
      )
      .filter((v) => allUsedNewVariants.has(v)),
    variantGroups: allUsedNewGroups,
    type: ComponentType.Plain,
    states,
  });

  // We are done with creating the new component, but now we need to replace
  // the tpl from which we extracted the new component, with a TplComponent
  // that uses the new component.
  const containingBaseVariant = getBaseVariant(containingComponent);
  const tplComponent = Tpls.mkTplComponentX({
    component,
    baseVariant: containingBaseVariant,
  });

  // Hoist position props from the original TplNode to the new TplComponent.
  // This is needed because the component's position has been reset. We need
  // to preserve the position information of the original TplNode being
  // extracted and replaced.
  // This happens after the updates to the components variants so that the
  // tplComponent's VariantSettings overwrites the component's VariantSettings.
  if (isTplVariantable(tpl)) {
    tplComponent.vsettings = extractStyleRulesAndDataSettings(
      tpl,
      EXTRACT_COMPONENT_PROPS
    );
  }

  // Remove all the vsettings that referenced style variants, as they do not
  // get carried over as args we can pass onto the new component
  tplComponent.vsettings = tplComponent.vsettings.filter(
    (vs) => !vs.variants.some(isStyleOrCodeComponentVariant)
  );

  // Remove all width/height on the tplComponent; by default, we will defer
  // size to Component's root size
  tplComponent.vsettings.forEach((vs) => {
    const exp = RSH(vs.rs, tplComponent);
    if (isBaseVariant(vs.variants)) {
      exp.set("width", "default");
      exp.set("height", "default");
    } else {
      exp.clear("width");
      exp.clear("height");
    }
  });

  const newToOldCombo = (variants: Variant[]) => {
    return variants.map((v) =>
      isGlobalVariant(v)
        ? v
        : ensure(
            Array.from(oldToNewVariants.entries()).find(
              ([_, newv]) => newv === v
            ),
            "All variants should be mapped"
          )[0]
    );
  };

  // For each old variant that we carried over into the new component, we'll
  // want to activate those variants accordingly.  For example, say, Outer
  // has variant "type=primary", and this is cloned into Inner. Then for every
  // combo of Outer containing "type=primary", we should have set the TplComponent
  // arg for the new "type=primary".  We don't need to do this for every possible
  // combination though; just the combinations that the user had already
  // specified in the old vsettings.
  const allUsedOldVariantCombo = L.uniqBy(
    [...findVariantSettingsUnderTpl(tpl)].map(([vs, _tpl]) =>
      vs.variants.filter(
        (v) => !isBaseVariant(v) && !isStyleOrCodeComponentVariant(v)
      )
    ),
    (combo) =>
      combo
        .map((v) => v.uuid)
        .sort()
        .join("-")
  );
  // pipe the variant settings for component non style variants
  allUsedOldVariantCombo.forEach((oldVariantCombo) => {
    const localVs = splitVariantCombo(oldVariantCombo)[1];
    const newVariantsToPipe = oldToNewCombo(localVs).filter((v) =>
      allUsedNewVariants.has(v)
    );
    if (newVariantsToPipe.length > 0) {
      const vs = ensureVariantSetting(tplComponent, oldVariantCombo);
      L.values(
        L.groupBy(
          newVariantsToPipe,
          (v) => ensure(v.parent, "Variant should have parent").uuid
        )
      ).forEach((newVariants) => {
        const newVg = ensureKnownVariantGroup(newVariants[0].parent);
        const expr = mkVariantGroupArgExpr(newVariants);
        setTplComponentArg(tplComponent, vs, newVg.param.variable, expr);
      });
    }
  });

  const oldVariantToTplVisibility = new Map<Variant[], TplVisibility>();
  tpl.vsettings.forEach((vs) => {
    if (hasVisibilitySetting(vs)) {
      oldVariantToTplVisibility.set(
        vs.variants,
        getEffectiveTplVisibility(tpl, vs.variants)
      );
    }
  });

  // We just stuff args into the base variant settings for now
  ensureVariantSetting(tplComponent, [containingBaseVariant]).args = [];
  $$$(tpl).replaceWith(tplComponent);

  // Remove private style variants for the old nodes
  allStyleOrCodeComponentVariants(containingComponent).forEach((v) => {
    if (v.forTpl && oldFlattenedVariantablesSet.has(v.forTpl)) {
      tplMgr.tryRemoveVariant(v, containingComponent);
    }
  });

  const paramToParamType = (p: Param): Lang.ParamTypes =>
    switchType(p)
      .when(PropParam, () => Lang.ParamTypes.Prop)
      .when(SlotParam, () => Lang.ParamTypes.Slot)
      .when(StateParam, () => Lang.ParamTypes.State)
      .when(StateChangeHandlerParam, () => Lang.ParamTypes.StateChangeHandler)
      .when(GlobalVariantGroupParam, () => Lang.ParamTypes.GlobalVariantGroup)
      .result();

  const tplSlots = oldTpls.filter(Tpls.isTplSlot);
  if (tplSlots.length > 0) {
    // For each TplSlot that we are extracting in clonedTpl, we need to create the
    // corresponding param for the new Component
    for (const tplSlot of tplSlots) {
      const containingParam = tplSlot.param;
      const slotParam = addSlotParam(
        site,
        component,
        containingParam.variable.name
      );
      writeable(tplSlot).param = slotParam;
      writeable(slotParam).tplSlot = tplSlot;

      if (resurfaceParams) {
        // To resurface, we want to retain the prevParam in containingComponent,
        // but "pipe the data through".  To do this, we create a new TplSlot node
        // for the containing component (which we had replaced), and place it as
        // the arg for the new corresponding Param in the new Component.
        //
        // We also need to add containingParam back to containingComponent,
        // because it was removed when we removed this TplSlot "deeply"

        containingComponent.params.push(containingParam);
        const newContainingComponentSlot = Tpls.mkSlot(
          containingParam,
          cloneSlotDefaultContents(tplSlot, [containingBaseVariant])
        );
        ensureVariantSetting(newContainingComponentSlot, [
          containingBaseVariant,
        ]);
        $$$(tplComponent).setSlotArgForParam(
          tplSlot.param,
          new RenderExpr({
            tpl: [newContainingComponentSlot],
          })
        );
      } else {
        // Otherwise, just remove this param from the containingComponent.
        removeComponentParam(
          Tpls.getOwnerSite(containingComponent),
          containingComponent,
          containingParam
        );
      }
    }
  }

  const jsNamesOfParamsAlreadyExtracted = new Set<string>(
    component.params.map((param) => toVarName(param.variable.name))
  );

  const varRefs = Array.from(findVarRefs(clonedTpl));
  if (varRefs.length > 0) {
    for (const varRef of varRefs) {
      const containingParam = getParamForVar(containingComponent, varRef.var);
      const newParam = (() => {
        if (
          jsNamesOfParamsAlreadyExtracted.has(
            toVarName(containingParam.variable.name)
          )
        ) {
          return ensure(
            component.params.find(
              (p) =>
                toVarName(p.variable.name) ===
                toVarName(containingParam.variable.name)
            ),
            () => `Already checked`
          );
        } else {
          const param = Lang.mkParam({
            name: containingParam.variable.name,
            type: Tpls.cloneType(containingParam.type) as any,
            paramType: paramToParamType(containingParam) as any,
          });
          component.params.push(param);
          jsNamesOfParamsAlreadyExtracted.add(toVarName(param.variable.name));
          return param;
        }
      })();

      // TODO: this clone is safe for literal CustomCode only
      newParam.defaultExpr = containingParam.defaultExpr
        ? cloneExpr(containingParam.defaultExpr)
        : undefined;

      newParam.previewExpr = containingParam.previewExpr
        ? cloneExpr(containingParam.previewExpr)
        : undefined;

      varRef.expr.variable = newParam.variable;
      if (resurfaceParams) {
        // We set the arg for the new TplComponent to reference the containing component's param
        const vs = ensureVariantSetting(
          tplComponent,
          newToOldCombo(varRef.vs.variants)
        );
        vs.args.push(
          new Arg({
            param: newParam,
            expr: new VarRef({ variable: containingParam.variable }),
          })
        );
      } else {
        removeComponentParam(
          Tpls.getOwnerSite(containingComponent),
          containingComponent,
          containingParam
        );
      }
    }
  }

  Tpls.fixTplRefEpxrs(newTpls, oldTpls);

  const {
    params: paramsUsedInExprs,
    vars: varsUsedInExprs,
    queries: queriesUsedInExprs,
  } = findObjectsUsedInExprs(containingComponent, clonedTpl);
  for (const containingParam of paramsUsedInExprs) {
    if (
      jsNamesOfParamsAlreadyExtracted.has(
        toVarName(containingParam.variable.name)
      )
    ) {
      continue;
    }

    const newParamType =
      paramToParamType(containingParam) === Lang.ParamTypes.State
        ? Lang.ParamTypes.Prop
        : paramToParamType(containingParam);

    const newParam = Lang.mkParam({
      name: containingParam.variable.name,
      type: Tpls.cloneType(containingParam.type) as any,
      paramType: newParamType as any,
    });
    component.params.push(newParam);
    jsNamesOfParamsAlreadyExtracted.add(toVarName(newParam.variable.name));

    const isSafeInitialExpr = (expr: Expr) => {
      // Don't accept exprs that references $ variables as initial values
      // since the new component won't have the reference to it.
      const parsedExpr = parseExpr(expr);
      return !Object.entries(parsedExpr.usesDollarVars).some(
        ([_, value]) => value
      );
    };

    // TODO: this clone is safe for literal CustomCode only
    if (
      containingParam.defaultExpr &&
      isSafeInitialExpr(containingParam.defaultExpr)
    ) {
      newParam.defaultExpr = cloneExpr(containingParam.defaultExpr);
    }
    if (
      containingParam.previewExpr &&
      isSafeInitialExpr(containingParam.previewExpr)
    ) {
      newParam.previewExpr = cloneExpr(containingParam.previewExpr);
    }

    // We set the arg for the new TplComponent to reference the containing
    // component's param.
    const vs = ensureVariantSetting(tplComponent, [containingBaseVariant]);
    const newExpr =
      paramToParamType(containingParam) === Lang.ParamTypes.State
        ? new ObjectPath({
            path: ["$state", toVarName(containingParam.variable.name)],
            fallback: undefined,
          })
        : new VarRef({ variable: containingParam.variable });
    vs.args.push(
      new Arg({
        param: newParam,
        expr: newExpr,
      })
    );
    if (isKnownStateParam(containingParam)) {
      replaceStateWithPropInCodeExprs(
        component.tplTree,
        toVarName(containingParam.variable.name),
        toVarName(newParam.variable.name)
      );
    }
  }
  for (const query of queriesUsedInExprs) {
    const newParam = Lang.mkParam({
      name: tplMgr.getUniqueParamName(component, query.name),
      type: typeFactory.any(),
      paramType: "prop",
    });
    component.params.push(newParam);
    jsNamesOfParamsAlreadyExtracted.add(toVarName(newParam.variable.name));
    const vs = ensureVariantSetting(tplComponent, [containingBaseVariant]);
    // Pass $queries.<name> into extracted component $props.<name>.
    vs.args.push(
      new Arg({
        param: newParam,
        expr: new ObjectPath({
          path: ["$queries", toVarName(query.name)],
          fallback: undefined,
        }),
      })
    );
    // Refactor usages of $queries.<name> to $props.<name>.
    replaceQueryWithPropInCodeExprs(
      component.tplTree,
      toVarName(query.name),
      toVarName(newParam.variable.name)
    );
  }

  // Create props for dataRep vars that are being used in tree rooted in tpl.
  // Since tpl was already replaced with tplComponent, we go up the tplComponent tree.
  const reps = filterFalsy(
    Tpls.ancestorsUp(tplComponent).map(
      (t) => isTplVariantable(t) && t.vsettings[0].dataRep
    )
  );
  const dataRepVars = new Set<string>(
    filterFalsy(reps.flatMap((r) => [r.element.name, r.index?.name])).map((v) =>
      toVarName(v)
    )
  );
  for (const varName of varsUsedInExprs) {
    if (!dataRepVars.has(varName)) {
      continue;
    }
    const newParam = Lang.mkParam({
      name: tplMgr.getUniqueParamName(component, varName),
      type: typeFactory.any(),
      paramType: "prop",
    });
    component.params.push(newParam);
    jsNamesOfParamsAlreadyExtracted.add(toVarName(newParam.variable.name));
    tplComponent.vsettings[0].args.push(
      new Arg({
        param: newParam,
        expr: new ObjectPath({
          path: [varName],
          fallback: undefined,
        }),
      })
    );
    replaceVarWithPropInCodeExprs(
      component.tplTree,
      varName,
      toVarName(newParam.variable.name)
    );
  }

  Tpls.addFallbacksToCodeExpressions(
    getCanvasEnvForTpl,
    <T extends TplNode>(_tpl: T): T => {
      return ensure(
        newToOldVariantables.get(_tpl),
        "Given node should exist in newToOldVariantables map"
      ) as T;
    },
    clonedTpl
  );

  // Fix tpl visibility in the containing component
  const tplVisibility = getEffectiveTplVisibility(tpl, [containingBaseVariant]);
  if (tplVisibility !== TplVisibility.Visible) {
    //make sure the root of the base variant is visible
    clearTplVisibility(component.tplTree as TplNode, [
      getBaseVariant(component),
    ]);

    oldVariantToTplVisibility.forEach(
      (_tplVisibility: TplVisibility, variants: Variant[]) => {
        setTplVisibility(tplComponent, variants, _tplVisibility);
      }
    );
  }

  return tplComponent;
}

export function isHostLessCodeComponent(component: Component) {
  // The check for isBuiltinCodeComponent() is required while we don't run a
  // migration to ensure that isHostLess is true for all builtin code
  // components.
  return (
    isCodeComponent(component) &&
    (component.codeComponentMeta.isHostLess ||
      isBuiltinCodeComponent(component))
  );
}

const hostLessComponentMap = memoizeOne(
  (hostLessComponentsMeta: HostLessPackageInfo[]) =>
    new Map(
      hostLessComponentsMeta.flatMap((pkg) =>
        pkg.items.map((component) => tuple(component.componentName, component))
      )
    )
);

export function isShownHostLessCodeComponent(
  component: Component,
  hostLessComponentsMeta: HostLessPackageInfo[] | undefined
) {
  return (
    isHostLessCodeComponent(component) &&
    !isBuiltinCodeComponent(component) &&
    (DEVFLAGS.showHiddenHostLessComponents ||
      !hostLessComponentsMeta ||
      // If the component is not listed in the devflag configs, then we *do* show it.
      // This is because there can be many subcomponents that don't have a store listing, but are shown.
      // For now, if you want to hide a component before release, then you need to explicitly add an entry to the devflag config!
      // If the component is not explicitly marked hidden, then show it.
      !hostLessComponentMap(hostLessComponentsMeta).get(component.name)?.hidden)
  );
}

export function isCodeComponent(
  component: Component
): component is CodeComponent {
  return component.type === ComponentType.Code;
}

export function isCodeComponentTpl(tpl: TplNode): tpl is TplComponent {
  return isTplComponent(tpl) && isCodeComponent(tpl.component);
}

export interface ContextCodeComponent extends CodeComponent {
  isContext: true;
}

export function isContextCodeComponent(
  component: Component
): component is ContextCodeComponent {
  return isCodeComponent(component) && component.codeComponentMeta.isContext;
}

export function isPageComponent(
  component: Component
): component is PageComponent {
  return component.type === ComponentType.Page;
}

export function isPlainComponent(component: Component) {
  return component.type === ComponentType.Plain;
}

export function cloneVariant(variant: Variant) {
  const newV = mkVariant({
    name: variant.name,
    selectors: variant.selectors ? variant.selectors.slice(0) : undefined,
    parent: variant.parent || undefined,
    mediaQuery: variant.mediaQuery,
    description: variant.description,
    forTpl: variant.forTpl,
    codeComponentName: variant.codeComponentName,
    codeComponentVariantKeys: variant.codeComponentVariantKeys,
  });
  return newV;
}

export function cloneVariantGroup(
  g: ComponentVariantGroup
): ComponentVariantGroup;
export function cloneVariantGroup(g: GlobalVariantGroup): GlobalVariantGroup;
export function cloneVariantGroup(g: VariantGroup) {
  return switchType(g)
    .when(ComponentVariantGroup, (group) =>
      mkComponentVariantGroup({
        param: cloneParamAndVar(group.param),
        variants: group.variants.map((v) => cloneVariant(v)),
        multi: group.multi,
      })
    )
    .when(GlobalVariantGroup, (group) =>
      mkGlobalVariantGroup({
        param: cloneParamAndVar(group.param),
        variants: group.variants.map((v) => cloneVariant(v)),
        multi: group.multi,
        type: group.type,
      })
    )
    .result();
}

// Return all non style variants of the component
export function allComponentNonStyleVariants(component: Component) {
  const variants = [
    getBaseVariant(component),
    ...(component.variantGroups || []).flatMap((g) => g.variants),
  ];
  return variants;
}

/**
 * Returns all variants that are usable as a Super Component.
 */
export function allSuperComponentVariants(superComp: Component): Variant[] {
  // Sub components can only target "normal" variants, not base or style variants
  return [
    ...superComp.variantGroups.flatMap((g) => g.variants),
    ...(superComp.superComp
      ? allSuperComponentVariants(superComp.superComp)
      : []),
  ];
}

export function getSuperComponentVariantGroupToComponent(component: Component) {
  const groupToSuperComp = new Map<VariantGroup, Component>();
  for (const superComp of getSuperComponents(component)) {
    for (const group of superComp.variantGroups) {
      groupToSuperComp.set(group, superComp);
    }
  }
  return groupToSuperComp;
}

export function getSuperComponentVariantToComponent(component: Component) {
  const groupToSuperComp = getSuperComponentVariantGroupToComponent(component);
  const variantToSuperComp = new Map<Variant, Component>();
  for (const [group, superComp] of groupToSuperComp.entries()) {
    for (const variant of group.variants) {
      variantToSuperComp.set(variant, superComp);
    }
  }
  return variantToSuperComp;
}

/**
 * Returns all Variants of a Component, in a specific order:
 * * First, the base Variant
 * * Next, all the style variants
 */
export function allComponentVariants(
  component: Component,
  opts: { includeSuperVariants?: boolean } = {}
) {
  const variants = [
    ...allComponentNonStyleVariants(component),
    ...component.variants.filter((v) => !isBaseVariant(v)),
  ];
  if (component.superComp && opts.includeSuperVariants) {
    variants.push(...allSuperComponentVariants(component.superComp));
  }
  return variants;
}

export function allComponentStyleVariants(component: Component) {
  return component.variants.filter(isComponentStyleVariant);
}

export function allCodeComponentVariants(component: Component) {
  return component.variants.filter(isCodeComponentVariant);
}

export function allStyleOrCodeComponentVariants(component: Component) {
  return component.variants.filter(isStyleOrCodeComponentVariant);
}

export function allPrivateStyleVariants(component: Component, tpl: TplNode) {
  return component.variants.filter(
    (v) => isPrivateStyleVariant(v) && v.forTpl === tpl
  );
}

export function getNonVariantParams(component: Component) {
  return component.params.filter(
    (p) => !isKnownStateParam(p) || !isKnownVariantGroupState(p.state)
  );
}

export function addSlotParam(
  site: Site,
  component: Component,
  slotName?: string
) {
  if (!slotName) {
    if (!component.params.find((p) => p.variable.name === "children")) {
      slotName = "children";
    } else {
      slotName = "slot";
    }
  }
  // We need to make sure the new slot param does not conflict with
  // any existing names
  slotName = new TplMgr({ site }).getUniqueParamName(component, slotName);
  const slotParam = Lang.mkParam({
    name: slotName,
    type: typeFactory.renderable(),
    exportType: Lang.ParamExportType.External,
    paramType: "slot",
  });
  component.params.push(slotParam);
  return slotParam;
}

export function isVariantGroupParam(
  component: Component,
  param: DeepReadonly<Param>
) {
  return component.variantGroups.some((g) => g.param === param);
}

export function removeComponentParam(
  site: Site,
  component: Component,
  param: Param
) {
  const state = findStateForParam(component, param);
  if (state) {
    removeComponentStateOnly(site, component, state);
  }

  ensureComponentsObserved([component]);
  const group = findVariantGroupForParam(component, param);
  if (group) {
    // Remove all VariantSettings referencing this group
    for (const comp of [component, ...getSubComponents(component)]) {
      for (const [vs, tpl] of Array.from(
        findVariantSettingsUnderTpl(comp.tplTree)
      )) {
        if (vs.variants.some((v) => group.variants.includes(v))) {
          ensureComponentsObserved([comp]);
          removeFromArray(tpl.vsettings, vs);
        }
      }
    }
    // remove the VariantGroup
    removeFromArray(component.variantGroups, group);

    // Remove references to this group and its variants from arenas
    removeVariantGroupFromArenas(site, group, component);
  } else if (isSlot(param)) {
    // TplSlot may be already detached from the parent, only missing to remove the param
    // We don't just call `param.tplSlot` because we only care about tpl slots still
    // attached to the component
    const tplSlot = getTplSlot(component, param.variable);
    if (tplSlot) {
      $$$(tplSlot).tryRemove({ deep: false });
    }
  } else {
    for (const tpl of Tpls.flattenTpls(component.tplTree)) {
      if (Tpls.isTplTagOrComponent(tpl)) {
        removeComponentParamRefs(tpl, param);
      }
    }
  }

  // Next, remove references to it from TplComponents
  for (const inst of Tpls.getTplComponentsInSite(site, component)) {
    for (const vs of inst.vsettings) {
      for (const arg of [...vs.args]) {
        if (arg.param === param) {
          if (!isContextCodeComponent(component)) {
            ensureComponentsObserved([$$$(inst).owningComponent()]);
          }
          // If we're removing a slot prop, we first explicitly remove
          // the tpl nodes passed in as arg, so that we can deal with invariants
          // maintained by $$$.remove() -- for example, if the slot prop
          // descendants include a TplSlot
          if (isKnownRenderExpr(arg.expr)) {
            arg.expr.tpl.forEach((subtpl) =>
              $$$(subtpl).remove({ deep: true })
            );
          }
          removeFromArray(vs.args, arg);
        }
      }
    }
  }

  // Finally, really remove the Param
  removeFromArray(component.params, param);
}

/**
 * Removes all references to the argument param from the argument tpl
 */
function removeComponentParamRefs(tpl: TplNode, param: Param) {
  for (const refInfo of findVarRefs(tpl)) {
    if (refInfo.var === param.variable) {
      switch (refInfo.type) {
        /* The above code is a TypeScript switch statement that checks the type of `refInfo` and
        performs different actions based on the type: */
        case "tag":
          delete refInfo.vs.attrs[refInfo.attr];
          break;
        case "component":
          removeFromArray(refInfo.vs.args, refInfo.arg);
          break;
        default:
          assertNever(refInfo);
      }
    }
  }
}

/**
 * Finds all VarRefs from the deep `tpl` tree; these are either in TplTag's
 * attrs, or in TplComponent's args.
 */
export function* findVarRefs(tpl: TplNode) {
  // TODO: Right now we are just looking in attrs and args for VarRef;
  // obviously references can show up in other places, as well as in
  // CustomCode.code.  Will need to do a more thorough job!

  function* findVarRefsFromExpr(expr: Expr) {
    if (isKnownVarRef(expr)) {
      yield expr;
    } else if (isKnownEventHandler(expr)) {
      for (const interaction of expr.interactions) {
        for (const arg of interaction.args) {
          if (isKnownVarRef(arg.expr)) {
            yield arg.expr;
          }
        }
      }
    } else if (isKnownPageHref(expr)) {
      for (const subExpr of Object.values(expr.params)) {
        if (isKnownVarRef(subExpr)) {
          yield subExpr;
        }
      }
    }
  }

  for (const [vs, node] of findVariantSettingsUnderTpl(tpl)) {
    if (Tpls.isTplTag(node)) {
      for (const [attr, expr] of Object.entries(vs.attrs)) {
        for (const subExpr of findVarRefsFromExpr(expr)) {
          yield {
            type: "tag" as const,
            tpl: node,
            vs,
            attr,
            expr: subExpr,
            var: subExpr.variable,
          };
        }
      }
    } else if (Tpls.isTplComponent(node)) {
      for (const arg of vs.args) {
        for (const subExpr of findVarRefsFromExpr(arg.expr)) {
          yield {
            type: "component" as const,
            tpl: node,
            vs,
            arg,
            expr: subExpr,
            var: subExpr.variable,
          };
        }
      }
    }
  }
}

export function getParamForVar(component: Component, variable: Var) {
  return ensure(
    component.params.find((p) => p.variable === variable),
    "Component should have param with specified variable"
  );
}

export function getParamByVarName(component: Component, name: string) {
  name = toVarName(name);
  return component.params.find((p) => toVarName(p.variable.name) === name);
}

export function getComponentDataQueryByVarName(
  component: Component,
  name: string
) {
  name = toVarName(name);
  return component.dataQueries.find((q) => toVarName(q.name) === name);
}

export function getVariantGroupByVarName(component: Component, name: string) {
  name = toVarName(name);
  return component.variantGroups.find(
    (g) => toVarName(g.param.variable.name) === name
  );
}

export function findVariantGroupForParam(component: Component, param: Param) {
  return component.variantGroups.find((g) => g.param === param);
}

export function findStateForParam(component: Component, param: Param) {
  return component.states.find((s) => s.param === param);
}

export function findStateForOnChangeParam(component: Component, param: Param) {
  return component.states.find((s) => s.onChangeParam === param);
}

export class VariantGroupArg {
  constructor(readonly vg: VariantGroup, readonly variants: Variant[]) {}
}

export function tryGetVariantGroupValueFromArg(
  component: Component,
  arg: Arg
): VariantGroupArg | undefined {
  const vg = findVariantGroupForParam(component, arg.param);
  if (!vg) {
    return undefined;
  }
  return new VariantGroupArg(
    vg,
    isKnownVariantsRef(arg.expr) ? arg.expr.variants : []
  );
}

export function mkVariantGroupArgExpr(variants: Variant[]) {
  return new VariantsRef({ variants });
}

/**
 * Plume components have built-in params that are synced whenever the site
 * loads, and matched by name. They should not be renamed by the user, as it
 * would result in duplicated built-in params the next time the project loads.
 */
export function canRenameParam(component: Component, param: Param) {
  if (!isPlumeComponent(component)) {
    return true;
  }
  const meta = makePlumeComponentMeta(component);

  return !Object.keys(meta.props).some(
    (prop) => toVarName(prop) === toVarName(param.variable.name)
  );
}

/**
 * Some params cannot be deleted:
 * - Built-in plume params
 * - State params
 * - State change handler params
 */
export function canDeleteParam(component: Component, param: Param) {
  if (isKnownStateParam(param) || isOnChangeParam(param, component)) {
    return false;
  }
  if (isPlumeComponent(component)) {
    const meta = makePlumeComponentMeta(component);

    return !Object.keys(meta.props).some(
      (prop) => toVarName(prop) === toVarName(param.variable.name)
    );
  }

  return true;
}

/**
 * Implicit states, variant group states and built-in plume states cannot be
 * deleted.
 */
export function canDeleteState(component: Component, state: State) {
  if (state.implicitState) {
    return false;
  }

  if (isKnownVariantGroupState(state)) {
    return false;
  }

  if (isPlumeComponent(component)) {
    const meta = makePlumeComponentMeta(component);

    return !Object.entries(meta.states ?? {}).some(
      ([stateName, stateSpec]) =>
        toVarName(
          stateSpec.type === "writable" ? stateSpec.valueProp : stateName
        ) === toVarName(state.param.variable.name)
    );
  }

  return true;
}

/**
 * Whether the user is allowed to toggle the param export type
 */
export function canChangeParamExportType(component: Component, param: Param) {
  if (isKnownStateParam(param) || isOnChangeParam(param, component)) {
    // Export types for state params are defined according to the state access
    // type (e.g., every state has `onChange` params, but "private" states hide
    // them by setting the exportType to ToolsOnly).
    // Therefore, users shouldn't toggle state params' export types if not by
    // updating the state access type.
    return false;
  }
  return true;
}

/**
 * Returns component.params that are not states.
 * Returns slot params if and only if includeSlots is true.
 * Returns variant params if and only if includeVariants is true.
 */
export function getRealParams(
  component: Component,
  opts?: { includeSlots?: boolean; includeVariants?: boolean }
) {
  return component.params.filter((param) => {
    if (isSlot(param) && !opts?.includeSlots) {
      return false;
    }

    if (DEVFLAGS.demo && param.variable.name === "children") {
      return false;
    }

    if (findVariantGroupForParam(component, param)) {
      return opts?.includeVariants ? true : false;
    }

    const maybeState = findStateForParam(component, param);
    if (maybeState && maybeState.accessType !== "writable") {
      return false;
    }

    if (
      isOnChangeParam(param, component) &&
      param.exportType === Lang.ParamExportType.ToolsOnly
    ) {
      return false;
    }

    return true;
  });
}

export function getVariantParams(component: Component) {
  return component.variantGroups.map((vg) => vg.param);
}

export function isFrameComponent(component: Component) {
  return component && component.type === ComponentType.Frame;
}

export function isPlasmicComponent(component: Component) {
  return !isFrameComponent(component) && !isCodeComponent(component);
}

export function isCodeComponentWithSection(
  component: Component
): component is CodeComponent & {
  codeComponentMeta: CodeComponentMeta & { section: string };
} {
  return isCodeComponent(component) && !!component.codeComponentMeta.section;
}

export function isReusableComponent(component: Component) {
  return !isFrameComponent(component) && !isPageComponent(component);
}

export type PlumeComponent = Component & { plumeInfo: PlumeInfo };

export function isPlumeComponent(
  component: Component
): component is PlumeComponent {
  return !!component.plumeInfo;
}

export function isSubComponent(
  component: Component
): component is Component & { superComp: Component } {
  return !!component.superComp;
}

export interface CodeComponentConfig {
  // component uuid
  id: string;
  name: string;
  displayName: string;
  importPath: string;
  helper?: {
    name: string;
    importPath: string;
  };
}

export function exportCodeComponentConfig(
  component: CodeComponent
): CodeComponentConfig {
  return {
    id: component.uuid,
    name: getCodeComponentImportName(component),
    displayName: component.name,
    importPath: component.codeComponentMeta.importPath,
    ...(isCodeComponentWithHelpers(component)
      ? {
          helper: {
            name: getCodeComponentHelperImportName(component),
            importPath: component.codeComponentMeta.helpers.importPath,
          },
        }
      : {}),
  };
}

export function getCodeComponentHelperImportName(
  component: CodeComponentWithHelpers
) {
  const helpers = component.codeComponentMeta.helpers;
  if (helpers.importPath.length === 0) {
    return toClassName("Comp" + component.uuid);
  }
  const importName = helpers.importName;
  if (helpers.defaultExport) {
    return toClassName(importName);
  }
  return importName;
}

export function getCodeComponentImportName(component: CodeComponent) {
  if (component.codeComponentMeta.importPath.length === 0) {
    // The import symbol will be used only internally
    return toClassName("Comp" + component.uuid);
  }
  const importName = component.codeComponentMeta.importName ?? component.name;
  if (component.codeComponentMeta.defaultExport) {
    return toClassName(importName);
  }
  return importName;
}

export function getSuperComponents(comp: Component) {
  const supers: Component[] = [];
  while (comp.superComp) {
    supers.push(comp.superComp);
    comp = comp.superComp;
  }
  return supers;
}

export function getSubComponents(comp: Component): Component[] {
  return [...comp.subComps, ...comp.subComps.flatMap(getSubComponents)];
}

export function getNamespacedComponentName(comp: Component) {
  return [comp, ...getSuperComponents(comp)]
    .reverse()
    .map((_comp) => getComponentDisplayName(_comp))
    .join(".");
}

export function isPageFrame(frame: ArenaFrame) {
  return isPageComponent(frame.container.component);
}

/**
 * Sorts components alphabetically, but with sub-components ordered
 * immediately after their super-components
 */
export function sortComponentsByName(comps: Component[]) {
  const result: Component[] = [];

  const addComp = (comp: Component) => {
    result.push(comp);
    // Also add all sub components
    for (const subComp of naturalSort(comp.subComps, (c) =>
      getFolderComponentTrimmedName(c)
    )) {
      addComp(subComp);
    }
  };

  // First order non-sub-components by name
  for (const comp of naturalSort(
    comps.filter((c) => !c.superComp),
    (c) => getFolderComponentTrimmedName(c)
  )) {
    addComp(comp);
  }

  return result;
}

export function isComponentHiddenFromContentEditor(
  c: Component,
  sc: StudioCtx
) {
  return (
    (isCodeComponent(c)
      ? sc.getCodeComponentMeta(c)?.hideFromContentCreators
      : undefined) ??
    c.hiddenFromContentEditor ??
    false
  );
}

export function getComponentDisplayName(component: Component) {
  if (isCodeComponent(component) && component.codeComponentMeta.displayName) {
    return component.codeComponentMeta.displayName;
  }
  return component.name || "unnamed artboard";
}

export function getFolderComponentDisplayName(component: Component) {
  const componentName =
    isCodeComponent(component) && component.codeComponentMeta.displayName
      ? component.codeComponentMeta.displayName
      : !!component.name
      ? component.name
      : "unnamed artboard";

  return getFolderDisplayName(componentName);
}

export function getFolderComponentTrimmedName(component: Component) {
  if (!component.name) {
    return "unnamed artboard";
  }
  const componentName =
    isCodeComponent(component) && component.codeComponentMeta.displayName
      ? component.codeComponentMeta.displayName
      : component.name;
  return getFolderTrimmed(componentName);
}

export function getCodeComponentDescription(component: CodeComponent) {
  return component.codeComponentMeta.description ?? undefined;
}

export function getEffectiveVariantSettingOfDeepRootElement(
  component: Component,
  activeVariants: VariantCombo
) {
  let foundEffectiveVariantSetting = false;
  let effectiveVariantSetting: EffectiveVariantSetting | undefined = undefined;
  while (!foundEffectiveVariantSetting) {
    if (isTplComponent(component.tplTree)) {
      activeVariants = getTplComponentActiveVariants(
        component.tplTree as TplComponent,
        activeVariants
      );
      component = component.tplTree.component;
    } else {
      effectiveVariantSetting = isTplVariantable(component.tplTree)
        ? getEffectiveVariantSetting(component.tplTree, activeVariants)
        : undefined;
      foundEffectiveVariantSetting = true;
    }
  }
  return effectiveVariantSetting;
}

export function addOrEditComponentMetadata(
  component: Component,
  key: string,
  value: string
) {
  component.metadata[key] = value;
}

export function removeComponentMetadata(component: Component, key: string) {
  delete component.metadata[key];
}

/**
 * Extracts param names from page path, but retains the `...`
 * prefix for catchall params
 *
 * /hello/[yes]/and/[...what] => ["yes", "...what"]
 */
export function extractParamsFromPagePath(path: string) {
  return [...path.matchAll(/\[\[?([^\]]*)\]/g)].map((m) => m[1]);
}

export function getRepetitionElementName(dataRep: Rep) {
  return toVarName(dataRep.element.name);
}

export function getRepetitionIndexName(dataRep: Rep) {
  return dataRep.index ? toVarName(dataRep.index.name) : "__index";
}

export function getParamDisplayName(component: Component, param: Param) {
  return (
    param.displayName ??
    (component.codeComponentMeta
      ? smartHumanize(param.variable.name)
      : param.variable.name)
  );
}

export function removeVariantGroup(
  site: Site,
  component: Component,
  group: VariantGroup
) {
  if (isKnownComponentVariantGroup(group)) {
    removeComponentParam(site, component, group.linkedState.onChangeParam);
  }
  removeComponentParam(site, component, group.param);
  removeVariantGroupFromSplits(site, group);
}

export function tryGetDefaultComponent(site: Site, kind: DefaultComponentKind) {
  return (
    site.defaultComponents[kind] ??
    site.components.find((c) => c.plumeInfo?.type === kind)
  );
}

export function getDefaultComponent(site: Site, kind: DefaultComponentKind) {
  const defaultComponent = tryGetDefaultComponent(site, kind);
  assert(defaultComponent, `Not found a plume component of the kind ${kind}`);
  return defaultComponent;
}

export function getAllComponentsInTopologicalOrder(site: Site) {
  const sortedComponents: Component[] = [];
  const visited = new Set<Component>();
  const rec = (root: Component) => {
    visited.add(root);
    const children = flattenTpls(root.tplTree)
      .filter((tpl) => isTplComponent(tpl))
      .map((tpl) => ensureKnownTplComponent(tpl).component);
    for (const c of children) {
      if (!visited.has(c)) {
        rec(c);
      }
    }
    sortedComponents.push(root);
  };
  for (const c of site.components) {
    if (!visited.has(c)) {
      rec(c);
    }
  }
  // we don't need to reverse the component list because the edges are already reversed
  return sortedComponents;
}

export function getPageOrComponentLabel(c: Component) {
  return isPageComponent(c) ? "page" : "component";
}

export function getDependencyComponents(site: Site) {
  return walkDependencyTree(site, "all")
    .filter((dep) => !isHostLessPackage(dep.site))
    .flatMap((dep) => dep.site.components.filter(isPlainComponent));
}

/**
 * Returns a list of global variants that are referenced by the component. Being referenced
 * doesn't necessarily mean that the component uses the variant.
 */
export function allGlobalVariantsReferencedByComponent(c: Component) {
  return [
    ...new Set(
      [...findVariantSettingsUnderTpl(c.tplTree)].flatMap(([vs]) => {
        return vs.variants.filter((v) => isGlobalVariant(v));
      })
    ),
  ];
}

function hasInteractionsWithName(component: Component, names: string[]) {
  return flattenTpls(component.tplTree)
    .flatMap((tpl) =>
      getAllEventHandlersForTpl(component, tpl).flatMap(({ expr }) => {
        return isKnownEventHandler(expr) ? expr.interactions : [];
      })
    )
    .some((interaction) => names.includes(interaction.actionName));
}

export function hasDataSourceInteractions(component: Component) {
  return hasInteractionsWithName(component, DATA_SOURCE_ACTIONS);
}

export function hasLoginInteractions(component: Component) {
  return hasInteractionsWithName(component, LOGIN_ACTIONS);
}

export function hasGlobalActions(component: Component) {
  return flattenTpls(component.tplTree)
    .flatMap((tpl) =>
      getAllEventHandlersForTpl(component, tpl).flatMap(({ expr }) => {
        return isKnownEventHandler(expr) ? expr.interactions : [];
      })
    )
    .some((interaction) => interaction.actionName.includes("."));
}

export function getParamNames(component: Component, params: Param[]) {
  return params.map((p) => paramToVarName(component, p));
}
