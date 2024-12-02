import {
  TokenType,
  mkTokenRef,
  replaceAllTokenRefs,
} from "@/wab/commons/StyleToken";
import { ArenaType } from "@/wab/shared/ApiSchema";
import {
  AnyArena,
  cloneArena,
  cloneArenaFrame,
  getArenaFrames,
  isComponentArena,
  isPageArena,
  mkMixedArena,
} from "@/wab/shared/Arenas";
import { ARENA_CAP } from "@/wab/shared/Labels";
import { getSlotArgs } from "@/wab/shared/SlotUtils";
import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  isGlobalVariant,
  isGlobalVariantGroup,
  mkBaseVariant,
} from "@/wab/shared/Variants";
import {
  componentToReferencers,
  componentsReferecerToPageHref,
  findAllDataSourceOpExprForComponent,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import { Dict } from "@/wab/shared/collections";
import {
  assert,
  ensure,
  maybe,
  mergeMaps,
  mkShortId,
  remove,
  removeWhere,
  strictZip,
  switchType,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import { ensureComponentArenaColsOrder } from "@/wab/shared/component-arenas";
import { ColorFill } from "@/wab/shared/core/bg-styles";
import {
  CodeComponent,
  ComponentCloneResult,
  PageComponent,
  allComponentVariants,
  cloneComponent,
  cloneVariant,
  cloneVariantGroup,
  fixArgForCloneComponent,
  getComponentDisplayName,
  getEffectiveVariantSettingOfDeepRootElement,
  getSuperComponentVariantGroupToComponent,
  getSuperComponentVariantToComponent,
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import {
  convertHrefExprToCodeExpr,
  isFallbackableExpr,
} from "@/wab/shared/core/exprs";
import {
  cloneImageAsset,
  isIcon,
  mkImageAssetRef,
  replaceAllAssetRefs,
} from "@/wab/shared/core/image-assets";
import {
  DependencyWalkScope,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { typographyCssProps } from "@/wab/shared/core/style-props";
import {
  cloneMixin,
  cloneStyleToken,
  cloneTheme,
  cssPropsToRuleSet,
  mkRuleSet,
} from "@/wab/shared/core/styles";
import {
  clone,
  findExprsInComponent,
  findExprsInNode,
  findVariantSettingsUnderTpl,
  flattenExprs,
  flattenTpls,
  isTplColumns,
  isTplComponent,
  isTplVariantable,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import { getCssInitial } from "@/wab/shared/css";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { getRshContainerType } from "@/wab/shared/layoututils";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Arena,
  ArenaFrame,
  ArenaFrameCell,
  ArenaFrameGrid,
  ArenaFrameRow,
  ArgType,
  CodeLibrary,
  CollectionExpr,
  Component,
  ComponentArena,
  CompositeExpr,
  CustomCode,
  CustomFunction,
  DataSourceOpExpr,
  EventHandler,
  Expr,
  FunctionArg,
  FunctionExpr,
  GlobalVariantGroup,
  HostLessPackageInfo,
  ImageAsset,
  ImageAssetRef,
  MapExpr,
  Mixin,
  ObjInst,
  ObjectPath,
  PageArena,
  PageHref,
  Param,
  QueryInvalidationExpr,
  QueryRef,
  RenderExpr,
  RuleSet,
  Site,
  StrongFunctionArg,
  StyleExpr,
  StyleToken,
  StyleTokenRef,
  TemplatedString,
  Theme,
  ThemeLayoutSettings,
  ThemeStyle,
  TplComponent,
  TplNode,
  TplRef,
  Type,
  VarRef,
  Variant,
  VariantGroup,
  VariantSetting,
  VariantedRuleSet,
  VariantedValue,
  VariantsRef,
  VirtualRenderExpr,
  ensureKnownArenaFrame,
  ensureKnownVariant,
  ensureMaybeKnownGlobalVariantGroup,
  ensureMaybeKnownVariantGroup,
  isKnownComponent,
  isKnownComponentInstance,
  isKnownCustomCode,
  isKnownEventHandler,
  isKnownExpr,
  isKnownExprText,
  isKnownFunctionType,
  isKnownImageAsset,
  isKnownMixin,
  isKnownPageArena,
  isKnownPageHref,
  isKnownRenderExpr,
  isKnownStrongFunctionArg,
  isKnownTplComponent,
  isKnownTplNode,
  isKnownTplRef,
  isKnownTplTag,
  isKnownVariant,
  isKnownVariantedRuleSet,
  isKnownVariantedValue,
} from "@/wab/shared/model/classes";
import {
  isRenderFuncType,
  isRenderableType,
} from "@/wab/shared/model/model-util";
import {
  ResponsiveStrategy,
  defaultResponsiveSettings,
} from "@/wab/shared/responsiveness";
import { naturalSort } from "@/wab/shared/sort";
import { getMatchingPagePathParams } from "@/wab/shared/utils/url-utils";
import keyBy from "lodash/keyBy";
import keys from "lodash/keys";
import orderBy from "lodash/orderBy";
import pick from "lodash/pick";
import { CSSProperties } from "react";

export const writeable = <T extends ObjInst>(
  v: T
): { -readonly [P in keyof T]: T[P] } => v;

export const UNINITIALIZED_VALUE = "Uninitialized value" as any;

export function createSite({
  hostLessPackageInfo,
}: {
  hostLessPackageInfo?: HostLessPackageInfo;
} = {}) {
  const defaultTheme = createDefaultTheme();

  const screenGroup = mkScreenVariantGroup();
  const site = new Site({
    componentArenas: [],
    pageArenas: [],
    components: [],
    arenas: [],
    globalVariant: mkBaseVariant(),
    styleTokens: [],
    mixins: [],
    themes: [defaultTheme],
    activeTheme: defaultTheme,
    globalVariantGroups: [screenGroup],
    userManagedFonts: [],
    imageAssets: [],
    projectDependencies: [],
    activeScreenVariantGroup: screenGroup,
    flags: {
      usePlasmicImg: true,
      useLoadingState: true,
    },
    hostLessPackageInfo: hostLessPackageInfo ?? null,
    globalContexts: [],
    splits: [],
    defaultComponents: {},
    defaultPageRoleId: null,
    pageWrapper: null,
    customFunctions: [],
    codeLibraries: [],
  });

  addDummyArena(site);
  return site;
}

function addDummyArena(site: Site) {
  const arena = mkMixedArena(ARENA_CAP + " 1");
  site.arenas.push(arena);
}

function clonePageArena(
  fromPageArena: PageArena,
  newComponentsMap: Map<Component, ComponentCloneResult>,
  globalVariantMap: Map<Variant, Variant>
) {
  const fromComponent = fromPageArena.component;

  const componentRes = ensure(
    newComponentsMap.get(fromPageArena.component),
    "should exist in newComponentsMap"
  );

  const getNewRowKeyVariant = (rowKey: Variant | null | undefined) => {
    if (!rowKey) {
      return rowKey;
    }
    if (globalVariantMap.has(rowKey)) {
      return ensure(globalVariantMap.get(rowKey), "just checked");
    }
    if (componentRes.oldToNewVariant.has(rowKey)) {
      return ensure(componentRes.oldToNewVariant.get(rowKey), "just checked");
    }
    // Variant is coming from project dependency. Continue using it.
    return rowKey;
  };

  const getNewCellKey = (cellKey: Variant | Variant[] | null | undefined) => {
    if (!cellKey) {
      return cellKey;
    }
    if (isKnownVariant(cellKey)) {
      return getNewVariant(
        fromComponent,
        cellKey,
        newComponentsMap,
        globalVariantMap
      );
    } else {
      return cellKey.map((k) => getNewCellKey(k));
    }
  };

  return new PageArena({
    component: newComponentsMap.get(fromPageArena.component)!.component,
    matrix: cloneArenaFrameGrid(fromPageArena.matrix, {
      getNewRowKeyVariant,
    }),
    customMatrix: cloneArenaFrameGrid(fromPageArena.customMatrix, {
      getNewCellKey,
    }),
  });
}

function getNewVariantGroup(
  oldComp: Component,
  oldGroup: VariantGroup,
  oldToNewComponent: Map<Component, ComponentCloneResult>,
  oldToNewGlobalVariantGroup: Map<VariantGroup, VariantGroup>
) {
  if (isGlobalVariantGroup(oldGroup)) {
    // If oldGroup is not in oldToNewGlobalVariantGroup, it is imported
    // from a ProjectDependency, so just reuse the same
    return oldToNewGlobalVariantGroup.get(oldGroup) ?? oldGroup;
  }
  const superGroupToComponent =
    getSuperComponentVariantGroupToComponent(oldComp);
  const oldOwnerComp = superGroupToComponent.get(oldGroup) ?? oldComp;
  const ownerCompRes = ensure(
    oldToNewComponent.get(oldOwnerComp),
    "should exist in oldToNewComponent"
  );
  const newVar = ensure(
    ownerCompRes.oldToNewVar.get(oldGroup.param.variable),
    "should exist in oldToNewVar"
  );
  return ensure(
    ownerCompRes.component.variantGroups.find(
      (vg) => vg.param.variable === newVar
    ),
    "this variable should exist in the variantGroups"
  );
}

function getNewVariant(
  oldComp: Component,
  oldVariant: Variant,
  oldToNewComponent: Map<Component, ComponentCloneResult>,
  oldToNewGlobalVariant: Map<Variant, Variant>
) {
  if (isGlobalVariant(oldVariant)) {
    // If oldVariant is not in oldToNewGlobalVariant, it is imported
    // from a ProjectDependency, so just reuse the same
    return oldToNewGlobalVariant.get(oldVariant) ?? oldVariant;
  }
  const superVariantToComponent = getSuperComponentVariantToComponent(oldComp);
  const oldOwnerComp = superVariantToComponent.get(oldVariant) ?? oldComp;
  const ownerCompRes = ensure(
    oldToNewComponent.get(oldOwnerComp),
    "should exist in oldToNewComponent"
  );
  return ensure(
    ownerCompRes.oldToNewVariant.get(oldVariant),
    "should exist in oldToNewVariant"
  );
}

function cloneArenaFrameGrid(
  fromArenaFrameGrid: ArenaFrameGrid,
  mappingFns: {
    getNewRowKeyVariantGroup?: (
      rowKey: VariantGroup | null | undefined
    ) => VariantGroup | null | undefined;
    getNewRowKeyVariant?: (
      rowKey: Variant | null | undefined
    ) => Variant | null | undefined;
    getNewCellKey?: (
      cellKey: Variant | Variant[] | null | undefined
    ) => Variant | Variant[] | null | undefined;
  }
) {
  return new ArenaFrameGrid({
    rows: fromArenaFrameGrid.rows.map(
      (row) =>
        new ArenaFrameRow({
          rowKey: mappingFns.getNewRowKeyVariantGroup
            ? mappingFns.getNewRowKeyVariantGroup(
                ensureMaybeKnownVariantGroup(row.rowKey)
              )
            : mappingFns.getNewRowKeyVariant
            ? mappingFns.getNewRowKeyVariant(ensureKnownVariant(row.rowKey))
            : undefined,
          cols: row.cols.map(
            (cell) =>
              new ArenaFrameCell({
                frame: cloneArenaFrame(cell.frame),
                cellKey: mappingFns.getNewCellKey
                  ? mappingFns.getNewCellKey(cell.cellKey)
                  : undefined,
              })
          ),
        })
    ),
  });
}

function cloneComponentArena(
  fromComponentArena: ComponentArena,
  oldToNewComponentsMap: Map<Component, ComponentCloneResult>,
  globalVariantGroupMap: Map<VariantGroup, VariantGroup>,
  globalVariantMap: Map<Variant, Variant>
) {
  const fromComponent = fromComponentArena.component;
  const componentRes = ensure(
    oldToNewComponentsMap.get(fromComponent),
    "should exist in oldToNewComponentsMap"
  );
  const getNewRowKeyVariantGroup = (
    rowKey: VariantGroup | null | undefined
  ) => {
    if (!rowKey) {
      return rowKey;
    }
    return getNewVariantGroup(
      fromComponent,
      rowKey,
      oldToNewComponentsMap,
      globalVariantGroupMap
    );
  };

  const getNewCellKey = (cellKey: Variant | Variant[] | null | undefined) => {
    if (!cellKey) {
      return cellKey;
    }
    if (isKnownVariant(cellKey)) {
      return getNewVariant(
        fromComponent,
        cellKey,
        oldToNewComponentsMap,
        globalVariantMap
      );
    } else {
      return cellKey.map((k) => getNewCellKey(k));
    }
  };

  return new ComponentArena({
    component: componentRes.component,
    matrix: cloneArenaFrameGrid(fromComponentArena.matrix, {
      getNewRowKeyVariantGroup,
      getNewCellKey,
    }),
    customMatrix: cloneArenaFrameGrid(fromComponentArena.customMatrix, {
      getNewCellKey,
    }),
  });
}

export function cloneCustomFunction(
  customFunction: CustomFunction
): CustomFunction {
  return new CustomFunction({
    defaultExport: customFunction.defaultExport,
    importName: customFunction.importName,
    importPath: customFunction.importPath,
    namespace: customFunction.namespace,
  });
}

export function cloneCodeLibrary(lib: CodeLibrary): CodeLibrary {
  return new CodeLibrary({
    name: lib.name,
    jsIdentifier: lib.jsIdentifier,
    importPath: lib.importPath,
    importType: lib.importType,
    namedImport: lib.namedImport,
    isSyntheticDefaultImport: lib.isSyntheticDefaultImport,
  });
}

function flattenComponentCloneResult(
  res: ComponentCloneResult
): ComponentCloneResult[] {
  return [
    res,
    ...res.subCompResults.flatMap((subr) => flattenComponentCloneResult(subr)),
  ];
}

export function cloneSite(fromSite: Site) {
  // indexed by cloned Component
  const oldToNewComponentCloneResults = new Map<
    Component,
    ComponentCloneResult
  >();
  for (const oldComp of fromSite.components) {
    if (oldComp.superComp) {
      // sub components are cloned when cloning their superComp
      continue;
    }

    // insert component and cloned sub components into oldToNewComponentCloneResults map
    for (const res of flattenComponentCloneResult(
      cloneComponent(oldComp, oldComp.name)
    )) {
      oldToNewComponentCloneResults.set(res.oldComponent, res);
    }
  }
  const newComponentsMap = new Map<Component, ComponentCloneResult>(
    [...oldToNewComponentCloneResults.values()].map((r) =>
      tuple(r.component, r)
    )
  );
  const newThemes = new Map<Theme, Theme>(
    fromSite.themes.map((theme) => {
      const newTheme = cloneTheme(theme);
      return tuple(theme, newTheme);
    })
  );

  // Make sure newComponents is in the same order as fromSite.components
  const newComponents = fromSite.components.map(
    (comp) =>
      ensure(
        oldToNewComponentCloneResults.get(comp),
        "should exist in oldToNewComponentCloneResults"
      ).component
  );
  const newGlobalVariantGroups =
    fromSite.globalVariantGroups.map(cloneVariantGroup);

  const oldToNewGlobalVariant = new Map<Variant, Variant>([
    ...strictZip(fromSite.globalVariantGroups, newGlobalVariantGroups).flatMap(
      ([oldG, newG]) =>
        strictZip(oldG.variants, (newG as VariantGroup).variants)
    ),
  ]);

  const oldToNewGlobalVariantGroup = new Map<VariantGroup, VariantGroup>([
    ...strictZip(fromSite.globalVariantGroups, newGlobalVariantGroups),
  ]);

  const newGlobalContexts = fromSite.globalContexts.map((tpl) => {
    return clone(tpl);
  });

  const newArenas = fromSite.arenas.map((arena) => cloneArena(arena));
  const newPageArenas = fromSite.pageArenas.map((it) =>
    clonePageArena(it, oldToNewComponentCloneResults, oldToNewGlobalVariant)
  );
  const newComponentArenas = fromSite.componentArenas.map((it) =>
    cloneComponentArena(
      it,
      oldToNewComponentCloneResults,
      oldToNewGlobalVariantGroup,
      oldToNewGlobalVariant
    )
  );

  const site = new Site({
    arenas: newArenas,
    pageArenas: newPageArenas,
    componentArenas: newComponentArenas,
    components: newComponents,
    globalVariant: cloneVariant(fromSite.globalVariant),
    styleTokens: fromSite.styleTokens.map(cloneStyleToken),
    mixins: fromSite.mixins.map((mixin) => cloneMixin(mixin)),
    themes: fromSite.themes.map((th) =>
      ensure(newThemes.get(th), "should exist in newThemes")
    ),
    // The activeTheme may be local to the site -- in which case, we
    // reference the new copy -- or it may have been imported, in which
    // case we reference the same instance.
    activeTheme: fromSite.activeTheme
      ? newThemes.get(fromSite.activeTheme) ?? fromSite.activeTheme
      : null,
    globalVariantGroups: newGlobalVariantGroups,
    userManagedFonts: fromSite.userManagedFonts.slice(0),
    imageAssets: fromSite.imageAssets.map(cloneImageAsset),
    projectDependencies: [...fromSite.projectDependencies],

    // The new active screen variant group should either be mapped to
    // a new cloned screen variant group, or if it was referencing an
    // imported screen variant group instead, be kept the same
    activeScreenVariantGroup: fromSite.activeScreenVariantGroup
      ? ensureMaybeKnownGlobalVariantGroup(
          oldToNewGlobalVariantGroup.get(fromSite.activeScreenVariantGroup)
        ) ?? fromSite.activeScreenVariantGroup
      : null,
    flags: { ...fromSite.flags },
    hostLessPackageInfo: null,
    globalContexts: newGlobalContexts,
    splits: [],
    defaultComponents: Object.keys(fromSite.defaultComponents).reduce(
      (newDefaultComponents, kind) => ({
        ...newDefaultComponents,
        [kind]:
          oldToNewComponentCloneResults.get(fromSite.defaultComponents[kind])
            ?.component ?? fromSite.defaultComponents[kind],
      }),
      {}
    ),
    pageWrapper: null,
    defaultPageRoleId: fromSite.defaultPageRoleId,
    customFunctions: fromSite.customFunctions.map((f) =>
      cloneCustomFunction(f)
    ),
    codeLibraries: fromSite.codeLibraries.map((lib) => cloneCodeLibrary(lib)),
  });

  const oldToNewMixin = new Map<Mixin, Mixin>(
    strictZip(fromSite.mixins, site.mixins)
  );
  const oldToNewToken = new Map<StyleToken, StyleToken>(
    strictZip(fromSite.styleTokens, site.styleTokens)
  );
  const oldToNewAsset = new Map<ImageAsset, ImageAsset>(
    strictZip(fromSite.imageAssets, site.imageAssets)
  );

  const getNewMaybeTokenRefValue = (value: string) => {
    return replaceAllTokenRefs(value, (tokenId) => {
      const oldToken = fromSite.styleTokens.find((t) => t.uuid === tokenId);
      if (oldToken) {
        return mkTokenRef(
          ensure(oldToNewToken.get(oldToken), "should exist in oldToNewToken")
        );
      }
      return undefined;
    });
  };

  const getNewMaybeImageAssetRefValue = (value: string) => {
    return replaceAllAssetRefs(value, (assetId) => {
      const oldAsset = fromSite.imageAssets.find((a) => a.uuid === assetId);
      if (oldAsset) {
        return mkImageAssetRef(
          ensure(oldToNewAsset.get(oldAsset), "should exist in oldToNewAsset")
        );
      }
      return undefined;
    });
  };

  const fixRefsForRuleset = (rs: RuleSet) => {
    for (const key of Object.keys(rs.values)) {
      rs.values[key] = getNewMaybeTokenRefValue(rs.values[key]);
      if (key === "background") {
        rs.values[key] = getNewMaybeImageAssetRefValue(rs.values[key]);
      }
    }
  };

  const fixRefsForVariantedStyle = (
    variantedStyle: VariantedValue | VariantedRuleSet
  ) => {
    if (isKnownVariantedRuleSet(variantedStyle)) {
      variantedStyle.rs.mixins = variantedStyle.rs.mixins.map((m) =>
        getNewMixin(m)
      );
    }
    for (let i = 0; i < variantedStyle.variants.length; i++) {
      variantedStyle.variants[i] =
        oldToNewGlobalVariant.get(variantedStyle.variants[i]) ??
        variantedStyle.variants[i];
    }
    if (isKnownVariantedValue(variantedStyle)) {
      variantedStyle.value = getNewMaybeTokenRefValue(variantedStyle.value);
    } else {
      fixRefsForRuleset(variantedStyle.rs);
    }
  };

  const allLocalMixins = new Set(fromSite.mixins);
  const getNewMixin = (mixin: Mixin) => {
    if (allLocalMixins.has(mixin)) {
      return ensure(oldToNewMixin.get(mixin), "should exist in oldToNewMixin");
    } else {
      return mixin;
    }
  };

  const fixRefsForMixin = (mixin: Mixin) => {
    fixRefsForRuleset(mixin.rs);
    mixin.rs.mixins = mixin.rs.mixins.map((m) => getNewMixin(m));
    mixin.variantedRs.forEach((variantedRs) =>
      fixRefsForVariantedStyle(variantedRs)
    );
  };

  const oldToNewComponentQuery = mergeMaps(
    ...[...oldToNewComponentCloneResults.values()].map(
      (v) => v.oldToNewComponentQuery
    )
  );
  const oldToNewTpls = mergeMaps(
    ...[...oldToNewComponentCloneResults.values()].map((v) => v.oldToNewTpls)
  );
  const oldToNewVariants = mergeMaps(
    ...[...oldToNewComponentCloneResults.values()].map((v) => v.oldToNewVariant)
  );

  // fix token ref from tokens
  site.styleTokens.forEach((token) => {
    token.value = getNewMaybeTokenRefValue(token.value);
    token.variantedValues.forEach((variantedValue) =>
      fixRefsForVariantedStyle(variantedValue)
    );
  });
  // fix token ref from mixin
  site.mixins.forEach((mixin) => fixRefsForMixin(mixin));
  // fix token ref from theme
  site.themes.forEach((theme) => {
    fixRefsForMixin(theme.defaultStyle);
    theme.styles.forEach((s) => fixRefsForMixin(s.style));
    Object.values(theme.addItemPrefs).forEach((rs) => fixRefsForRuleset(rs));
  });
  const oldToNewComponent = new Map<Component, Component>(
    strictZip(fromSite.components, site.components)
  );
  const oldToNewVar = mergeMaps(
    ...[...oldToNewComponentCloneResults.values()].map(
      (cloneResult) => cloneResult.oldToNewVar
    )
  );

  // Fix component references in the param type
  const fixComponentInstanceType = (type: Type) => {
    if (
      isKnownComponentInstance(type) &&
      oldToNewComponent.has(type.component)
    ) {
      type.component = ensure(
        oldToNewComponent.get(type.component),
        "should exist in oldToNewComponent"
      );
    }
  };
  site.components
    .flatMap((newC) => newC.params)
    .forEach((newParam) => {
      if (isRenderableType(newParam.type)) {
        newParam.type.params.forEach((type) => {
          fixComponentInstanceType(type);
        });
      } else if (isRenderFuncType(newParam.type)) {
        newParam.type.allowed.forEach((type) => {
          fixComponentInstanceType(type);
        });
      }
    });

  const oldToNewParam = new Map<Param, Param>(
    strictZip(fromSite.components, site.components).flatMap(([oldC, newC]) =>
      strictZip(oldC.params, (newC as Component).params)
    )
  );
  const oldToNewArgType = new Map<ArgType, ArgType>(
    withoutNils(
      [...oldToNewParam.entries()].map(([param1, param2]) =>
        isKnownFunctionType(param1.type) && isKnownFunctionType(param2.type)
          ? ([param1.type, param2.type] as const)
          : null
      )
    ).flatMap(([func1, func2]) => strictZip(func1.params, func2.params))
  );

  const fixQueryRef = (queryRef: QueryRef) => {
    queryRef.ref =
      (isKnownTplNode(queryRef.ref)
        ? oldToNewTpls.get(queryRef.ref)
        : oldToNewComponentQuery.get(queryRef.ref)) ?? queryRef.ref;
  };

  const fixGlobalRefForExpr = (expr: Expr) => {
    switchType(expr)
      .when(ImageAssetRef, (imageAssetRef) => {
        imageAssetRef.asset = getNewImageAsset(imageAssetRef.asset);
      })
      .when(PageHref, (pageHref) => {
        pageHref.page = oldToNewComponent.get(pageHref.page) ?? pageHref.page;
        for (const param of pageHref.page.params) {
          if (param.defaultExpr) {
            fixGlobalRefForExpr(param.defaultExpr);
          }
        }
      })
      .when(StyleTokenRef, (tokenRef) => {
        // Either the token has been cloned, or the token belongs to an
        // imported site.
        tokenRef.token = oldToNewToken.get(tokenRef.token) ?? tokenRef.token;
      })
      .when([CustomCode, ObjectPath], (code) => {
        if (code.fallback) {
          fixGlobalRefForExpr(code.fallback);
        }
      })
      .when(EventHandler, (eventHandler) =>
        eventHandler.interactions.forEach((interaction) =>
          interaction.args.forEach((nameArg) =>
            fixGlobalRefForExpr(nameArg.expr)
          )
        )
      )
      .when(VarRef, (varRef) => {
        varRef.variable = oldToNewVar.get(varRef.variable) ?? varRef.variable;
      })
      .when(CompositeExpr, (composite) =>
        Object.values(composite.substitutions).forEach((subExpr) =>
          fixGlobalRefForExpr(subExpr)
        )
      )
      .when(VariantsRef, (variantsRef) => {
        // cloneComponent fixes references to the own component, but we have to fix references
        // that point to other components from some component
        variantsRef.variants = variantsRef.variants.map((v) => {
          if (isGlobalVariant(v)) {
            return oldToNewGlobalVariant.get(v) ?? v;
          } else {
            return oldToNewVariants.get(v) ?? v;
          }
        });
      })
      .when(CollectionExpr, (collection) =>
        collection.exprs.forEach(
          (subExpr) => subExpr && fixGlobalRefForExpr(subExpr)
        )
      )
      .when(MapExpr, (mapExpr) =>
        Object.values(mapExpr.mapExpr).forEach((subExpr) =>
          fixGlobalRefForExpr(subExpr)
        )
      )
      .when(DataSourceOpExpr, (dataOp) => {
        if (dataOp.queryInvalidation) {
          fixGlobalRefForExpr(dataOp.queryInvalidation);
        }
        if (dataOp.cacheKey) {
          fixGlobalRefForExpr(dataOp.cacheKey);
        }
        if (dataOp.parent) {
          fixQueryRef(dataOp.parent);
        }
        Object.values(dataOp.templates).forEach((template) =>
          Object.values(template.bindings ?? {}).forEach((binding) =>
            fixGlobalRefForExpr(binding)
          )
        );
      })
      .when(QueryInvalidationExpr, (queryInvalidation) => {
        if (queryInvalidation.invalidationKeys) {
          fixGlobalRefForExpr(queryInvalidation.invalidationKeys);
        }
        queryInvalidation.invalidationQueries.forEach(
          (q) => typeof q !== "string" && fixQueryRef(q)
        );
      })
      .when(TplRef, (tplRef) => {
        tplRef.tpl = oldToNewTpls.get(tplRef.tpl) ?? tplRef.tpl;
      })
      .when([FunctionArg, StrongFunctionArg], (functionArg) => {
        if (!isKnownStrongFunctionArg(functionArg)) {
          functionArg.argType =
            oldToNewArgType.get(functionArg.argType) ?? functionArg.argType;
        }
        fixGlobalRefForExpr(functionArg.expr);
      })
      .when(StyleExpr, (styleExpr) => {
        styleExpr.styles.forEach((sty) => {
          fixRefsForRuleset(sty.rs);
          sty.rs.mixins = sty.rs.mixins.map((mixin) => getNewMixin(mixin));
        });
      })
      .when(TemplatedString, (templatedString) =>
        templatedString.text.forEach(
          (subExpr) => isKnownExpr(subExpr) && fixGlobalRefForExpr(subExpr)
        )
      )
      .when(FunctionExpr, (functionExpr) =>
        fixGlobalRefForExpr(functionExpr.bodyExpr)
      )
      .when([RenderExpr, VirtualRenderExpr], () => {})
      .result();
  };

  site.components.forEach((component) => {
    component.dataQueries.forEach(
      (query) => query.op && fixGlobalRefForExpr(query.op)
    );
  });

  const allOldLocalComponents = new Set(localComponents(fromSite));
  const allImportedComponents = new Set(
    allComponents(fromSite, { includeDeps: "all" }).filter(
      (c) => !allOldLocalComponents.has(c)
    )
  );

  const allLocalAssets = new Set(fromSite.imageAssets);
  const getNewImageAsset = (asset: ImageAsset) => {
    if (allLocalAssets.has(asset)) {
      return ensure(oldToNewAsset.get(asset), "should exist in oldToNewAsset");
    } else {
      return asset;
    }
  };

  const fixLocalVsAndTpl = (
    ctx: string,
    vs: VariantSetting,
    tpl: TplNode,
    isPreset: boolean
  ) => {
    // fix global variants ref
    if (isPreset) {
      assert(
        vs.variants.length === 1 && vs.variants[0] === fromSite.globalVariant,
        `${ctx} - Expect 1 variantSettings, got ${vs.variants.length}.`
      );
      vs.variants = [site.globalVariant];
    } else {
      // Fix up the variant references
      vs.variants = vs.variants.map((v) => {
        if (isGlobalVariant(v)) {
          // A global variant reference; we need to point to the new
          // global variant reference in the cloned site.  However,
          // we only clone global variants that are local to this site,
          // not imported global variants; for imported global variants,
          // we just retain the same reference
          return oldToNewGlobalVariant.get(v) ?? v;
        } else if (v === fromSite.globalVariant) {
          // A base variant reference
          return site.globalVariant;
        }
        // A component variant reference; already fixed when the component
        // was cloned
        return v;
      });
    }
    if (isKnownTplComponent(tpl)) {
      vs.args.forEach((arg) => {
        if (allOldLocalComponents.has(tpl.component)) {
          // We only fix TplComponent of local components; imported components
          // are not changed during clone.
          // Note that this fix is skipped for TplComponent in preset, which has
          // already been fixed to point to the new component.
          const oldComponent = tpl.component;
          const oldToNewVariant = ensure(
            newComponentsMap.get(
              ensure(
                oldToNewComponent.get(oldComponent),
                "should exist in the oldToNewComponent map"
              )
            ),
            "should exist in newComponentsMap"
          ).oldToNewVariant;
          fixArgForCloneComponent(
            arg,
            tpl.component,
            oldToNewVariant,
            oldToNewParam
          );
        }

        // We fix exprs for both local and imported TplComponents; that way
        // instances of imported Link components will update their PageHref
        // correctly.
        fixGlobalRefForExpr(arg.expr);
      });
      Object.entries(vs.attrs).forEach(([_, value]) =>
        fixGlobalRefForExpr(value)
      );
    }

    if (isKnownExprText(vs.text)) {
      fixGlobalRefForExpr(vs.text.expr);
    }

    if (vs.dataCond) {
      fixGlobalRefForExpr(vs.dataCond);
    }

    if (vs.dataRep) {
      fixGlobalRefForExpr(vs.dataRep.collection);
    }

    if (isKnownTplTag(tpl)) {
      // fix image asset refs in attrs. We don't need to fix VarRefs here,
      // because the VarRefs for the owning component were fixed when we
      // cloned the component
      Object.entries(vs.attrs).forEach(([_, value]) =>
        fixGlobalRefForExpr(value)
      );

      if (
        isTplColumns(tpl) &&
        tpl.columnsSetting &&
        tpl.columnsSetting.screenBreakpoint
      ) {
        tpl.columnsSetting.screenBreakpoint = oldToNewGlobalVariant.get(
          tpl.columnsSetting.screenBreakpoint
        );
      }
    }

    // fix token ref from RuleSet
    fixRefsForRuleset(vs.rs);
    // fix mixin ref
    vs.rs.mixins = vs.rs.mixins.map((mixin) => getNewMixin(mixin));
  };

  const fixComponentRef = (tpl: TplNode) => {
    if (isKnownTplComponent(tpl) && allOldLocalComponents.has(tpl.component)) {
      const newComponent = oldToNewComponent.get(tpl.component);
      if (newComponent) {
        tpl.component = newComponent;
      } else {
        ensure(
          newComponentsMap.get(tpl.component),
          " we must have already fixed the component ref."
        );
      }
    }
  };

  // fix following references in each component
  //   - var ref
  //   - global variants
  //   - params ref
  //   - component ref
  //   - token ref
  //   - mixin ref
  for (const c of site.components) {
    for (const param of c.params) {
      if (param.defaultExpr) {
        fixGlobalRefForExpr(param.defaultExpr);
      }
      if (param.previewExpr) {
        fixGlobalRefForExpr(param.previewExpr);
      }
    }

    const componentVsAndTpl = [...findVariantSettingsUnderTpl(c.tplTree)];

    componentVsAndTpl.forEach(([vs, tpl]) => {
      fixLocalVsAndTpl(c.name, vs, tpl, false);
    });

    // Fix component ref
    [...componentVsAndTpl].forEach(([_, tpl]) => {
      fixComponentRef(tpl);
    });

    if (
      c.pageMeta &&
      c.pageMeta.openGraphImage &&
      isKnownImageAsset(c.pageMeta.openGraphImage)
    ) {
      c.pageMeta.openGraphImage = getNewImageAsset(c.pageMeta.openGraphImage);
    }
  }

  // Fix implicit states
  for (const c of site.components) {
    for (const state of c.states) {
      if (state.implicitState && isKnownTplComponent(state.tplNode)) {
        const newComponent = state.tplNode.component;
        if (!allImportedComponents.has(newComponent)) {
          const cloneResult = ensure(
            newComponentsMap.get(newComponent),
            "New component must be in newComponentsMap"
          );
          state.implicitState = ensure(
            cloneResult.oldToNewState.get(state.implicitState),
            "Implicit states should be mapped"
          );
        }
      }
    }
  }

  for (const tpl of site.globalContexts) {
    const componentVsAndTpl = [...findVariantSettingsUnderTpl(tpl)];
    componentVsAndTpl.forEach(([vs, curTpl]) =>
      fixLocalVsAndTpl(
        `Global Context ${getComponentDisplayName(tpl.component)}`,
        vs,
        curTpl,
        false
      )
    );
    componentVsAndTpl.forEach(([_, curTpl]) => fixComponentRef(curTpl));
  }

  // fix references in each arena frame
  getAllSiteFrames(site).forEach((c) => {
    const arenaFrame = ensureKnownArenaFrame(c);
    if (arenaFrame.bgColor) {
      arenaFrame.bgColor = getNewMaybeTokenRefValue(arenaFrame.bgColor);
    }
    const oldComp = arenaFrame.container.component;
    // fix component reference
    const newComponent = ensure(
      oldToNewComponent.get(oldComp),
      "Should exist in oldToNewComponent map"
    );
    arenaFrame.container.component = newComponent;
    // fix global variants and the global base variant (i.e. site.globalVariant)
    [...findVariantSettingsUnderTpl(arenaFrame.container)].forEach(
      ([vs, _]) =>
        (vs.variants = vs.variants.map((v) => {
          if (v === fromSite.globalVariant) {
            return site.globalVariant;
          }
          return isGlobalVariant(v)
            ? ensure(
                oldToNewGlobalVariant.get(v),
                "Should exist on oldToNewGlobalVariant map"
              )
            : v;
        }))
    );
    // fixed pinned global variant and target global variants
    const oldCompVariants = allComponentVariants(oldComp, {
      includeSuperVariants: true,
    });
    const oldGlobalVariants = allGlobalVariants(fromSite);

    const getOldVariant = (uuid: string) => {
      return (
        oldCompVariants.find((v) => v.uuid === uuid) ??
        oldGlobalVariants.find((v) => v.uuid === uuid)
      );
    };

    const fixPinMap = (pinMap: { [key: string]: boolean }) => {
      return Object.fromEntries(
        Object.entries(pinMap).map(([vUuid, value]) => {
          const oldVariant = getOldVariant(vUuid);
          if (oldVariant) {
            const newVariant = getNewVariant(
              oldComp,
              oldVariant,
              oldToNewComponentCloneResults,
              oldToNewGlobalVariant
            );
            return [newVariant.uuid, value];
          } else {
            // If there's no old variant found, then this must've been a
            // reference to an imported global variant, so just leave it
            // as it is
            return [vUuid, value];
          }
        })
      );
    };
    arenaFrame.pinnedGlobalVariants = fixPinMap(
      arenaFrame.pinnedGlobalVariants
    );
    arenaFrame.targetGlobalVariants = arenaFrame.targetGlobalVariants.map(
      (v) => oldToNewGlobalVariant.get(v) ?? v
    );

    // fixed pinned component variant and target component variants
    arenaFrame.pinnedVariants = fixPinMap(arenaFrame.pinnedVariants);
    arenaFrame.targetVariants = arenaFrame.targetVariants.map((v) =>
      getNewVariant(
        oldComp,
        v,
        oldToNewComponentCloneResults,
        oldToNewGlobalVariant
      )
    );
  });

  ensureScreenVariantsOrderOnMatrices(site);

  site.pageWrapper = maybe(
    fromSite.pageWrapper,
    (pw) => oldToNewComponent.get(pw) ?? pw
  );

  return site;
}

export function fixAppAuthRefs(
  site: Site,
  oldToNewRoleIds: Record<string, string>
) {
  if (site.defaultPageRoleId) {
    if (oldToNewRoleIds[site.defaultPageRoleId]) {
      site.defaultPageRoleId = oldToNewRoleIds[site.defaultPageRoleId];
    } else {
      site.defaultPageRoleId = null;
    }
  }

  site.components.forEach((c) => {
    if (isPageComponent(c)) {
      if (c.pageMeta.roleId) {
        if (oldToNewRoleIds[c.pageMeta.roleId]) {
          c.pageMeta.roleId = oldToNewRoleIds[c.pageMeta.roleId];
        } else {
          c.pageMeta.roleId = null;
        }
      }
    }
  });

  let reevaluateOpIds = false;

  site.components.forEach((component) => {
    findAllDataSourceOpExprForComponent(component).forEach((opExpr) => {
      if (opExpr.roleId) {
        reevaluateOpIds = true;
        if (oldToNewRoleIds[opExpr.roleId]) {
          opExpr.roleId = oldToNewRoleIds[opExpr.roleId];
        } else {
          opExpr.roleId = null;
        }
      }
    });

    // We assume that roleId is mainly used in custom code, so we only perform
    // the replacement for those cases, this handle the dataCond which the user
    // can create through the UI, everything else was custom made by the user.
    findExprsInComponent(component).forEach((ref) => {
      const expr = ref.expr;
      if (isKnownCustomCode(expr)) {
        Object.entries(oldToNewRoleIds).forEach(([oldRoleId, newRoleId]) => {
          if (expr.code.includes(oldRoleId)) {
            expr.code = expr.code.replace(
              new RegExp(oldRoleId, "g"),
              newRoleId
            );
          }
        });
      }
    });
  });

  return { site, reevaluateOpIds };
}

export function getAllOpExprSourceIdsUsedInSite(site: Site) {
  const sourceIds = new Set<string>();

  site.components.forEach((component) => {
    findAllDataSourceOpExprForComponent(component).forEach((opExpr) => {
      if (opExpr.sourceId) {
        sourceIds.add(opExpr.sourceId);
      }
    });
  });

  return [...sourceIds];
}

export function fixOpExprSourceIdRefs(
  site: Site,
  oldToNewSourceIds: Record<string, string>
) {
  let reevaluateOpIds = false;

  const fixExpr = (expr?: DataSourceOpExpr | null) => {
    if (expr && expr.sourceId) {
      if (oldToNewSourceIds[expr.sourceId]) {
        expr.sourceId = oldToNewSourceIds[expr.sourceId];
        reevaluateOpIds = true;
      }
    }
  };

  site.components.forEach((component) => {
    findAllDataSourceOpExprForComponent(component).forEach((opExpr) => {
      fixExpr(opExpr);
    });
  });

  return {
    site,
    reevaluateOpIds,
  };
}

export function getArenaFrameActiveVariants(frame: ArenaFrame) {
  return [...frame.targetVariants, ...frame.targetGlobalVariants];
}

export function getFrameContainerType(frame: ArenaFrame) {
  const component = frame.container.component;
  const activeVariants = getArenaFrameActiveVariants(frame);

  const rootEffectiveVS = getEffectiveVariantSettingOfDeepRootElement(
    component,
    activeVariants
  );

  return rootEffectiveVS
    ? getRshContainerType(rootEffectiveVS.rsh())
    : undefined;
}

export const getFrameRootTplComponents = maybeComputedFn(
  function getFrameRootTplComponents(site: Site) {
    return getAllSiteFrames(site).map((f) => f.container);
  }
);

export function isFrameRootTplComponent(site: Site, node: TplNode) {
  return isTplComponent(node) && getFrameRootTplComponents(site).includes(node);
}

export interface HostLessPackage extends Site {
  hostLessPackageInfo: HostLessPackageInfo;
}

export function isHostLessPackage(site: Site): site is HostLessPackage {
  return site.hostLessPackageInfo != null;
}

export interface GeneralUsageSummary {
  components: Component[];
  frames: ArenaFrame[];
}

export function extractComponentUsages(
  site: Site,
  component: Component
): GeneralUsageSummary {
  const components = getReferencingComponents(site, component);
  const usingComponents = components.filter((c): c is Component =>
    isKnownComponent(c)
  );
  const arenaFrames = site.arenas.flatMap((arena) => getArenaFrames(arena));
  const usingFrames = usingComponents.filter(isFrameComponent).map((c) =>
    ensure(
      arenaFrames.find((frame) => frame.container.component === c),
      "Component should have an arena frame"
    )
  );

  return {
    components: usingComponents.filter((c) => !isFrameComponent(c)),
    frames: usingFrames,
  };
}

export function getReferencingComponents(site: Site, component: Component) {
  const referencingComponents: Component[] = [];
  const traverseTpl = (tplRoot: TplNode) =>
    flattenTpls(tplRoot).find(
      (tpl) => isTplComponent(tpl) && tpl.component === component
    );

  for (const c of site.components) {
    if (traverseTpl(c.tplTree)) {
      referencingComponents.push(c);
    }
  }

  return referencingComponents;
}

export const getAllSiteFrames = maybeComputedFn(function getAllSiteFrames(
  site: Site
) {
  return getSiteArenas(site).flatMap((arena) => getArenaFrames(arena));
});

export function getAllSitePageFrames(site: Site) {
  return getSiteArenas(site).flatMap((arena) =>
    isKnownPageArena(arena) ? getArenaFrames(arena) : []
  );
}

export function getReferencingFrames(site: Site, component: Component) {
  const selfArena = isFrameComponent(component)
    ? undefined
    : isPageComponent(component)
    ? getPageArena(site, component)
    : getComponentArena(site, component);
  const arenas = getSiteArenas(site).filter((x) => x !== selfArena);
  return arenas
    .flatMap((arena) => getArenaFrames(arena))
    .filter((f) => f.container.component === component);
}

export function getComponentArena(site: Site, component: Component) {
  // This doesn't check if the user can open this arena, use studioCtx.getComponentArena if need to check
  return site.componentArenas.find((it) => it.component === component);
}

export function getPageArena(site: Site, component: Component) {
  return site.pageArenas.find((it) => it.component === component);
}

export function getDedicatedArena(site: Site, component: Component) {
  return isPageComponent(component)
    ? getPageArena(site, component)
    : getComponentArena(site, component);
}

export function getArenaFromFrame(site: Site, frame: ArenaFrame) {
  return site.arenas.find((arena) => getArenaFrames(arena).includes(frame));
}

/**
 * Look first by name, then by uuid
 */
export function getArenaByNameOrUuidOrPath(
  site: Site,
  arenaNameOrUuidOrPath: string,
  arenaType: ArenaType | undefined
): AnyArena | undefined {
  if (arenaType === "custom") {
    return site.arenas.find((arena) => arena.name === arenaNameOrUuidOrPath);
  } else if (arenaType === "component") {
    return (
      site.componentArenas.find(
        (arena) => arena.component.name === arenaNameOrUuidOrPath
      ) ??
      site.componentArenas.find(
        (arena) => arena.component.uuid === arenaNameOrUuidOrPath
      )
    );
  } else if (arenaType === "page") {
    return (
      site.pageArenas.find(
        (arena) => arena.component.name === arenaNameOrUuidOrPath
      ) ??
      site.pageArenas.find(
        (arena) => arena.component.uuid === arenaNameOrUuidOrPath
      ) ??
      site.pageArenas.find(
        (arena) =>
          arena.component.pageMeta &&
          getMatchingPagePathParams(
            arena.component.pageMeta.path,
            arenaNameOrUuidOrPath
          )
      )
    );
  } else {
    // support legacy ArenaTypes like "focusedframe" or if for some reason the query param is missing
    return (
      getArenaByNameOrUuidOrPath(site, arenaNameOrUuidOrPath, "custom") ??
      getArenaByNameOrUuidOrPath(site, arenaNameOrUuidOrPath, "page") ??
      getArenaByNameOrUuidOrPath(site, arenaNameOrUuidOrPath, "component")
    );
  }
}

/**
 * Returns whether the given arena still exists in the site
 */
export const isValidArena = maybeComputedFn((site: Site, arena: AnyArena) => {
  return switchType(arena)
    .when(ComponentArena, (componentArena) =>
      site.componentArenas.find((it) => it === componentArena)
    )
    .when(PageArena, (pageArena) =>
      site.pageArenas.find((it) => it === pageArena)
    )
    .when(Arena, (customArena) => site.arenas.find((it) => it === customArena))
    .result();
});

/**
 * Traverse site.components and remove ComponentInstance types referencing a
 * given component.
 */
export function removeReferencingTypeInstances(
  site: Site,
  comp: CodeComponent
) {
  for (const c of site.components) {
    // Remove references from slot params
    for (const p of c.params) {
      if (isRenderableType(p.type)) {
        removeWhere(
          p.type.params,
          (t) => isKnownComponentInstance(t) && t.component === comp
        );
      } else if (isRenderFuncType(p.type)) {
        removeWhere(p.type.allowed, (t) => t.component === comp);
      }
    }
  }
}

/**
 * Traverse site.components and remove PageHref references to a given
 * page.
 */
export function removeReferencingLinks(
  site: Site,
  page: PageComponent,
  opts?: {
    convertPageHrefToCode?: boolean;
  }
) {
  const isHRefToPage = (expr: Expr | null | undefined): expr is PageHref =>
    isKnownPageHref(expr) && expr.page === page;

  function getNewExprToReferenceExpr(component: Component, oldExpr: PageHref) {
    if (opts?.convertPageHrefToCode) {
      return convertHrefExprToCodeExpr(site, component, oldExpr);
    }
    return null;
  }

  for (const c of componentsReferecerToPageHref(site, page)) {
    const removeFromEventHandler = (expr: EventHandler) => {
      for (const interaction of expr.interactions) {
        for (const arg of [...interaction.args]) {
          const argExpr = arg.expr;
          if (isHRefToPage(argExpr)) {
            const newExpr = getNewExprToReferenceExpr(c, argExpr);
            if (newExpr) {
              arg.expr = newExpr;
            } else {
              remove(interaction.args, arg);
            }
          } else if (
            isFallbackableExpr(argExpr) &&
            isHRefToPage(argExpr.fallback)
          ) {
            argExpr.fallback = getNewExprToReferenceExpr(c, argExpr.fallback);
          }
        }
      }
    };

    // Remove references from component props default values.
    for (const p of c.params) {
      if (
        p.defaultExpr &&
        flattenExprs(p.defaultExpr).some((e) => isHRefToPage(e))
      ) {
        p.defaultExpr = null;
      }
      if (
        p.previewExpr &&
        flattenExprs(p.previewExpr).some((e) => isHRefToPage(e))
      ) {
        p.previewExpr = null;
      }
    }

    // Remove references from attributes.
    for (const tpl of flattenTpls(c.tplTree)) {
      if (!isTplVariantable(tpl)) {
        continue;
      }

      for (const vs of tpl.vsettings) {
        for (const [attr, expr] of [...Object.entries(vs.attrs)]) {
          if (isKnownEventHandler(expr)) {
            removeFromEventHandler(expr);
          } else if (isHRefToPage(expr) && opts?.convertPageHrefToCode) {
            const codeExpr = convertHrefExprToCodeExpr(site, c, expr);
            if (codeExpr) {
              vs.attrs[attr] = codeExpr;
            } else {
              delete vs.attrs[attr];
            }
          } else if (flattenExprs(expr).some((e) => isHRefToPage(e))) {
            delete vs.attrs[attr];
          }
        }
        for (const vsArg of [...vs.args]) {
          if (isKnownEventHandler(vsArg.expr)) {
            removeFromEventHandler(vsArg.expr);
          } else if (isHRefToPage(vsArg.expr) && opts?.convertPageHrefToCode) {
            const codeExpr = convertHrefExprToCodeExpr(site, c, vsArg.expr);
            if (codeExpr) {
              vsArg.expr = codeExpr;
            } else {
              remove(vs.args, vsArg);
            }
          } else if (flattenExprs(vsArg.expr).some((e) => isHRefToPage(e))) {
            remove(vs.args, vsArg);
          }
        }
      }
    }
  }
}

export function visitComponentRefs(
  site: Site,
  component: Component,
  tplInstanceFn: (tpl: TplComponent, owner?: Component) => void,
  exprFn?: (expr: TplRef, ownerTpl: TplNode) => void
) {
  const componentRefs = ensure(
    componentToReferencers(site).get(component),
    `All site components should be mapped but ${component.name} was not found`
  );
  for (const c of componentRefs) {
    [...flattenTpls(c.tplTree)].forEach((tpl) => {
      if (isTplComponent(tpl) && tpl.component === component) {
        tplInstanceFn(tpl, c);
      }
      findExprsInNode(tpl).forEach(({ expr }) => {
        if (isKnownTplRef(expr) && isTplComponent(expr.tpl)) {
          exprFn?.(expr, tpl);
        }
      });
    });
  }
  for (const tpl of site.globalContexts) {
    if (tpl.component === component) {
      tplInstanceFn(tpl);
    }
  }
}

export const DEFAULT_THEME_TYPOGRAPHY = {
  "font-family": "Roboto",
  "font-size": "16px",
  "font-weight": "400",
  color: "#535353",
  "text-align": "left",
  "line-height": "1.5",
};

const DEFAULT_STYLE_BUNDLES: Dict<CSSProperties> = {
  heading: {
    fontFamily: "Inter",
    color: "#000000",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    listStylePosition: "outside",
    paddingLeft: "40px",
    position: "relative",
  },
  pre: {
    background: new ColorFill({ color: "#f8f8f8" }).showCss(),
    borderBottomColor: "#dddddd",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderLeftColor: "#dddddd",
    borderLeftStyle: "solid",
    borderLeftWidth: "1px",
    borderRightColor: "#dddddd",
    borderRightStyle: "solid",
    borderRightWidth: "1px",
    borderTopColor: "#dddddd",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    borderBottomLeftRadius: "3px",
    borderBottomRightRadius: "3px",
    borderTopLeftRadius: "3px",
    borderTopRightRadius: "3px",
    fontFamily: "Inconsolata",
  },
};

// These defaults are based in part on the Vercel design system.

export const DEFAULT_THEME_STYLES: Dict<CSSProperties> = {
  h1: {
    ...DEFAULT_STYLE_BUNDLES.heading,
    fontSize: "72px",
    fontWeight: 900,
    letterSpacing: "-4px",
    lineHeight: "1",
  },
  h2: {
    ...DEFAULT_STYLE_BUNDLES.heading,
    fontSize: "48px",
    fontWeight: 700,
    letterSpacing: "-1px",
    lineHeight: "1.1",
  },
  h3: {
    ...DEFAULT_STYLE_BUNDLES.heading,
    fontSize: "32px",
    fontWeight: 600,
    letterSpacing: "-0.8px",
    lineHeight: "1.2",
  },
  h4: {
    ...DEFAULT_STYLE_BUNDLES.heading,
    fontSize: "24px",
    fontWeight: 600,
    letterSpacing: "-0.5px",
    lineHeight: "1.3",
  },
  h5: {
    ...DEFAULT_STYLE_BUNDLES.heading,
    fontSize: "20px",
    fontWeight: 600,
    letterSpacing: "-0.3px",
    lineHeight: "1.5",
  },
  h6: {
    ...DEFAULT_STYLE_BUNDLES.heading,
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "1.5",
  },
  a: {
    color: "#0070f3",
  },
  "a:hover": {
    color: "#3291ff",
  },
  blockquote: {
    borderLeftColor: "#dddddd",
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    color: "#888888",
    paddingLeft: "10px",
  },
  code: {
    ...DEFAULT_STYLE_BUNDLES.pre,
    paddingBottom: "1px",
    paddingLeft: "4px",
    paddingRight: "4px",
    paddingTop: "1px",
  },
  pre: {
    ...DEFAULT_STYLE_BUNDLES.pre,
    paddingBottom: "3px",
    paddingLeft: "6px",
    paddingRight: "6px",
    paddingTop: "3px",
  },
  ol: {
    ...DEFAULT_STYLE_BUNDLES.list,
    listStyleType: "decimal",
  },
  ul: {
    ...DEFAULT_STYLE_BUNDLES.list,
    listStyleType: "disc",
  },
};

export function createDefaultTheme() {
  return new Theme({
    active: true,
    defaultStyle: new Mixin({
      name: "Default Typography",
      rs: mkRuleSet({
        values: Object.fromEntries(
          typographyCssProps.map((p) => [
            p,
            DEFAULT_THEME_TYPOGRAPHY[p] || getCssInitial(p, undefined),
          ])
        ),
      }),
      preview: undefined,
      uuid: mkShortId(),
      forTheme: true,
      variantedRs: [],
    }),
    layout: new ThemeLayoutSettings({
      rs: new RuleSet({
        values: {},
        mixins: [],
      }),
    }),
    styles: Object.entries(DEFAULT_THEME_STYLES).map(
      ([selector, styles]) =>
        new ThemeStyle({
          selector,
          style: new Mixin({
            name: `Default "${selector}"`,
            rs: cssPropsToRuleSet(styles),
            preview: undefined,
            uuid: mkShortId(),
            forTheme: true,
            variantedRs: [],
          }),
        })
    ),
    addItemPrefs: {},
  });
}

export function allGlobalVariants(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
): Variant[] {
  return allGlobalVariantGroups(site, {
    includeDeps: opts.includeDeps,
  }).flatMap((vg) => vg.variants);
}

export function allGlobalVariantGroups(
  site: Site,
  opts: {
    includeDeps?: DependencyWalkScope;
    excludeEmpty?: boolean;
    excludeHostLessPackages?: boolean;
  } = {}
): GlobalVariantGroup[] {
  let res = [...site.globalVariantGroups];
  if (opts.includeDeps) {
    res.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap((dep) =>
        !opts.excludeHostLessPackages || !isHostLessPackage(dep.site)
          ? dep.site.globalVariantGroups
          : []
      )
    );
  }
  if (opts.excludeEmpty) {
    res = res.filter((x) => x.variants.length > 0);
  }
  return res;
}

/**
 * Returns all attached tpls from `site_`, including in project dependencies.
 * This is the mirror of isTplAttachedToSite() and should follwo the same
 * logic.
 * @param site_
 * @returns
 */
export function getAllAttachedTpls(site_: Site) {
  const tpls = new Set<TplNode>();

  const collectFromSite = (site: Site) => {
    for (const comp of site.components) {
      flattenComponent(comp).forEach((tpl) => tpls.add(tpl));
    }

    getFrameRootTplComponents(site).forEach((tpl) => tpls.add(tpl));

    site.globalContexts.forEach((tpl) => tpls.add(tpl));

    site.projectDependencies.forEach((dep) => collectFromSite(dep.site));
  };

  collectFromSite(site_);
  return tpls;
}

/**
 * Returns true if `tpl` is still attached to the `site`.
 */
export function isTplAttachedToSite(site: Site, tpl: TplNode) {
  if (
    isTplComponent(tpl) &&
    (getFrameRootTplComponents(site).includes(tpl) ||
      site.globalContexts.includes(tpl))
  ) {
    return true;
  }
  const comp = tryGetTplOwnerComponent(tpl);
  return (
    !!comp &&
    (site.components.includes(comp) ||
      site.projectDependencies.some((dep) =>
        dep.site.components.includes(comp)
      )) &&
    !isDetachedTplComponentArgDescendant(tpl)
  );
}

/**
 * Returns true if `tpl` is the descendant of some node whose parent is a
 * TplComponent, but the parent does not include tpl in any of its args.  This
 * can happen when a tpl has been detached but its parent pointer isn't
 * updated; and _that_ can happen because the parent pointer isn't "tracked" by
 * our observable-model framework, so when restoring records, we do not restore
 * the parent pointer.  We do fix up the parent pointers of attached nodes, but
 * we can't do the same for detached nodes.
 */
function isDetachedTplComponentArgDescendant(tpl: TplNode) {
  while (tpl.parent) {
    if (isTplComponent(tpl.parent)) {
      const arg = getSlotArgs(tpl.parent).find(
        (a) => isKnownRenderExpr(a.expr) && a.expr.tpl.includes(tpl)
      );
      if (!arg) {
        return true;
      }
    }
    tpl = tpl.parent;
  }
  return false;
}

export function localComponents(site: Site) {
  return [...site.components];
}

export function allComponents(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
) {
  const components = localComponents(site);
  if (opts.includeDeps) {
    components.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.components
      )
    );
  }
  return components;
}

export function localStyleTokens(site: Site) {
  return [...site.styleTokens];
}

export function allStyleTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
) {
  const tokens = localStyleTokens(site);
  if (opts.includeDeps) {
    tokens.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.styleTokens
      )
    );
  }
  return tokens;
}

