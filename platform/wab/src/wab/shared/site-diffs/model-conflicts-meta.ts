import { Leaves, Paths } from "@/wab/commons/types";
import { Bundler } from "@/wab/shared/bundler";
import {
  TypeStamped,
  assert,
  ensure,
  ensureInstance,
  switchType,
  unexpected,
} from "@/wab/shared/common";
import {
  isCodeComponent,
  isFrameComponent,
} from "@/wab/shared/core/components";
import * as classes from "@/wab/shared/model/classes";
import {
  HostLessPackageInfo,
  ProjectDependency,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { Type, isWeakRefField } from "@/wab/shared/model/model-meta";
import { NodeCtx } from "@/wab/shared/model/model-tree-util";
import {
  mergeComponentVariants,
  mergeTplNodeChildren,
  mergeVSettings,
  tryMergeComponents,
  tryMergeGlobalContexts,
} from "@/wab/shared/site-diffs/merge-components";
import {
  DirectConflict,
  DirectConflictPickMap,
  generateIidForInst,
} from "@/wab/shared/site-diffs/merge-core";
import { isSlot } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { isString } from "lodash";

export type MaybeWithPrefix<T extends string | null> = T extends null
  ? never
  : `${T}${string}`;

export type MaybeWithSuffix<T extends string | null> = T extends null
  ? never
  : `${string}${T}`;

/**
 * Returns all keys from the object excluding the ones with a given prefix or
 * suffix.
 */
export type KeysFiltered<
  T,
  Prefix extends string | null = null,
  Suffix extends string | null = null
> = {
  [K in keyof T]: K extends MaybeWithPrefix<Prefix>
    ? never
    : K extends MaybeWithSuffix<Suffix>
    ? never
    : K;
}[keyof T];

/**
 * Returns all keys from the object filtered to include only the ones that extends given
 * type
 */
export type KeysExtended<T, Extended> = {
  [K in keyof T]: T[K] extends Extended ? K : never;
}[keyof T];

export type ModelConflictsMeta = {
  // For each class (each export that extends TypeStamped and isn't
  // an abstract class) we create an object describing the fields
  [Cls in KeysExtended<
    typeof classes,
    TypeStamped<any> & (new (...args: any) => any)
  >]: {
    [P in KeysFiltered<
      InstanceType<(typeof classes)[Cls]>,
      "uid" | "typeTag"
    >]: FieldConflictDescriptorMeta<InstanceType<(typeof classes)[Cls]>, P>;
  };
};

export type MergeSpecialFieldHandler<
  Cls extends classes.ObjInst = classes.ObjInst
> = (
  ancestorCtx: NodeCtx<Cls>,
  leftCtx: NodeCtx<Cls>,
  rightCtx: NodeCtx<Cls>,
  mergedCtx: NodeCtx<Cls>,
  bundler: Bundler,
  picks: DirectConflictPickMap | undefined
) => DirectConflict[];

export type FieldConflictDescriptorMeta<
  Cls extends classes.ObjInst = classes.ObjInst,
  P extends keyof Cls = any
> =
  | "harmless"
  | "unexpected"
  | {
      conflictType: "special";
      handler: MergeSpecialFieldHandler<Cls>;
    }
  | {
      conflictType: "contents";
      excludeFromClone: (v: Cls[P]) => boolean;
    }
  | (Cls[P] extends Array<infer E>
      ?
          | { arrayType: "atomic" }
          | ({
              arrayType: "ordered" | "unordered";
              contents?: boolean;
            } & (
              | { conflictType: "unexpected" }
              | (E extends classes.ObjInst
                  ? // `walkAndFixNames` expects array values to be `ObjInst`s
                    | {
                          conflictType: "rename";
                          /** nameKey should never traverse WeakRefs */
                          nameKey: Leaves<E>;
                          customRenameFn?: (
                            site: classes.Site,
                            node: E,
                            newName: string
                          ) => void;
                          excludeFromRename?: (node: E, parent: Cls) => boolean;
                        }
                      | {
                          conflictType: "special";
                          forceRename: true;
                          nameKey: Paths<E>;
                          excludeFromRename?: (node: E, parent: Cls) => boolean;
                          handler: MergeSpecialFieldHandler<Cls>;
                        }
                  : never)
              | ({
                  conflictType: "merge";
                  excludeFromMerge?: (node: E) => boolean;
                } & (
                  | {
                      mergeKey: Paths<E>;
                      // When the merge key changes but the instance is
                      // preserved, we must clone the instance to make sure the
                      // merged site will see it as a new instance and clone all
                      // field values.
                      handleUpdatedValues: (
                        newVals: E[],
                        parent: Cls,
                        bundler: Bundler
                      ) => E[];
                    }
                  | {
                      mergeKeyIsIdentity: true;
                    }
                  | {
                      mergeKeyFn: (node: E) => any;
                      handleUpdatedValues: (
                        newVals: E[],
                        parent: Cls,
                        bundler: Bundler
                      ) => E[];
                    }
                ))
            ))
      : "generic" | "contents" | "special");

const immutableClass = <T>() =>
  new Proxy({} as Record<keyof T, "unexpected">, {
    get: () => "unexpected",
  });

const tplVariantableMeta = {
  locked: "harmless",
  parent: {
    conflictType: "special",
    handler: () => [],
  },
  uuid: "unexpected",
  vsettings: {
    conflictType: "special",
    handler: mergeVSettings,
  },
} as const;

/**
 * Makes a shallow clone of the array values, creating a new instance when it
 * contains of model instances.
 *
 * Be carefull if the cloned instances can have WeakRefs pointing to them, as
 * these refs would need to be updated to point to the cloned instances.
 */
function shallowCloneArrayValuesAndAddToBundle<
  T extends classes.ObjInst | string | number | boolean | null | undefined,
  U extends new (arg: any) => any
>(
  vals: T[],
  parent: classes.ObjInst,
  bundler: Bundler,
  types: U[]
): Exclude<
  T,
  InstanceType<U> | string | number | boolean | null | undefined
> extends never
  ? T[]
  : false /* Forces a type error */ {
  const res: T[] = vals.map((v) => {
    if (!v || typeof v !== "object") {
      return v;
    }
    assert(bundler.addrOf(v) != null, () => `Value ${v} has no address`);
    let typeCond: any = switchType(v);
    types.forEach((t) => {
      typeCond = typeCond.when(t, (typedValue) => new t(typedValue));
    });
    const cloned: T & classes.ObjInst = typeCond.result();
    // Besides cloning the array values, we need to make sure the instance
    // has an IID
    generateIidForInst(cloned, bundler, bundler.addrOf(parent).uuid);
    return cloned;
  });

  return res as any;
}

/**
 * This metadata is used to tell the merging algorithm how to deal with
 * conflicting changes on each field from different branches.
 *
 * Each field can have the following description:
 *  1 - Unexpected: No conflicting changes are expected to happen, so it does
 *      happen, it will report an error.
 *  2 - Harmless: Those changes are harmless to the site, and we don't need to
 *      bother the user to fix this conflict (which might even be a "hidden"
 *      field). In this case, the value from either branch could be used.
 *  3 - Special: Those fields need custom code in order to reconcile and
 *      identify / fix the conflicts.
 *  4 - Direct: Generic direct conflicts: when the values don't match, we will
 *      ask the users to manually pick the correct changes. It receives a "group"
 *      of changes, which identify the type of the conflict, and groups all
 *      fields in this group when considering changes (so, if different fields
 *      have been modified in each branch, but both belong to the same group, it
 *      will be considered a conflict).
 */
export const modelConflictsMeta: ModelConflictsMeta = {
  Num: immutableClass<classes.Num>(),
  Text: immutableClass<classes.Text>(),
  BoolType: immutableClass<classes.BoolType>(),
  Img: immutableClass<classes.Img>(),
  AnyType: immutableClass<classes.AnyType>(),
  Choice: immutableClass<classes.Choice>(),
  DateString: immutableClass<classes.DateString>(),
  DateRangeStrings: immutableClass<classes.DateRangeStrings>(),
  ComponentInstance: immutableClass<classes.ComponentInstance>(),
  PlumeInstance: immutableClass<classes.PlumeInstance>(),
  QueryData: immutableClass<classes.QueryData>(),
  HrefType: immutableClass<classes.HrefType>(),
  TargetType: immutableClass<classes.TargetType>(),
  RenderableType: {
    name: "unexpected",
    params: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyFn: (t) =>
        classes.isKnownComponentInstance(t) ? t.component : t.plumeType,
      handleUpdatedValues: (types, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(types, parent, bundler, [
          classes.ComponentInstance,
          classes.PlumeInstance,
        ]),
    },
    allowRootWrapper: "generic",
  },
  ClassNamePropType: {
    name: "unexpected",
    selectors: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: "label",
      handleUpdatedValues: (selectors, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(selectors, parent, bundler, [
          classes.LabeledSelector,
        ]),
    },
    defaultStyles: "generic",
  },
  StyleScopeClassNamePropType: {
    name: "unexpected",
    scopeName: "generic",
  },
  DefaultStylesClassNamePropType: {
    name: "unexpected",
    includeTagStyles: "generic",
  },
  DefaultStylesPropType: {
    name: "unexpected",
  },
  ColorPropType: {
    name: "unexpected",
    noDeref: "generic",
  },
  VariantedValue: {
    value: "generic",
    variants: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  StyleToken: {
    name: "generic",
    type: "unexpected",
    uuid: "unexpected",
    value: "generic",
    isRegistered: "generic",
    regKey: "generic",
    variantedValues: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: `variants`,
      handleUpdatedValues: (vals, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(vals, parent, bundler, [
          classes.VariantedValue,
        ]),
    },
  },
  HostLessPackageInfo: immutableClass<HostLessPackageInfo>(), // Not really immutable but we shouldn't have two concurrent instances
  Site: {
    activeScreenVariantGroup: "generic",
    activeTheme: "special",
    arenas: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: `name`,
    },
    componentArenas: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: `component`,
      handleUpdatedValues: (arenas, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(arenas, parent, bundler, [
          classes.ComponentArena,
        ]),
    },
    components: {
      arrayType: "unordered",
      nameKey: "name",
      forceRename: true,
      excludeFromRename: (c) => isCodeComponent(c) || isFrameComponent(c),
      conflictType: "special",
      handler: (ancestor, left, right, merged, bundler, picks) =>
        tryMergeComponents(ancestor, left, right, merged, bundler, picks),
    },
    defaultComponents: "generic",
    defaultPageRoleId: "generic",
    flags: "harmless",
    globalContexts: {
      arrayType: "unordered",
      conflictType: "special",
      handler: (ancestor, left, right, merged, bundler, picks) =>
        tryMergeGlobalContexts(ancestor, left, right, merged, bundler, picks),
    },
    globalVariant: "unexpected",
    globalVariantGroups: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: `param.variable.name`,
      customRenameFn: (site, vg, newName) => {
        const tplMgr = new TplMgr({ site });
        tplMgr.renameVariantGroup(vg, newName);
      },
    },
    hostLessPackageInfo: "unexpected",
    imageAssets: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: "name",
    },
    mixins: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: `name`,
    },
    pageArenas: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: `component`,
      handleUpdatedValues: (arenas, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(arenas, parent, bundler, [
          classes.PageArena,
        ]),
    },
    pageWrapper: "generic",
    projectDependencies: {
      conflictType: "special",
      handler: () => [], // Handled in `fixProjectDependencies` separately
    },
    splits: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: `name`,
    },
    styleTokens: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: `name`,
      excludeFromRename: (t) => t.isRegistered && !!t.regKey,
    },
    themes: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    userManagedFonts: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    customFunctions: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
      contents: true,
    },
    codeLibraries: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
      contents: true,
    },
  },
  CustomFunction: {
    defaultExport: "generic",
    importName: "generic",
    importPath: "generic",
    namespace: "generic",
  },
  CodeLibrary: {
    importType: "generic",
    importPath: "generic",
    jsIdentifier: "generic",
    name: "generic",
    namedImport: "generic",
    isSyntheticDefaultImport: "generic",
  },
  ArenaFrameGrid: {
    rows: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  ArenaFrameRow: {
    cols: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    rowKey: "generic",
  },
  ArenaFrameCell: {
    cellKey: "generic",
    frame: "unexpected",
  },
  ComponentArena: {
    component: "unexpected",
    customMatrix: "generic",
    matrix: "generic",
    _focusedFrame: "harmless",
  },
  PageArena: {
    component: "unexpected",
    customMatrix: "generic",
    matrix: "generic",
    _focusedFrame: "harmless",
  },
  Arena: {
    children: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    name: "generic",
  },
  ArenaFrame: {
    bgColor: "harmless",
    container: "harmless",
    height: "harmless",
    lang: "harmless",
    left: "harmless",
    name: "harmless",
    pinnedGlobalVariants: "harmless",
    pinnedVariants: "harmless",
    targetGlobalVariants: "harmless",
    targetVariants: "harmless",
    top: "harmless",
    uuid: "unexpected",
    viewMode: "harmless",
    width: "harmless",
  },
  RenderFuncType: {
    name: "unexpected",
    params: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKey: "argName",
      contents: true,
      handleUpdatedValues: (params, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(params, parent, bundler, [
          classes.ArgType,
        ]),
    },
    allowed: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: "component",
      handleUpdatedValues: (types, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(types, parent, bundler, [
          classes.ComponentInstance,
        ]),
    },
    allowRootWrapper: "generic",
  },
  FunctionType: {
    name: "unexpected",
    params: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  ArgType: {
    name: "unexpected",
    displayName: "generic",
    argName: "generic",
    type: "contents",
  },
  RuleSet: {
    values: "generic",
    mixins: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  Rule: {
    name: "unexpected",
    values: {
      arrayType: "atomic",
    },
  },
  VariantedRuleSet: {
    rs: "generic",
    variants: "unexpected",
  },
  Mixin: {
    forTheme: "unexpected",
    name: "generic",
    preview: "harmless",
    rs: "generic",
    uuid: "unexpected",
    variantedRs: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: `variants`,
      handleUpdatedValues: (rulesets, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(rulesets, parent, bundler, [
          classes.VariantedRuleSet,
        ]),
    },
  },
  Theme: {
    active: "unexpected",
    defaultStyle: "generic",
    styles: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: `selector`,
      handleUpdatedValues: (styles, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(styles, parent, bundler, [
          classes.ThemeStyle,
        ]),
    },
    layout: "contents",
    addItemPrefs: "contents",
  },
  ThemeStyle: {
    selector: "unexpected",
    style: "generic",
  },
  ThemeLayoutSettings: {
    rs: "contents",
  },
  ProjectDependency: immutableClass<ProjectDependency>(),
  ImageAsset: {
    aspectRatio: "generic",
    dataUri: "generic",
    height: "generic",
    name: "generic",
    type: "unexpected",
    uuid: "unexpected",
    width: "generic",
  },
  TplTag: {
    ...tplVariantableMeta,
    children: {
      conflictType: "special",
      handler: mergeTplNodeChildren,
    },
    codeGenType: "generic",
    columnsSetting: "generic",
    name: "generic",
    tag: "generic",
    type: "generic",
  },
  TplComponent: {
    ...tplVariantableMeta,
    component: "generic",
    name: "generic",
  },
  TplSlot: {
    ...tplVariantableMeta,
    defaultContents: {
      conflictType: "special",
      handler: mergeTplNodeChildren,
    },
    param: "generic",
  },
  ColumnsSetting: {
    screenBreakpoint: "generic",
  },
  PageMeta: {
    canonical: "generic",
    description: "generic",
    openGraphImage: "generic",
    params: "generic",
    path: "generic",
    query: "generic",
    title: "generic",
    roleId: "generic",
  },
  ComponentDataQuery: {
    uuid: "unexpected",
    name: "generic",
    op: "generic",
  },
  CodeComponentHelper: {
    importName: "generic",
    importPath: "generic",
    defaultExport: "generic",
  },
  CodeComponentVariantMeta: {
    cssSelector: "generic",
    displayName: "generic",
  },
  CodeComponentMeta: {
    classNameProp: "generic",
    defaultExport: "generic",
    defaultStyles: "generic",
    defaultDisplay: "generic",
    description: "generic",
    section: "generic",
    thumbnailUrl: "generic",
    displayName: "generic",
    importName: "generic",
    importPath: "generic",
    isAttachment: "generic",
    isContext: "generic",
    isHostLess: "generic",
    isRepeatable: "generic",
    providesData: "generic",
    refProp: "generic",
    hasRef: "generic",
    helpers: "generic",
    styleSections: "generic",
    defaultSlotContents: "contents",
    variants: "generic",
  },
  Component: {
    codeComponentMeta: "generic",
    editableByContentEditor: "generic",
    hiddenFromContentEditor: "generic",
    metadata: "generic",
    name: "generic",
    pageMeta: "generic",
    params: {
      arrayType: "unordered",
      conflictType: "rename",
      nameKey: `variable.name`,
      customRenameFn: (site, param, newName) => {
        const tplMgr = new TplMgr({ site });
        const component = ensure(
          site.components.find((c) => c.params.includes(param)),
          "Param should belong to some component in site"
        );
        const maybeGroup = component.variantGroups.find(
          (vg) => vg.param === param
        );
        if (maybeGroup) {
          tplMgr.renameVariantGroup(maybeGroup, newName);
        } else {
          tplMgr.renameParam(component, param, newName);
        }
      },
      excludeFromRename: (_param, component) => isCodeComponent(component),
    },
    plumeInfo: "generic",
    templateInfo: "generic",
    states: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    subComps: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    superComp: "generic",
    tplTree: {
      conflictType: "special",
      handler: () => [],
    },
    type: "generic",
    uuid: "generic",
    variantGroups: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    variants: {
      conflictType: "special",
      handler: (ancestor, left, right, merged, bundler, picks) =>
        mergeComponentVariants(ancestor, left, right, merged, bundler, picks),
    },
    dataQueries: {
      arrayType: "ordered",
      conflictType: "rename",
      nameKey: `name`,
    },
    figmaMappings: {
      arrayType: "unordered",
      conflictType: `merge`,
      mergeKey: "figmaComponentName",
      handleUpdatedValues: (mappings, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(mappings, parent, bundler, [
          classes.FigmaComponentMapping,
        ]),
    },
    alwaysAutoName: "generic",
    trapsFocus: "generic",
  },
  FigmaComponentMapping: {
    figmaComponentName: "generic",
  },
  NameArg: { expr: "generic", name: "generic" },
  PlumeInfo: { type: "generic" },
  ComponentTemplateInfo: {
    name: "generic",
    projectId: "generic",
    componentId: "generic",
  },
  Variant: {
    description: "generic",
    forTpl: "generic",
    mediaQuery: "generic",
    name: "generic",
    parent: "generic",
    selectors: "generic",
    uuid: "generic",
    codeComponentName: "generic",
    codeComponentVariantKeys: "generic",
  },
  GlobalVariantGroup: {
    multi: "generic",
    param: "generic",
    type: "generic",
    uuid: "generic",
    variants: {
      arrayType: "ordered",
      conflictType: "rename",
      nameKey: `name`,
      customRenameFn: (site, variant, newName) => {
        const tplMgr = new TplMgr({ site });
        tplMgr.renameVariant(variant, newName);
      },
    },
  },
  ComponentVariantGroup: {
    multi: "generic",
    param: "generic",
    type: "generic",
    uuid: "generic",
    variants: {
      arrayType: "ordered",
      conflictType: "rename",
      nameKey: `name`,
      customRenameFn: (site, variant, newName) => {
        const tplMgr = new TplMgr({ site });
        tplMgr.renameVariant(variant, newName);
      },
    },
    linkedState: "generic",
  },
  VariantSetting: {
    args: {
      conflictType: "merge",
      arrayType: "unordered",
      mergeKey: "param",
      excludeFromMerge: (arg) => isSlot(arg.param),
      handleUpdatedValues: (args, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(args, parent, bundler, [
          classes.Arg,
        ]),
    },
    attrs: "contents",
    columnsConfig: "generic",
    dataCond: "generic",
    dataRep: "generic",
    rs: "contents",
    text: "contents",
    variants: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  EventHandler: {
    interactions: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  GenericEventHandler: {
    handlerType: "generic",
    interactions: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  Interaction: {
    actionName: "harmless",
    interactionName: "harmless",
    condExpr: "harmless",
    conditionalMode: "harmless",
    args: "unexpected",
    uuid: "generic",
    parent: "unexpected",
  },
  ColumnsConfig: {
    breakUpRows: "generic",
    colsSizes: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  StyleMarker: {
    length: "generic",
    position: "generic",
    rs: "generic",
  },
  NodeMarker: {
    length: "generic",
    position: "generic",
    tpl: "generic",
  },
  RawText: {
    markers: {
      arrayType: "atomic",
    },
    text: "generic",
  },
  ExprText: { expr: "generic", html: "generic" },
  Var: { name: "generic", uuid: "generic" },
  Rep: {
    collection: "generic",
    element: "generic",
    index: "generic",
  },
  SlotParam: {
    about: "generic",
    defaultExpr: "generic",
    previewExpr: "generic",
    description: "generic",
    displayName: "generic",
    enumValues: "harmless",
    exportType: "generic",
    isRepeated: "generic",
    origin: "generic",
    propEffect: "generic",
    required: "generic",
    type: "contents",
    uuid: "generic",
    variable: "generic",
    mergeWithParent: "generic",
    isMainContentSlot: "generic",
    isLocalizable: "generic",
    tplSlot: "generic",
  },
  StateParam: {
    about: "generic",
    defaultExpr: "generic",
    previewExpr: "generic",
    description: "generic",
    displayName: "generic",
    enumValues: "harmless",
    exportType: "generic",
    isRepeated: "generic",
    origin: "generic",
    propEffect: "generic",
    required: "generic",
    type: "contents",
    uuid: "generic",
    variable: "generic",
    mergeWithParent: "generic",
    isMainContentSlot: "generic",
    isLocalizable: "generic",
    state: "generic",
  },
  StateChangeHandlerParam: {
    about: "generic",
    defaultExpr: "generic",
    previewExpr: "generic",
    description: "generic",
    displayName: "generic",
    enumValues: "harmless",
    exportType: "generic",
    isRepeated: "generic",
    origin: "generic",
    propEffect: "generic",
    required: "generic",
    type: "contents",
    uuid: "generic",
    variable: "generic",
    mergeWithParent: "generic",
    isMainContentSlot: "generic",
    isLocalizable: "generic",
    state: "generic",
  },
  GlobalVariantGroupParam: {
    about: "generic",
    defaultExpr: "generic",
    previewExpr: "generic",
    description: "generic",
    displayName: "generic",
    enumValues: "harmless",
    exportType: "generic",
    isRepeated: "generic",
    origin: "generic",
    propEffect: "generic",
    required: "generic",
    type: "contents",
    uuid: "generic",
    variable: "generic",
    mergeWithParent: "generic",
    isMainContentSlot: "generic",
    isLocalizable: "generic",
  },
  PropParam: {
    about: "generic",
    defaultExpr: "generic",
    previewExpr: "generic",
    description: "generic",
    displayName: "generic",
    enumValues: "harmless",
    exportType: "generic",
    isRepeated: "generic",
    origin: "generic",
    propEffect: "generic",
    required: "generic",
    type: "contents",
    uuid: "generic",
    variable: "generic",
    mergeWithParent: "generic",
    isMainContentSlot: "generic",
    isLocalizable: "generic",
  },
  Arg: {
    expr: {
      conflictType: "contents",
      excludeFromClone: (expr) => classes.isKnownRenderExpr(expr),
    },
    param: "generic",
  },
  RenderExpr: {
    tpl: { conflictType: "special", handler: () => [] },
  },
  VirtualRenderExpr: {
    tpl: { conflictType: "special", handler: () => [] },
  },
  CustomCode: { code: "generic", fallback: "generic" },
  FunctionExpr: {
    bodyExpr: "generic",
    argNames: {
      arrayType: "atomic",
    },
  },
  StyleExpr: {
    uuid: "generic",
    styles: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKey: "selector",
      handleUpdatedValues: (styles, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(styles, parent, bundler, [
          classes.SelectorRuleSet,
        ]),
    },
  },
  SelectorRuleSet: {
    selector: "generic",
    rs: "generic",
  },
  LabeledSelector: {
    selector: "generic",
    label: "generic",
    defaultStyles: "generic",
  },
  DataSourceOpExpr: {
    parent: "generic",
    opId: "generic",
    opName: "generic",
    sourceId: "generic",
    templates: "generic",
    roleId: "generic",
    cacheKey: "generic",
    queryInvalidation: "generic",
  },
  DataSourceTemplate: {
    fieldType: "generic",
    value: "generic",
    bindings: "generic",
  },
  QueryInvalidationExpr: {
    invalidationQueries: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyFn: (v) => (isString(v) ? v : v.ref.uuid),
      handleUpdatedValues: (queries, parent, bundler) =>
        shallowCloneArrayValuesAndAddToBundle(queries, parent, bundler, [
          classes.QueryRef,
        ]),
    },
    invalidationKeys: "generic",
  },
  TemplatedString: {
    text: {
      arrayType: "atomic",
    },
  },
  CollectionExpr: {
    exprs: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  MapExpr: {
    mapExpr: "contents",
  },
  FunctionArg: {
    argType: "unexpected",
    expr: "generic",
    uuid: "generic",
  },
  StrongFunctionArg: {
    argType: "generic",
    expr: "generic",
    uuid: "generic",
  },
  VarRef: { variable: "generic" },
  TplRef: { tpl: "generic" },
  StyleTokenRef: { token: "generic" },
  ImageAssetRef: { asset: "generic" },
  PageHref: { params: "generic", page: "generic" },
  VariantsRef: {
    variants: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  ObjectPath: {
    fallback: "generic",
    path: {
      arrayType: "ordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
  },
  CompositeExpr: {
    hostLiteral: "generic",
    substitutions: "contents",
  },
  QueryRef: {
    ref: "generic",
  },
  State: {
    param: "generic",
    implicitState: "generic",
    onChangeParam: "generic",
    tplNode: "generic",
    accessType: "generic",
    variableType: "generic",
  },
  NamedState: {
    param: "generic",
    implicitState: "generic",
    onChangeParam: "generic",
    tplNode: "generic",
    accessType: "generic",
    variableType: "generic",
    name: "generic",
  },
  VariantGroupState: {
    param: "generic",
    implicitState: "generic",
    onChangeParam: "generic",
    tplNode: "generic",
    accessType: "generic",
    variableType: "generic",
    variantGroup: "unexpected",
  },
  Split: {
    description: "generic",
    externalId: "generic",
    name: "generic",
    slices: "harmless",
    splitType: "generic",
    status: "generic",
    targetEvents: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    uuid: "generic",
  },
  RandomSplitSlice: {
    contents: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    externalId: "generic",
    name: "generic",
    prob: "generic",
    uuid: "generic",
  },
  SegmentSplitSlice: {
    cond: "generic",
    contents: {
      arrayType: "unordered",
      conflictType: "merge",
      mergeKeyIsIdentity: true,
    },
    externalId: "generic",
    name: "generic",
    uuid: "generic",
  },
  GlobalVariantSplitContent: {
    group: "generic",
    variant: "generic",
  },
  ComponentVariantSplitContent: {
    component: "generic",
    group: "generic",
    variant: "generic",
  },
  ComponentSwapSplitContent: {
    fromComponent: "generic",
    toComponent: "generic",
  },
};

function checkMetas() {
  // For example, you may accidentally say that Component.variantGroups has a nameKey of param.variable.name, but this is wrong.
  // param is a WeakRef, and it should be Component.params that is reconciling the names of all the params.
  for (const [cls, fields] of Object.entries(modelConflictsMeta)) {
    for (const [fieldName, _meta] of Object.entries(fields)) {
      if (
        _meta &&
        _meta.arrayType &&
        (_meta.conflictType === "rename" || _meta.forceRename)
      ) {
        function getCoreType(type: Type): Type {
          switch (type.type) {
            case "Optional":
              return getCoreType(ensureInstance(type.params[0], Type));
            case "List":
            case "Set":
              return ensureInstance(type.params[0], Type);
            case "StringLiteral":
              return type;
            default:
              if (type.params.length > 0) {
                unexpected(`Got type ${JSON.stringify(type, null, 2)}`);
              } else {
                return type;
              }
          }
        }
        function pathContainsWeakRef(startingFromType: string, path: string[]) {
          const field = meta.getFieldByName(startingFromType, path[0]);
          assert(
            !isWeakRefField(field),
            `nameKeys cannot traverse WeakRefs, but ${cls}.${fieldName} has nameKey of ${_meta.nameKey} and ${field.name} is a weakRef`
          );
          const elementTypeName = getCoreType(field.type).type;
          if (path.length === 1) {
            return;
          }
          return pathContainsWeakRef(
            meta.clsByName[elementTypeName].name,
            path.slice(1)
          );
        }
        pathContainsWeakRef(cls, [fieldName, ..._meta.nameKey.split(".")]);
      }
    }
  }
}

checkMetas();