export function allStyleTokensDict(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope }
) {
  return keyBy(allStyleTokens(site, opts), (t) => t.uuid);
}

export function allColorTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
): StyleToken[] {
  return allTokensOfType(site, TokenType.Color, opts);
}

export function allTokensOfType(
  site: Site,
  tokenType: TokenType,
  opts: { includeDeps?: DependencyWalkScope } = {}
): StyleToken[] {
  const styleTokens = allStyleTokens(site, opts);
  return styleTokens.filter((t) => t.type === tokenType);
}

export function localMixins(site: Site) {
  return [...site.mixins];
}

export function allMixins(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
) {
  const mixins = localMixins(site);
  if (opts.includeDeps) {
    mixins.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.mixins
      )
    );
  }
  return mixins;
}

export function localImageAssets(site: Site) {
  return [...site.imageAssets];
}

export function localIcons(site: Site) {
  return localImageAssets(site).filter((x) => isIcon(x));
}

export function allImageAssets(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
) {
  const images = localImageAssets(site);
  if (opts.includeDeps) {
    images.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.imageAssets
      )
    );
  }
  return images;
}

type StyleTokenWithProjectInfo = Omit<
  {
    projectName: string;
    projectId: string;
  } & StyleToken,
  "typeTag"
>;

export type CssProjectDependencies = StyleTokenWithProjectInfo[];

export function allImportedStyleTokensWithProjectInfo(site: Site) {
  return [
    ...walkDependencyTree(site, "all").flatMap((d) =>
      d.site.styleTokens.flatMap((token) => ({
        ...token,
        projectName: d.name,
        projectId: d.projectId,
      }))
    ),
  ];
}

// Only editable if owned in my site, not a dependency
export function isEditable(
  site: Site,
  asset: Component | Mixin | ImageAsset
): boolean {
  return (
    (isKnownComponent(asset) &&
      !isCodeComponent(asset) &&
      localComponents(site).includes(asset)) ||
    (isKnownMixin(asset) && localMixins(site).includes(asset)) ||
    (isKnownImageAsset(asset) && localImageAssets(site).includes(asset))
  );
}

export function isStyleTokenEditable(
  site: Site,
  styleToken: StyleToken,
  vsh: VariantedStylesHelper | undefined
): boolean {
  return (
    !styleToken.isRegistered &&
    localStyleTokens(site).includes(styleToken) &&
    (vsh === undefined || vsh.canUpdateToken())
  );
}

export function getSiteScreenSizes(site: Site) {
  if (site.pageArenas.length > 0) {
    const first = site.pageArenas[0];
    if (first.matrix.rows.length > 0) {
      const firstRow = first.matrix.rows[0];
      return firstRow.cols.map((it) => ({
        width: it.frame.width,
        height: it.frame.height!,
      }));
    }
  }

  return defaultResponsiveSettings.screenSizes;
}

export function siteIsEmpty(site: Site) {
  return getSiteArenas(site).length === 0 && site.components.length === 0;
}

export function getSiteArenas(
  site: Site,
  opts?: { noSorting?: boolean }
): AnyArena[] {
  return [
    ...site.arenas,
    ...(opts?.noSorting
      ? site.pageArenas
      : naturalSort(site.pageArenas, (it) => it.component.name)),
    ...(opts?.noSorting
      ? site.componentArenas
      : naturalSort(site.componentArenas, (it) => it.component.name)),
  ];
}

export function getResponsiveStrategy(site: Site) {
  const screenVariants =
    site.activeScreenVariantGroup?.variants.map((it) =>
      it.mediaQuery ? parseScreenSpec(it.mediaQuery) : undefined
    ) || [];

  return screenVariants.length > 0
    ? screenVariants.every((it) => it?.minWidth && !it?.maxWidth)
      ? ResponsiveStrategy.mobileFirst
      : ResponsiveStrategy.desktopFirst
    : ResponsiveStrategy.unknown;
}

export function ensureScreenVariantsOrderOnMatrices(site: Site) {
  const strategy = getResponsiveStrategy(site);

  for (const arena of getSiteArenas(site)) {
    if (isPageArena(arena)) {
      for (const row of arena.matrix.rows) {
        const orderedCols = orderBy(row.cols, (it) => it.frame.width, [
          strategy === ResponsiveStrategy.mobileFirst ? "asc" : "desc",
        ]);

        row.cols.splice(0, row.cols.length, ...orderedCols);
      }
    } else if (isComponentArena(arena) && site.activeScreenVariantGroup) {
      ensureComponentArenaColsOrder(
        site,
        arena.component,
        site.activeScreenVariantGroup
      );
    }
  }
}

export function getNonTransitiveDepDefaultComponents(site: Site) {
  const validKinds = keys(site.defaultComponents).filter((kind) => {
    const component = site.defaultComponents[kind];
    return site.components.some((c) => c === component);
  });

  return pick(site.defaultComponents, validKinds);
}
