import { removeFromArray } from "@/wab/commons/collections";
import { Lookup, pathSelector } from "@/wab/commons/path-selector";
import { TplMgr } from "@/wab/shared/TplMgr";
import { Bundler, addrKey } from "@/wab/shared/bundler";
import { toVarName } from "@/wab/shared/codegen/util";
import { spanWhile } from "@/wab/shared/collections";
import {
  arrayEq,
  assert,
  ensure,
  isJsonScalar,
  isLiteralObject,
  isPrimitive,
  maybe,
  mkShortId,
  pathGet,
  sortBy,
  strictZip,
  swallow,
  tuple,
  unexpected,
  uniqueName,
  withoutNils,
  xGroupBy,
  xIntersect,
  xKeyBy,
  xUnion,
} from "@/wab/shared/common";
import {
  PageComponent,
  getComponentDisplayName,
} from "@/wab/shared/core/components";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { SplitType } from "@/wab/shared/core/splits";
import {
  flattenTpls,
  isTplNamable,
  trackComponentRoot,
  trackComponentSite,
} from "@/wab/shared/core/tpls";
import mobx from "@/wab/shared/import-mobx";
import { instUtil } from "@/wab/shared/model/InstUtil";
import * as classes from "@/wab/shared/model/classes";
import {
  Arena,
  ArenaChild,
  Component,
  ComponentArena,
  ImageAsset,
  Mixin,
  ObjInst,
  PageArena,
  Param,
  Site,
  Split,
  State,
  StyleToken,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import {
  Class,
  Field,
  isWeakRefField,
  withoutUids,
} from "@/wab/shared/model/model-meta";
import {
  NodeCtx,
  NodeFieldCtx,
  areSameInstType,
  assertSameInstType,
  createNodeCtx,
  nextCtx,
  walkModelTree,
} from "@/wab/shared/model/model-tree-util";
import {
  fixDanglingReferenceConflicts,
  getEmptyDeletedAssetsSummary,
  updateSummaryFromDeletedInstances,
} from "@/wab/shared/server-updates-utils";
import {
  InvariantError,
  assertSiteInvariants,
} from "@/wab/shared/site-invariants";
import {
  countBy,
  difference,
  differenceBy,
  groupBy,
  intersectionBy,
  isString,
  pick,
  set,
  uniq,
  uniqBy,
  zip,
} from "lodash";
import isEqual from "lodash/isEqual";

// site-diffs has circular dependencies
// keeping these imports last seems to make sure everything works properly
import {
  fixDuplicatedCodeComponents,
  fixPagePaths,
  fixSwappedTplComponents,
  fixVirtualSlotArgs,
} from "@/wab/shared/site-diffs/merge-components";
import { fixProjectDependencies } from "@/wab/shared/site-diffs/merge-deps";
import { fixDuplicatedRegisteredTokens } from "@/wab/shared/site-diffs/merge-tokens";
import {
  FieldConflictDescriptorMeta,
  modelConflictsMeta,
} from "@/wab/shared/site-diffs/model-conflicts-meta";

export type UpdateData = {
  field: Field;
  fieldConflictMeta: FieldConflictDescriptorMeta;
  updatedFieldValue: {} | undefined;
  updatedInst: ObjInst | undefined;
  updatedPath: string[];
  origFieldValue: {} | undefined;
  origInst: ObjInst | undefined;
  origPath: string[];
};

export interface ConflictDetails {
  pathStr: string;
  leftUpdate: UpdateData;
  rightUpdate: UpdateData;
}

export interface GenericDirectConflict {
  conflictType: "generic";
  leftRoot: ObjInst;
  rightRoot: ObjInst;
  leftRootPath: string[];
  rightRootPath: string[];
  group: string;
  conflictDetails: ConflictDetails[];
}

export type BranchSide = "left" | "right";

export type SpecialDirectConflict = {
  conflictType: "special";
  objectType: "components";
  objectInsts: [ObjInst, ObjInst];
  conflictParts: string[];
  pathStr: string;
  pickSide: (side: BranchSide) => void;
};

export type DirectConflict = SpecialDirectConflict | GenericDirectConflict;

export type AutoReconciliation =
  | {
      violation: "duplicate-names";
      mergedInst: ObjInst;
      mergedParent: ObjInst;
      fieldName: string;
      origName: string;
      renamedTo: string;
    }
  | {
      violation: "duplicate-page-path";
      mergedInst: PageComponent;
      origPath: string;
      newPath: string;
    };

export type AutoReconciliationOfDuplicateNames = Extract<
  AutoReconciliation,
  { violation: "duplicate-names" }
>;

export type MergeAuto = {
  status: "merged";
  autoReconciliations: AutoReconciliation[];
  mergedSite: Site;
};

export type MergeDirectConflict = {
  status: "needs-resolution";
  autoReconciliations: AutoReconciliation[];
  specialDirectConflicts: SpecialDirectConflict[];
  genericDirectConflicts: GenericDirectConflict[];
  invariantErrors: InvariantError[];
  mergedSite: Site;
};

export type MergeStep = MergeAuto | MergeDirectConflict;

function isContentsConflictType(fm: FieldConflictDescriptorMeta) {
  return (
    fm === "contents" ||
    (typeof fm === "object" &&
      "conflictType" in fm &&
      fm.conflictType === "contents") ||
    (typeof fm === "object" && "contents" in fm && fm.contents)
  );
}

function shouldCloneContents(fm: FieldConflictDescriptorMeta, fieldValue: any) {
  const shouldExclude = () =>
    typeof fm === "object" &&
    "conflictType" in fm &&
    fm.conflictType === "contents" &&
    fm.excludeFromClone(fieldValue);

  return isContentsConflictType(fm) && !shouldExclude();
}

function valueChanged(
  v1: any,
  v2: any,
  bundler: Bundler,
  fieldMeta: FieldConflictDescriptorMeta,
  fieldInfoForArrayKey: FieldInfo | undefined,
  deep: boolean
): boolean {
  if (isPrimitive(v1) || isPrimitive(v2)) {
    return v1 !== v2;
  } else if (Array.isArray(v1)) {
    // Note: we don't need to worry here about order-insensitivity since we can later filter out these changes in the
    // conflict detection stage. (Order can be different there anyway between left and right.)
    if (!Array.isArray(v2)) {
      return true;
    }
    const filteredV1 = v1.filter((v) => {
      if (
        typeof fieldMeta === "object" &&
        !!(fieldMeta as any)?.excludeFromMerge
      ) {
        return !swallow(() => (fieldMeta as any).excludeFromMerge(v));
      }
      return true;
    });
    const filteredV2 = v2.filter((v) => {
      if (
        typeof fieldMeta === "object" &&
        !!(fieldMeta as any)?.excludeFromMerge
      ) {
        return !swallow(() => (fieldMeta as any).excludeFromMerge(v));
      }
      return true;
    });
    if (fieldInfoForArrayKey) {
      const getKey = deriveKeyFunc(fieldMeta, bundler, fieldInfoForArrayKey);
      // Checks for the pair `[key, value]` instead of just `value`.
      const transformedV1 = filteredV1.map((v) => [getKey(v), v] as const);
      const transformedV2 = filteredV2.map((v) => [getKey(v), v] as const);
      return (
        transformedV1.length !== transformedV2.length ||
        transformedV1.some(([key1, vItem1], i) => {
          const [key2, vItem2] = transformedV2[i];
          if (key1 !== key2) {
            return true;
          }
          return valueChanged(
            vItem1,
            vItem2,
            bundler,
            fieldMeta,
            // We don't need to forward `fieldInfoForArrayKey` as it must only be used
            // at the top level of array fields (not arrays inside objects etc)
            undefined,
            deep
          );
        })
      );
    }
    return (
      filteredV1.length !== filteredV2.length ||
      filteredV1.some((v, i) =>
        valueChanged(v, filteredV2[i], bundler, fieldMeta, undefined, deep)
      )
    );
  } else if (isLiteralObject(v1)) {
    const keys = [...Object.keys(v1)];
    if ([...Object.keys(v2)].length !== keys.length) {
      return true;
    }
    return keys.some(
      (k) =>
        !(k in v2) ||
        valueChanged(v1[k], v2[k], bundler, fieldMeta, undefined, deep)
    );
  } else if (instUtil.isObjInst(v1)) {
    const cls = instUtil.getInstClass(v1);
    if (!instUtil.isObjInst(v2)) {
      return true;
    }
    if (instUtil.getInstClass(v1) !== instUtil.getInstClass(v2)) {
      return true;
    }
    if (bundler.addrOf(v1).iid === bundler.addrOf(v2).iid) {
      return false;
    }
    if (isContentsConflictType(fieldMeta)) {
      if (deep) {
        for (const field of meta.allFields(cls)) {
          const nextFieldMeta = modelConflictsMeta[cls.name][field.name];
          if (
            valueChanged(
              v1[field.name],
              v2[field.name],
              bundler,
              nextFieldMeta,
              undefined,
              !isWeakRefField(field)
            )
          ) {
            return true;
          }
        }
      }
      return false;
    } else {
      return true;
    }
  } else {
    unexpected();
  }
}

export function getArrayKey(bundler: Bundler, v: any, ctx: FieldInfo) {
  assert(
    instUtil.isObjInst(v) ||
      isPrimitive(v) ||
      isLiteralObject(v) ||
      Array.isArray(v),
    `Can only compute a merge key in ${ctx.cls.name}.${ctx.field.name} for an ObjInst, a primitive value or a literal object, but got: ${v}`
  );
  if (isLiteralObject(v)) {
    return `{${Object.entries(v)
      .map(([k, val]) => `${k}:(${getArrayKey(bundler, val, ctx)})`)
      .join(",")}}`;
  }
  if (Array.isArray(v)) {
    return `[${v
      .map((val) => `(${getArrayKey(bundler, val, ctx)})`)
      .join(",")}]`;
  }
  return instUtil.isObjInst(v) ? `iid=${bundler.addrOf(v).iid}` : v;
}

function getScalarKey(k: any, bundler: Bundler, ctx: FieldInfo) {
  if (Array.isArray(k)) {
    return k.map((v) => getScalarKey(v, bundler, ctx));
  } else if (isJsonScalar(k) || instUtil.isObjInst(k)) {
    return getArrayKey(bundler, k, ctx);
  } else {
    unexpected(
      `When computing merge key for ${ctx.cls.name}.${ctx.field.name}, merge key must be a scalar, ObjInst, or an array of such`
    );
  }
}

interface FieldInfo {
  cls: Class;
  field: Field;
}

export function deriveKeyFunc(
  fm: FieldConflictDescriptorMeta,
  bundler: Bundler,
  ctx: FieldInfo
) {
  return function getKey(x: any) {
    if (
      !isString(fm) &&
      "arrayType" in fm &&
      (fm.arrayType === "ordered" || fm.arrayType === "unordered") &&
      fm.conflictType === "merge" &&
      ("mergeKey" in fm || "mergeKeyFn" in fm)
    ) {
      const key =
        "mergeKey" in fm
          ? pathGet(x, fm.mergeKey.split("."))
          : fm.mergeKeyFn(x);
      return JSON.stringify(getScalarKey(key, bundler, ctx));
    } else {
      return getArrayKey(bundler, x, ctx);
    }
  };
}

/**
 * Deep clone the values of a field marked as "contents"
 */
function cloneContents(value: any, bundler: Bundler, siteUuid: string) {
  const inst2clone = new Map<ObjInst, ObjInst>();
  const rec = (v: any, isWeakRef: boolean): any => {
    if (isPrimitive(v)) {
      return v;
    } else if (Array.isArray(v)) {
      return v.map((val) => rec(val, isWeakRef));
    } else if (isLiteralObject(v)) {
      return Object.fromEntries(
        Object.entries(v).map(([key, val]) => [key, rec(val, isWeakRef)])
      );
    } else if (instUtil.isObjInst(v)) {
      if (isWeakRef) {
        // Fix parent refs
        return inst2clone.get(v) ?? v;
      }
      const cls = instUtil.getInstClass(v);
      const cloned = new classes[cls.name](
        Object.fromEntries(
          Object.entries(
            pick(
              v,
              instUtil.allInstFields(v).map((f) => f.name)
            )
          )
        )
      );
      inst2clone.set(v, cloned);
      instUtil.allInstFields(v).forEach((f) => {
        cloned[f.name] = rec(v[f.name], isWeakRefField(f));
        if (f.name === "uuid") {
          // Avoid duplicate uuids
          cloned[f.name] = mkShortId();
        }
      });
      generateIidForInst(cloned, bundler, siteUuid);
      return cloned;
    } else {
      unexpected();
    }
  };
  return rec(value, false);
}

function handleUpdatedValue<T>(
  fieldMeta: FieldConflictDescriptorMeta,
  updatedValue: T,
  parentInst: ObjInst,
  bundler: Bundler
): T {
  if (shouldCloneContents(fieldMeta, updatedValue)) {
    // Whenever a field marked as "contents" changes, we deep clone its values.
    return cloneContents(
      updatedValue,
      bundler,
      bundler.addrOf(parentInst).uuid
    );
  }
  if (
    fieldMeta &&
    typeof fieldMeta === "object" &&
    "handleUpdatedValues" in fieldMeta
  ) {
    return fieldMeta.handleUpdatedValues(
      updatedValue as any,
      parentInst,
      bundler
    ) as any as T;
  }
  return updatedValue;
}

// Returns Map<leftPath, UpdateData>
export function getInstUpdates(
  origCtx: NodeCtx,
  updatedCtx: NodeCtx,
  bundler: Bundler,
  updates = new Map<string, UpdateData>()
): Map<string, UpdateData> {
  const { node: origInst, path: origPath } = origCtx;
  const { node: updatedInst, path: updatedPath } = updatedCtx;

  const cls = instUtil.getInstClass(
    ensure(origInst ?? updatedInst, "Either side must exist")
  );
  if (origInst && updatedInst) {
    assertSameInstType(origInst, updatedInst);
  }

  for (const field of meta.allFields(cls)) {
    const rec = (_origCtx: NodeCtx, _updatedCtx: NodeCtx) => {
      const { node: origVal } = _origCtx;
      const { node: updatedVal } = _updatedCtx;

      if (Array.isArray(origVal) || Array.isArray(updatedVal)) {
        const xs = origVal ?? [];
        const ys = updatedVal ?? [];
        assert(
          Array.isArray(xs) && Array.isArray(ys),
          `Both left and right values should be arrays`
        );
        assert(
          xs.length === ys.length,
          "Arrays should have passed valueChanged equality test by this point"
        );
        const getKey = deriveKeyFunc(fieldMeta, bundler, { field, cls });
        return xs.forEach((v, i) =>
          rec(
            nextCtx(_origCtx, `${i}`, getKey(v)),
            nextCtx(_updatedCtx, `${i}`, getKey(v))
          )
        );
      } else if (isLiteralObject(origVal) || isLiteralObject(updatedVal)) {
        const xs = origVal ?? {};
        const ys = updatedVal ?? {};
        assert(
          isLiteralObject(xs) && isLiteralObject(ys),
          `Both left and right values should be objects`
        );
        const keys = uniq([...Object.keys(xs), ...Object.keys(ys)]);
        return keys.forEach((k) =>
          rec(nextCtx(_origCtx, k), nextCtx(_updatedCtx, k))
        );
      } else if (
        instUtil.isObjInst(origVal) ||
        instUtil.isObjInst(updatedVal)
      ) {
        return getInstUpdates(_origCtx, _updatedCtx, bundler, updates);
      } else if (isPrimitive(origVal) || isPrimitive(updatedVal)) {
        return;
      } else {
        unexpected();
      }
    };
    const fieldMeta = modelConflictsMeta[cls.name][field.name];
    const origFieldCtx = nextCtx(origCtx, field.name);
    const updatedFieldCtx = nextCtx(updatedCtx, field.name);
    const origValue = origFieldCtx.node;
    const updatedValue = updatedFieldCtx.node;
    if (
      typeof fieldMeta === "object" &&
      fieldMeta.conflictType === "special" &&
      !!fieldMeta.handler
    ) {
      continue;
    }
    if (
      valueChanged(
        origValue,
        updatedValue,
        bundler,
        fieldMeta,
        { cls, field },
        false
      )
    ) {
      updates.set(
        JSON.stringify(
          zip(origFieldCtx.path, origFieldCtx.keyPath ?? []).map(
            ([a, b]) => b ?? a
          )
        ),
        {
          field,
          fieldConflictMeta: fieldMeta,
          updatedInst,
          origInst,
          updatedFieldValue:
            updatedValue && updatedInst
              ? handleUpdatedValue(
                  fieldMeta,
                  updatedValue,
                  updatedInst,
                  bundler
                )
              : updatedValue,
          origFieldValue: origValue,
          origPath: origPath,
          updatedPath,
        }
      );
      if (
        !isWeakRefField(field) &&
        (Array.isArray(origValue) || Array.isArray(updatedValue)) &&
        fieldMeta !== "atomic" &&
        fieldMeta?.arrayType !== "atomic"
      ) {
        const getKey = deriveKeyFunc(fieldMeta, bundler, { cls, field });
        const origMap = xKeyBy(origValue ?? [], getKey);
        const updatedMap = xKeyBy(updatedValue ?? [], getKey);
        const allKeys = xUnion(
          new Set(origMap.keys()),
          new Set(updatedMap.keys())
        );
        for (const key of allKeys) {
          const origChild = origMap.get(key);
          const origIndex = origValue?.indexOf(origChild);
          const updatedChild = updatedMap.get(key);
          const updatedIndex = updatedValue?.indexOf(updatedChild);
          if (
            updatedChild !== undefined &&
            (typeof fieldMeta !== "object" ||
              (!swallow(() => fieldMeta?.excludeFromMerge?.(origChild)) &&
                !swallow(() => fieldMeta?.excludeFromMerge?.(updatedChild))))
          ) {
            rec(
              nextCtx(origFieldCtx, `${origIndex}`, key),
              nextCtx(updatedFieldCtx, `${updatedIndex}`, key)
            );
          }
        }
      }
    } else if (!isWeakRefField(field)) {
      if (Array.isArray(origValue) && Array.isArray(updatedValue)) {
        const getKey = deriveKeyFunc(fieldMeta, bundler, { cls, field });
        const origMap = xKeyBy(origValue ?? [], getKey);
        const updatedMap = xKeyBy(updatedValue ?? [], getKey);
        const allKeys = xUnion(
          new Set(origMap.keys()),
          new Set(updatedMap.keys())
        );
        for (const key of allKeys) {
          const origChild = origMap.get(key);
          const origIndex = origValue?.indexOf(origChild);
          const updatedChild = updatedMap.get(key);
          const updatedIndex = updatedValue?.indexOf(updatedChild);
          if (
            typeof fieldMeta !== "object" ||
            (!swallow(() => fieldMeta?.excludeFromMerge?.(origChild)) &&
              !swallow(() => fieldMeta?.excludeFromMerge?.(updatedChild)))
          ) {
            rec(
              nextCtx(origFieldCtx, `${origIndex}`, key),
              nextCtx(updatedFieldCtx, `${updatedIndex}`, key)
            );
          }
        }
      } else {
        rec(origFieldCtx, updatedFieldCtx);
      }
    }
  }

  return updates;
}

export function cloneFieldValueToMergedSite(
  field: Field,
  v: any,
  branch: Site,
  mergedSite: Site,
  bundler: Bundler
): any {
  const cloneValue = (_v: any) =>
    cloneFieldValueToMergedSite(field, _v, branch, mergedSite, bundler);
  if (isPrimitive(v)) {
    return v;
  } else if (Array.isArray(v)) {
    return v.map((val) => cloneValue(val));
  } else if (isLiteralObject(v)) {
    return Object.fromEntries(
      Object.entries(v).map(([key, val]) => [key, cloneValue(val)])
    );
  } else if (instUtil.isObjInst(v)) {
    return cloneObjInstToMergedSite(v, branch, mergedSite, bundler);
  } else {
    unexpected();
  }
}

export function cloneObjInstToMergedSite<T extends ObjInst>(
  inst: T,
  branch: Site,
  mergedSite: Site,
  bundler: Bundler
): T {
  const branchBundleId = bundler.addrOf(branch).uuid;
  const mergedBundleId = bundler.addrOf(mergedSite).uuid;

  if (bundler.addrOf(inst).uuid !== branchBundleId) {
    // External instance
    return inst;
  }

  const iid = bundler.addrOf(inst).iid;
  const clsName = instUtil.getInstClassName(inst);
  const maybeExistingObj = bundler.objByAddr({ uuid: mergedBundleId, iid });
  if (maybeExistingObj) {
    // No need to clone - already exists in the merged site
    const clsNameInMergedSite = instUtil.getInstClassName(maybeExistingObj);
    assert(
      clsNameInMergedSite === clsName,
      `Failed to clone instance ${clsName}: iid ${iid} is ${clsNameInMergedSite} in the merged site`
    );
    return maybeExistingObj as T;
  }

  // We first create the cloned instance (so it has an address) and then we fix
  // its fields
  const clone: T = new classes[clsName](
    Object.fromEntries(
      Object.entries(
        pick(
          inst,
          instUtil.allInstFields(inst).map((f) => f.name)
        )
      )
    )
  );
  const cloneAddr = { uuid: mergedBundleId, iid };
  bundler._uid2addr[clone.uid] = cloneAddr;
  bundler._addr2inst[addrKey(cloneAddr)] = clone;

  instUtil.allInstFields(inst).forEach((field) => {
    clone[field.name] = cloneFieldValueToMergedSite(
      field,
      inst[field.name],
      branch,
      mergedSite,
      bundler
    );
  });

  return clone;
}

// Generates an iid for the instance, in the same bundle as the parent
export function generateIidForInst(
  inst: ObjInst,
  bundler: Bundler,
  uuid: string // Site uuid
) {
  assert(!bundler.addrOf(inst), () => `Instance already has iid`);
  const newAddr = {
    uuid,
    iid: bundler.getNewIid(),
  };
  bundler._uid2addr[inst.uid] = newAddr;
  bundler._addr2inst[addrKey(newAddr)] = inst;
}

export type Grouping<
  ThePath extends string[],
  T extends ObjInst = Lookup<ThePath>
> = {
  group: string;
  pathPattern: ThePath;
  label: (srcInst: T, srcSite: Site, dstInst: T, dstSite: Site) => string;
  name?: (srcInst: T, srcSite: Site, dstInst: T, dstSite: Site) => string;
};

// Currently, this is based on location rather than type, but may want to consider moving to types
// E.g. ArenaFrame can exist at multiple levels, and lives alongside ArenaCell etc.
//
// As a convention, any pathPattern ending with a wildcard should have an associated `name` function.
const mkGrouping = <ThePath extends string[]>(grouping: Grouping<ThePath>) =>
  grouping;

export const conflictGroupings = sortBy(
  [
    mkGrouping({
      group: "Site",
      pathPattern: pathSelector<Site>().getPath(),
      label: () => "misc site data",
    }),
    mkGrouping({
      group: "StyleToken",
      pathPattern: pathSelector<Site>().styleTokens._.getPath(),
      label: () => "style token",
      name: (src: StyleToken) => src.name,
    }),
    mkGrouping({
      group: "GlobalVariantGroup",
      pathPattern: pathSelector<Site>().globalVariantGroups._.getPath(),
      label: () => "global variant group",
      name: (src: VariantGroup) => src.param.variable.name,
    }),
    mkGrouping({
      group: "GlobalVariant",
      pathPattern:
        pathSelector<Site>().globalVariantGroups._.variants._.getPath(),
      label: () => "global variant",
      name: (src: Variant) => src.name,
    }),
    mkGrouping({
      group: "Theme",
      pathPattern: pathSelector<Site>().activeTheme.getPath(),
      label: () => "project default styles inheritance",
    }),
    mkGrouping({
      group: "Arena",
      pathPattern: pathSelector<Site>().arenas._.getPath(),
      label: () => "arena",
      name: (src: Arena) => src.name,
    }),
    mkGrouping({
      group: "ArenaFrame",
      pathPattern: pathSelector<Site>().arenas._.children._.getPath(),
      label: () => "arena frame",
      name: (src: ArenaChild) => src.name,
    }),
    mkGrouping({
      group: "Component",
      pathPattern: pathSelector<Site>().components._.getPath(),
      label: () => "component",
      name: (src: Component) => getComponentDisplayName(src),
    }),
    mkGrouping({
      group: "ComponentParam",
      pathPattern: pathSelector<Site>().components._.params._.getPath(),
      label: () => "component parameter",
      name: (src: Param) => src.variable.name,
    }),
    mkGrouping({
      group: "ComponentStates",
      pathPattern: pathSelector<Site>().components._.states._.getPath(),
      label: () => "component state",
      name: (src: State) => src.param.variable.name,
    }),
    mkGrouping({
      group: "TplTree",
      pathPattern: pathSelector<Site>().components._.tplTree.getPath(),
      label: () => "contents",
    }),
    // {
    //   group: "PageMeta",
    //   pathPattern: pathSelectorSite<>("components.).pageMeta.getPath(),
    // },
    mkGrouping({
      group: "VariantGroup",
      pathPattern: pathSelector<Site>().components._.variantGroups._.getPath(),
      label: () => "variant group",
      name: (src: VariantGroup) => src.param.variable.name,
    }),
    mkGrouping({
      group: "Variant",
      pathPattern:
        pathSelector<Site>().components._.variantGroups._.variants._.getPath(),
      label: () => "variant",
      name: (src: Variant) => src.name,
    }),
    mkGrouping({
      group: "GlobalContexts",
      pathPattern: pathSelector<Site>().globalContexts.getPath(),
      label: () => "global contexts",
    }),
    mkGrouping({
      group: "ImageAsset",
      pathPattern: pathSelector<Site>().imageAssets._.getPath(),
      label: () => "image",
      name: (src: ImageAsset) => src.name,
    }),
    mkGrouping({
      group: "Mixin",
      pathPattern: pathSelector<Site>().mixins._.getPath(),
      label: () => "mixin",
      name: (src: Mixin) => src.name,
    }),
    mkGrouping({
      group: "PageArena",
      pathPattern: pathSelector<Site>().pageArenas._.getPath(),
      label: () => "arena for page",
      name: (src: PageArena) => src.component.name,
    }),
    mkGrouping({
      group: "ComponentArena",
      pathPattern: pathSelector<Site>().componentArenas._.getPath(),
      label: () => "arena for component",
      name: (src: ComponentArena) => src.component.name,
    }),
    mkGrouping({
      group: "Themes",
      pathPattern: pathSelector<Site>().themes._.getPath(),
      label: () => "project default styles",
    }),
    mkGrouping({
      group: "Split",
      pathPattern: pathSelector<Site>().splits._.getPath(),
      label: (src: Split) =>
        SplitType.Experiment === src.splitType
          ? "A/B test"
          : SplitType[src.splitType],
      name: (src: Split) => src.name,
    }),
    mkGrouping({
      group: "Fonts",
      pathPattern: pathSelector<Site>().userManagedFonts.getPath(),
      label: () => "custom fonts",
    }),
  ],
  (grouping) => -grouping.pathPattern.length
);

export interface DirectConflictPickMap {
  [pathStr: string]: BranchSide;
}

function visitSpecialHandlers(
  ancestorCtx: NodeCtx,
  leftCtx: NodeCtx,
  rightCtx: NodeCtx,
  mergedCtx: NodeCtx,
  bundler: Bundler,
  picks: DirectConflictPickMap | undefined
): DirectConflict[] {
  const [ancestor, left, right, merged] = [
    ancestorCtx,
    leftCtx,
    rightCtx,
    mergedCtx,
  ].map((ctx) =>
    ensure(ctx.node, "visitSpecialHandlers expects all nodes to exist")
  );

  const cls = instUtil.getInstClass(ancestor);
  assertSameInstType(ancestor, left, right, merged);

  const conflicts: DirectConflict[] = [];

  const rec = (
    field: Field,
    ancFieldCtx: NodeFieldCtx,
    leftFieldCtx: NodeFieldCtx,
    rightFieldCtx: NodeFieldCtx,
    mergedFieldCtx: NodeFieldCtx
  ) => {
    const vals = [
      ancFieldCtx.node,
      leftFieldCtx.node,
      rightFieldCtx.node,
      mergedFieldCtx.node,
    ] as const;
    const fieldInfo = { field, cls };
    // They must all be arrays; if any are nil, then no conflicts!
    if (vals.every((v) => Array.isArray(v))) {
      (ancFieldCtx.node as any[]).forEach((v) => {
        const key = getArrayKey(bundler, v, fieldInfo);
        rec(
          field,
          nextCtx(
            ancFieldCtx,
            `${(ancFieldCtx.node as any[]).findIndex(
              (val) => getArrayKey(bundler, val, fieldInfo) === key
            )}`
          ),
          nextCtx(
            leftFieldCtx,
            `${(leftFieldCtx.node as any[]).findIndex(
              (val) => getArrayKey(bundler, val, fieldInfo) === key
            )}`
          ),
          nextCtx(
            rightFieldCtx,
            `${(rightFieldCtx.node as any[]).findIndex(
              (val) => getArrayKey(bundler, val, fieldInfo) === key
            )}`
          ),
          nextCtx(
            mergedFieldCtx,
            `${(mergedFieldCtx.node as any[]).findIndex(
              (val) => getArrayKey(bundler, val, fieldInfo) === key
            )}`
          )
        );
      });
    } else if (vals.every((v) => isLiteralObject(v))) {
      [...Object.keys(vals[0])].forEach((key) =>
        rec(
          field,
          nextCtx(ancFieldCtx, key),
          nextCtx(leftFieldCtx, key),
          nextCtx(rightFieldCtx, key),
          nextCtx(mergedFieldCtx, key)
        )
      );
    } else if (areSameInstType(...vals)) {
      conflicts.push(
        ...visitSpecialHandlers(
          ancFieldCtx,
          leftFieldCtx,
          rightFieldCtx,
          mergedFieldCtx,
          bundler,
          picks
        )
      );
    }
  };

  for (const field of meta.allFields(cls)) {
    const fieldMeta = modelConflictsMeta[cls.name][field.name];
    if (
      typeof fieldMeta === "object" &&
      fieldMeta.conflictType === "special" &&
      !!fieldMeta.handler
    ) {
      conflicts.push(
        ...fieldMeta.handler(
          ancestorCtx,
          leftCtx,
          rightCtx,
          mergedCtx,
          bundler,
          picks
        )
      );
    } else if (!isWeakRefField(field)) {
      rec(
        field,
        nextCtx(ancestorCtx, field.name),
        nextCtx(leftCtx, field.name),
        nextCtx(rightCtx, field.name),
        nextCtx(mergedCtx, field.name)
      );
    }
  }

  return conflicts;
}

export function matchGrouping(path: string[]) {
  const results = [...matchAllGroupings(path)];
  return results.length > 0 ? results[0] : undefined;
}

export function* matchAllGroupings(path: string[]) {
  for (const grouping of conflictGroupings) {
    const key = path.slice(0, grouping.pathPattern.length);
    if (
      grouping.pathPattern.length === 0 ||
      (grouping.pathPattern.length <= path.length &&
        strictZip(key, grouping.pathPattern).every(
          ([part, pattern]) => part === pattern || pattern === "_"
        ))
    ) {
      yield { grouping, key };
    }
  }
}

export function getDirectConflicts(
  ancestorCtx: NodeCtx,
  leftCtx: NodeCtx,
  rightCtx: NodeCtx,
  mergedCtx: NodeCtx,
  bundler: Bundler,
  picks: DirectConflictPickMap | undefined,
  filterConflict?: (conflict: DirectConflict) => boolean
): DirectConflict[] {
  const cloneFieldValue = (field: Field, v: any, branch: Site) =>
    cloneFieldValueToMergedSite(field, v, branch, mergedCtx.site, bundler);
  const getMergedInst = (inst: ObjInst) =>
    bundler.objByAddr({
      uuid: bundler.addrOf(mergedCtx.site).uuid,
      iid: bundler.addrOf(inst).iid,
    });

  const allLeftUpdates = getInstUpdates(ancestorCtx, leftCtx, bundler);
  const allRightUpdates = getInstUpdates(ancestorCtx, rightCtx, bundler);
  const filterConflictWrapper = (conflict: DirectConflict) =>
    filterConflict?.(conflict) ?? true;
  const conflicts: DirectConflict[] = [];

  // Group updates by the global `groupings`
  function group(updates: Map<string, UpdateData>) {
    const object = groupBy([...updates.entries()], ([pathStr]) => {
      const result = matchGrouping(JSON.parse(pathStr));
      if (result) {
        return JSON.stringify(result);
      } else {
        throw new Error(
          "Reported a change that is not captured by anything in conflictGroupings"
        );
      }
    });
    return new Map(
      Object.entries(object).map(([groupName, entries]) =>
        tuple(groupName, new Map(entries))
      )
    );
  }

  const leftGrouped = group(allLeftUpdates);
  const rightGrouped = group(allRightUpdates);

  for (const groupJson of new Set([
    ...leftGrouped.keys(),
    ...rightGrouped.keys(),
  ])) {
    if (groupJson === "") {
      continue;
    }
    const { key, grouping } = JSON.parse(groupJson);
    const leftUpdates = leftGrouped.get(groupJson) ?? new Map<never, never>();
    const rightUpdates = rightGrouped.get(groupJson) ?? new Map<never, never>();

    const bothUpdates = intersectionBy(
      [...leftUpdates.entries()],
      [...rightUpdates.entries()],
      ([pathStr]) => pathStr
    );
    const leftOnlyUpdates = differenceBy(
      [...leftUpdates.entries()],
      bothUpdates,
      ([pathStr]) => pathStr
    );
    const rightOnlyUpdates = differenceBy(
      [...rightUpdates.entries()],
      bothUpdates,
      ([pathStr]) => pathStr
    );

    // Doesn't matter which left/right update we use, we just need a reference to the root object for this grouping in each side.
    const [someLeftUpdate] = [...leftUpdates.values()];
    const [someRightUpdate] = [...rightUpdates.values()];
    if (bothUpdates.length > 0 && someLeftUpdate && someRightUpdate) {
      const rightRootPath = someRightUpdate.updatedPath.slice(0, key.length);
      const leftRootPath = someLeftUpdate.updatedPath.slice(0, key.length);
      const conflict: GenericDirectConflict = {
        conflictType: "generic",
        group: grouping.group,
        leftRootPath,
        leftRoot: keyPathGet(leftCtx.site, leftRootPath, bundler),
        rightRootPath,
        rightRoot: keyPathGet(rightCtx.site, rightRootPath, bundler),
        conflictDetails: [],
      };

      bothUpdates.forEach(([pathStr, leftUpdate]) => {
        const {
          field,
          fieldConflictMeta: fieldMeta,
          updatedInst: leftInst,
          origInst: ancInst,
          updatedFieldValue: leftVal,
          origFieldValue: ancVal,
        } = leftUpdate;

        const rightUpdate = ensure(
          rightUpdates.get(pathStr),
          "We are in bothUpdates, so both left and right must exist"
        );
        const {
          field: rightField,
          updatedInst: rightInst,
          updatedFieldValue: rightVal,
        } = rightUpdate;

        assert(
          field === rightField,
          `Fields didn't match: ${field.name} and ${rightField.name} for path ${pathStr}`
        );

        const mergedInst = ancInst
          ? ensure(
              getMergedInst(ancInst),
              "Ancestor site ObjInst is missing its matching ObjInst in merged site"
            )
          : undefined;

        const maybeCls = maybe(leftInst || rightInst, (inst) =>
          instUtil.tryGetInstClass(inst)
        );
        if (
          valueChanged(
            leftVal,
            rightVal,
            bundler,
            fieldMeta,
            maybeCls && {
              field,
              cls: maybeCls,
            },
            true
          )
        ) {
          // Changes with different values to the same field
          switch (fieldMeta) {
            case "harmless":
              // Can choose either, but use the left side since that's the dest branch, and so this minimizes changes on the dest.
              if (mergedInst && leftInst) {
                mergedInst[field.name] = cloneFieldValue(
                  field,
                  leftVal,
                  leftCtx.site
                );
              }
              break;
            case "special":
              // Special values should be checked manually, not by `getGenericConflicts`
              break;
            default: {
              let hasConflict: boolean;
              // TODO Do we need to handle duplicates?!
              // They must all be arrays; if any are nil, then no conflicts!
              if (
                (ancVal === undefined || Array.isArray(ancVal)) &&
                Array.isArray(leftVal) &&
                Array.isArray(rightVal) &&
                fieldMeta?.["arrayType"] !== "atomic"
              ) {
                const cls = ensure(
                  maybeCls,
                  `One of left or right inst must exist for field ${field.name}`
                );
                const getKey = deriveKeyFunc(fieldMeta, bundler, {
                  field,
                  cls,
                });

                // If an array represents a *set*, then insertions and deletions should never be able to conflict.
                // Only if reorder of existing members on order-sensitive (or if any child has conflicts).
                const leftMap = xKeyBy(leftVal, getKey);
                const rightMap = xKeyBy(rightVal, getKey);
                const leftSet = new Set(leftMap.keys());
                const rightSet = new Set(rightMap.keys());
                const commonMembers = xIntersect(leftSet, rightSet);
                const ancSet = new Set(ancVal?.map(getKey) ?? []);

                /**
                 * Perform a rough order-sensitive merge.
                 * We just guarantee that the relative ordering of things within each branch version of the array are preserved,
                 * and arbitrarily choose to let the left side come before the right side.
                 */
                function mergeArrays(left: any[], right: any[]): any[] {
                  const [leftTaken, [nextLeftElt, ...leftRem]] = spanWhile(
                    left,
                    (v) => !ancSet.has(getKey(v))
                  );
                  const [rightTaken, [nextRightElt, ...rightRem]] = spanWhile(
                    right,
                    (v) => !ancSet.has(getKey(v))
                  );
                  assert(
                    getKey(nextLeftElt) === getKey(nextRightElt),
                    "We should have filtered out any elements that were removed in either branch, but we encountered an element that was inherited from the ancestor that was missing in one of the branches."
                  );
                  return [
                    ...leftTaken,
                    ...rightTaken,
                    ...(nextLeftElt
                      ? [nextLeftElt, ...mergeArrays(leftRem, rightRem)]
                      : []),
                  ];
                }

                /** Checks whether this value was removed from either side. */
                function isNotRemovedEitherSide(v: any) {
                  const k = getKey(v);
                  return !ancSet.has(k) || commonMembers.has(k);
                }

                const leftClean = leftVal
                  .filter(isNotRemovedEitherSide)
                  .map((v) => cloneFieldValue(field, v, leftCtx.site));
                const rightClean = rightVal
                  .filter(isNotRemovedEitherSide)
                  .map((v) => cloneFieldValue(field, v, rightCtx.site));

                if (
                  fieldMeta &&
                  !isString(fieldMeta) &&
                  "arrayType" in fieldMeta &&
                  fieldMeta.arrayType === "ordered"
                ) {
                  const orderedCommonLeftKeys = leftVal
                    .map(getKey)
                    .filter((k) => commonMembers.has(k));
                  const orderedCommonRightKeys = rightVal
                    .map(getKey)
                    .filter((k) => commonMembers.has(k));
                  hasConflict = !arrayEq(
                    orderedCommonLeftKeys,
                    orderedCommonRightKeys
                  );
                  if (!hasConflict) {
                    if (mergedInst) {
                      mergedInst[field.name] = uniqBy(
                        mergeArrays(leftClean, rightClean),
                        getKey
                      );
                    }
                  }
                } else {
                  // Pure (order-insensitive) sets can *never* conflict!
                  hasConflict = false;
                  if (mergedInst) {
                    // merged = anc + newleft + newright - delleft - delright
                    // merged = left + newright - delright
                    mergedInst[field.name] = uniqBy(
                      [...leftClean, ...rightClean],
                      getKey
                    );
                  }
                }
              } else if (
                isLiteralObject(ancVal) &&
                isLiteralObject(leftVal) &&
                isLiteralObject(rightVal)
              ) {
                const leftKeys = new Set(Object.keys(leftVal));
                const rightKeys = new Set(Object.keys(rightVal));
                const commonKeys = [...xIntersect(leftKeys, rightKeys)];
                const leftKeysExclusive = difference(
                  [...leftKeys],
                  [...rightKeys]
                );
                const rightKeysExclusive = difference(
                  [...rightKeys],
                  [...leftKeys]
                );

                const createObjFromKeys = (
                  site: Site,
                  obj: {},
                  keys: any[]
                ) => {
                  return keys.reduce((currObj, _key) => {
                    const clonedVal = cloneFieldValue(field, obj[_key], site);
                    return {
                      ...currObj,
                      [_key]: clonedVal,
                    };
                  }, {});
                };

                // Here we create two options for the merged object. Both of them
                // have all keys, but when there is a conflict (same key has different
                // value on leftVal/rightVal) leftMergedVal has the leftVal value and
                // rightMergedVal has the rightVal value
                const leftValExclusive = createObjFromKeys(
                  leftCtx.site,
                  leftVal,
                  leftKeysExclusive
                );
                const rightValExclusive = createObjFromKeys(
                  rightCtx.site,
                  rightVal,
                  rightKeysExclusive
                );
                const leftValCommon = createObjFromKeys(
                  leftCtx.site,
                  leftVal,
                  commonKeys
                );
                const rightValCommon = createObjFromKeys(
                  rightCtx.site,
                  rightVal,
                  commonKeys
                );
                const leftMergedVal = {
                  ...leftValExclusive,
                  ...rightValExclusive,
                  ...leftValCommon,
                };
                const rightMergedVal = {
                  ...leftValExclusive,
                  ...rightValExclusive,
                  ...rightValCommon,
                };

                // If the objects are different, then we have a direct conflict and
                // the user will choose if wants to prioritize left or right values
                if (
                  valueChanged(
                    leftMergedVal,
                    rightMergedVal,
                    bundler,
                    fieldMeta,
                    undefined,
                    true
                  )
                ) {
                  hasConflict = true;

                  // Updating "updatedFieldValue"s so they have the merged vals
                  // and we create "conflictDetails" correctly
                  leftUpdate.updatedFieldValue = leftMergedVal;
                  rightUpdate.updatedFieldValue = rightMergedVal;
                } else {
                  hasConflict = false;
                  if (mergedInst) {
                    // leftMergedVal and rightMergedVal have the same value,
                    // so just assign any
                    mergedInst[field.name] = leftMergedVal;
                  }
                }
              } else {
                hasConflict = true;
              }
              const currentConflictDetails: ConflictDetails = {
                pathStr,
                leftUpdate,
                rightUpdate,
              };
              if (
                hasConflict &&
                filterConflictWrapper({
                  ...conflict,
                  conflictDetails: [
                    ...conflict.conflictDetails,
                    currentConflictDetails,
                  ],
                })
              ) {
                if (picks) {
                  const side = ensure(
                    picks[pathStr],
                    `Could not find the corresponding pick with pathStr ${pathStr}, got resolutions for: ${JSON.stringify(
                      Object.keys(picks)
                    )}`
                  );
                  // `pathStr` contains the path in the merged site, which
                  // might be different than the path in the merged site if it's
                  // a change deeper in a subtree that moved
                  const fullPath = JSON.parse(pathStr).slice(0, -1);
                  const ancestorPathPrefix = zip(
                    ancestorCtx.path,
                    ancestorCtx.keyPath ?? []
                  ).map(([a, b]) => b ?? a);
                  assert(
                    fullPath.length >= ancestorPathPrefix.length &&
                      JSON.stringify(
                        fullPath.slice(0, ancestorPathPrefix.length)
                      ) === JSON.stringify(ancestorPathPrefix),
                    "pathStr doesn't start with the path in ancestorCtx"
                  );
                  const _mergedInst = keyPathGet(
                    ensure(mergedCtx.node, "merged node should exist"),
                    fullPath.slice(ancestorPathPrefix.length),
                    bundler
                  );
                  assert(
                    _mergedInst,
                    "couldn't get the updated instance in the merged site"
                  );
                  if (_mergedInst) {
                    _mergedInst[field.name] =
                      side === "left"
                        ? cloneFieldValue(
                            field,
                            leftUpdate.updatedFieldValue,
                            leftCtx.site
                          )
                        : cloneFieldValue(
                            field,
                            rightUpdate.updatedFieldValue,
                            rightCtx.site
                          );
                  }
                } else {
                  conflict.conflictDetails.push(currentConflictDetails);
                }
              }
            }
          }
        } else if (mergedInst && leftInst) {
          // Ensure both the ancestor/merged and the updated side exist.
          // This is because getInstUpdates continues walking the tree even if one side doesn't have a correpsonding match.
          // Don't do anything if either side is missing, since that means the ancestor didn't exist and this was a new node
          // (thus there's no mergedInst to update),
          // or else the ancestor existed but was deleted in the branch
          // (in which case we don't want to overwrite all the mergedInst fields with undefined--will mess with deletion cascading!).
          mergedInst[field.name] = cloneFieldValue(
            field,
            leftVal,
            leftCtx.site
          );
        }
      });
      if (conflict.conflictDetails.length > 0) {
        conflicts.push(conflict);
      }
    }

    function handleOneSidedUpdates(
      oneSidedUpdates: typeof leftOnlyUpdates,
      sourceSite: Site
    ) {
      for (const [_pathStr, sideUpdate] of oneSidedUpdates) {
        const {
          field,
          origInst: ancInst,
          updatedInst,
          updatedFieldValue,
        } = sideUpdate;

        const mergedInst = ancInst
          ? ensure(
              getMergedInst(ancInst),
              "Ancestor site ObjInst is missing its matching ObjInst in merged site. IID " +
                bundler.addrOf(ancInst)
            )
          : undefined;

        // There was no update on the other side, so just apply the merge as we go.
        // Ensure both the ancestor/merged and the updated side exist.
        // This is because getInstUpdates continues walking the tree even if one side doesn't have a correpsonding match.
        // Don't do anything if either side is missing, since that means the ancestor didn't exist and this was a new node
        // (thus there's no mergedInst to update),
        // or else the ancestor existed but was deleted in the branch
        // (in which case we don't want to overwrite all the mergedInst fields with undefined--will mess with deletion cascading!).
        if (mergedInst && updatedInst) {
          mergedInst[field.name] = cloneFieldValue(
            field,
            updatedFieldValue,
            sourceSite
          );
        }
      }
    }

    handleOneSidedUpdates(leftOnlyUpdates, leftCtx.site);
    handleOneSidedUpdates(rightOnlyUpdates, rightCtx.site);
  }

  conflicts.push(
    ...visitSpecialHandlers(
      ancestorCtx,
      leftCtx,
      rightCtx,
      mergedCtx,
      bundler,
      picks
    )
  );

  return conflicts.filter((c) => filterConflictWrapper(c));
}

/**
 * Map<InstIid, Map<FieldName, Map<ChildName, ChildIid>>
 */
type SeenNamesMap = Map<string, Map<string, Map<string, string>>>;

function getOrSetSeen(
  seenMap: SeenNamesMap,
  instIid: string,
  fieldName: string
) {
  if (!seenMap.has(instIid)) {
    seenMap.set(instIid, new Map());
  }
  const instSeen = ensure(
    seenMap.get(instIid),
    "seenMap must have instIid (it was just set)"
  );
  if (!instSeen.has(fieldName)) {
    instSeen.set(fieldName, new Map());
  }
  return ensure(
    instSeen.get(fieldName),
    "instSeen must have fieldName (it was just set)"
  );
}

function walkAndFixNames(
  site: Site,
  bundler: Bundler,
  seenMap: SeenNamesMap,
  isDeletedInst: (inst: ObjInst) => boolean
) {
  const autoReconciliations: AutoReconciliation[] = [];
  const walked = walkModelTree(createNodeCtx(site));
  for (const inst of walked) {
    const cls = instUtil.getInstClass(inst);
    for (const field of meta.allFields(cls)) {
      const fieldMeta = modelConflictsMeta[cls.name][field.name];
      if (
        (fieldMeta.arrayType && fieldMeta.conflictType === "rename") ||
        fieldMeta.forceRename
      ) {
        const value: ObjInst[] = inst[field.name]
          .filter((v: any) =>
            fieldMeta.excludeFromRename
              ? !fieldMeta.excludeFromRename(v, inst)
              : true
          )
          .filter((v: any) => !isDeletedInst(v));
        const nameKey = fieldMeta.nameKey.split(".");
        const allNames = countBy(value.map((obj) => pathGet(obj, nameKey)));
        const seen = getOrSetSeen(
          seenMap,
          bundler.addrOf(inst).iid,
          field.name
        );
        for (const child of value) {
          const name = pathGet(child, nameKey);
          const iid = bundler.addrOf(child).iid;
          if (seen.has(name) && seen.get(name) !== iid) {
            const newName = uniqueName(Object.keys(allNames), name);
            if (fieldMeta.customRenameFn) {
              fieldMeta.customRenameFn(site, child, newName);
            } else {
              set(child, nameKey, newName);
            }
            allNames[name] -= 1;
            allNames[newName] = 1 + (allNames[newName] ?? 0);
            seen.set(newName, iid);
            autoReconciliations.push({
              violation: "duplicate-names",
              mergedInst: child,
              fieldName: field.name,
              mergedParent: inst,
              origName: name,
              renamedTo: newName,
            });
          } else {
            seen.set(name, iid);
          }
        }
        const newNames = countBy(value.map((obj) => pathGet(obj, nameKey)));
        assert(
          Object.values(newNames).every((v) => v === 0 || v === 1),
          `All names should be unique, but aren't for ${cls.name}.${
            field.name
          }: ${JSON.stringify(newNames)}`
        );
      }
    }
  }
  return autoReconciliations;
}

function preFixNames(
  a: Site,
  b: Site,
  bundler: Bundler,
  isDeletedInst: (inst: ObjInst) => boolean
) {
  const allSeen: SeenNamesMap = new Map();
  const autoReconciliations: AutoReconciliation[] = [];
  mobx.runInAction(() => {
    autoReconciliations.push(
      ...walkAndFixNames(a, bundler, allSeen, isDeletedInst)
    );
  });
  mobx.runInAction(() => {
    autoReconciliations.push(
      ...walkAndFixNames(b, bundler, allSeen, isDeletedInst)
    );
  });
  return autoReconciliations;
}

type FlattenedTplNodes = {
  nodes: Record<string, classes.TplNode>;
  names: string[];
};

function preFixTplNames(
  a: Site,
  b: Site,
  bundler: Bundler,
  isDeletedInst: (inst: ObjInst) => boolean
) {
  const autoReconciliations: AutoReconciliation[] = [];

  const getNodesAndNames = (
    tplMgr: TplMgr,
    component: classes.Component
  ): FlattenedTplNodes => {
    const nodes = flattenTpls(component.tplTree).filter(
      (node) => !isDeletedInst(node)
    );
    const params = component.params.filter((param) => !isDeletedInst(param));
    return {
      nodes: Object.fromEntries(
        nodes.map((node) => [bundler.addrOf(node).iid, node])
      ),
      names: withoutNils([
        ...nodes.filter(isTplNamable).map((node) => node.name),
        ...params.map((param) => param.variable.name),
      ]),
    };
  };

  const fixSelfTplNames = (
    selfComponent: classes.Component,
    selfTree: FlattenedTplNodes,
    otherTree: FlattenedTplNodes
  ) => {
    for (const [iid, tpl] of Object.entries(selfTree.nodes)) {
      if (!isTplNamable(tpl) || !tpl.name) {
        continue;
      }
      if (iid in otherTree.nodes) {
        continue;
      }
      if (isDeletedInst(tpl)) {
        continue;
      }

      const oldName = tpl.name;
      removeFromArray(selfTree.names, oldName);
      aTplMgr.renameTpl(
        selfComponent,
        tpl,
        uniqueName([...selfTree.names, ...otherTree.names], oldName, {
          normalize: toVarName,
        })
      );
      const newName = tpl.name;
      selfTree.names.push(newName);

      if (oldName !== newName) {
        autoReconciliations.push({
          violation: "duplicate-names",
          mergedInst: tpl,
          fieldName: "name",
          mergedParent: selfComponent,
          origName: oldName,
          renamedTo: newName,
        });
      }
    }
  };

  const aTplMgr = new TplMgr({ site: a });
  const bTplMgr = new TplMgr({ site: b });
  const aComponents: Record<number, classes.Component> = {};
  for (const component of a.components) {
    aComponents[bundler.addrOf(component).iid] = component;
  }
  for (const bComponent of b.components) {
    const componentIid = bundler.addrOf(bComponent).iid;
    if (!(componentIid in aComponents)) {
      continue;
    }
    const aComponent = aComponents[componentIid];
    const aFlattened = getNodesAndNames(aTplMgr, aComponent);
    const bFlattened = getNodesAndNames(bTplMgr, bComponent);
    fixSelfTplNames(aComponent, aFlattened, bFlattened);
    fixSelfTplNames(bComponent, bFlattened, aFlattened);
  }

  return autoReconciliations;
}

export function keyPathGet(
  inst: ObjInst,
  keyPath: string[],
  bundler: Bundler
): any {
  if (keyPath.length === 0) {
    return inst;
  }
  const cls = instUtil.getInstClass(inst);
  const [fieldName, ...rest] = keyPath;
  const fieldVal = inst[fieldName];
  function rec(x: any, nextPath: string[]) {
    if (nextPath.length === 0 || x === undefined) {
      return x;
    } else if (instUtil.isObjInst(x)) {
      return keyPathGet(x, nextPath, bundler);
    } else {
      const [nextKey, ...nextRest] = nextPath;
      assert(nextKey in x, `keyPathGet: nextKey ${nextKey} must exist in x`);
      return rec(x[nextKey], nextRest);
    }
  }
  if (Array.isArray(fieldVal)) {
    const [key, ...after] = rest;

    const field = meta.getFieldByName(cls.name, fieldName);
    const conflictMeta = modelConflictsMeta[cls.name][field.name];

    const index = parseInt(key);
    if (!isNaN(index) && conflictMeta.conflictType === "special") {
      return rec(fieldVal[index], after);
    }

    const getKey = deriveKeyFunc(conflictMeta, bundler, { cls, field });

    const map = xKeyBy(fieldVal, getKey);
    const child =
      !isNaN(index) && !map.has(key) ? fieldVal[index] : map.get(key);
    return rec(child, after);
  } else {
    return rec(fieldVal, rest);
  }
}

export type DirectConflictPick = DirectConflict & { side: BranchSide };

function runMergeFnAndApplyFixes(
  ancestor: Site,
  a: Site,
  b: Site,
  mergedSite: Site,
  fn: () => void,
  bundler: Bundler,
  recorder: ChangeRecorder
): { autoReconciliations: AutoReconciliation[] } {
  const autoReconciliations: AutoReconciliation[] = [];

  // Since some operations will be processed prior to the merge, we need to ignore some instances
  // that will not be present in the final merged site, as they will be deleted.
  const iidsToBeDeleted = computeIidsToBeDeletedInMerge(
    ancestor,
    a,
    b,
    bundler
  );
  const isDeletedInst = (inst: ObjInst) =>
    iidsToBeDeleted.has(bundler.addrOf(inst).iid);

  // Some operations can be harder to execute once we merge the elements in a single site, which
  // we will process the before the merge, by directly changing `a` and `b` sites and then after
  // merging we will have a simpler handling
  //
  // It's possible to identify some cases by looking into `customRenameFn` in model-conflicts-meta.ts.
  //
  // An example of this case is the renaming a component.param referent to a state/variable, as those
  // elements can be referred by expr instances which only have the name, it's necessary to update
  // the expr instances to refer to the new name instead of the old one, if we merge the sites first
  // we may end up with duplicated names and it won't be clear which one requires being renamed.
  autoReconciliations.push(...preFixNames(a, b, bundler, isDeletedInst));

  // Similar to the previous case, the name of a element is used to create expr instances referent to
  // implicit states, so we update it prior to the merge to avoid duplicated names.
  autoReconciliations.push(...preFixTplNames(a, b, bundler, isDeletedInst));

  mobx.runInAction(() => {
    recorder.withRecording(() => {
      fn();

      fixDuplicatedCodeComponents(mergedSite);

      fixDuplicatedRegisteredTokens(mergedSite);

      fixSwappedTplComponents(ancestor, a, b, mergedSite);

      fixDuplicatedContentFields(mergedSite, recorder, bundler);

      fixVirtualSlotArgs(mergedSite, recorder);

      fixDanglingReferenceConflicts(
        mergedSite,
        recorder,
        updateSummaryFromDeletedInstances(
          getEmptyDeletedAssetsSummary(),
          [...recorder.getToBeDeletedInsts().keys()],
          {
            includeTplNodesAndExprs: true,
          }
        )
      );

      fixProjectDependencies(ancestor, a, b, mergedSite, bundler);

      autoReconciliations.push(
        ...walkAndFixNames(mergedSite, bundler, new Map(), isDeletedInst)
      );

      autoReconciliations.push(...fixPagePaths(mergedSite));
    });
  });

  const fixAutoReconciliationsInsts = (
    arr: AutoReconciliation[]
  ): AutoReconciliation[] => {
    const mergedSiteUuid = bundler.addrOf(mergedSite).uuid;
    const getMergedInst = (inst: ObjInst) => {
      return bundler.objByAddr({
        uuid: mergedSiteUuid,
        iid: bundler.addrOf(inst).iid,
      });
    };
    return arr.map((r) => {
      if (r.violation === "duplicate-page-path") {
        return r;
      }
      return {
        ...r,
        mergedInst: getMergedInst(r.mergedInst) ?? r.mergedInst,
        mergedParent: getMergedInst(r.mergedParent) ?? r.mergedParent,
      };
    });
  };

  return {
    autoReconciliations: fixAutoReconciliationsInsts(autoReconciliations),
  };
}

/**
 * Makes sure that every field value marked as "contents" will not end up
 * with two parents. We always clone these values when they change, but they
 * could still end up with two parents if e.g. some of its ancestors were
 * duplicated in each branch.
 */
function fixDuplicatedContentFields(
  mergedSite: Site,
  recorder: ChangeRecorder,
  bundler: Bundler
) {
  const siteUuid = bundler.addrOf(mergedSite).uuid;
  const dfs = (node: ObjInst) => {
    const cls = instUtil.getInstClass(node);
    for (const field of meta.allFields(cls)) {
      if (isWeakRefField(field)) {
        continue;
      }
      const fieldMeta = modelConflictsMeta[cls.name][field.name];
      if (shouldCloneContents(fieldMeta, node[field.name])) {
        let hasInvalidChild = false;
        const checkInvalidInsts = (child: ObjInst) => {
          if (
            !recorder.getPathToChild(child) &&
            recorder.getAnyPathToChild(child)
          ) {
            // This field has a descendent with multiple paths!
            hasInvalidChild = true;
            return;
          }
          const childCls = instUtil.getInstClass(child);
          for (const childField of meta.allFields(childCls)) {
            if (isWeakRefField(childField)) {
              continue;
            }
            checkInvalidInstsInField(child[childField.name]);
          }
        };
        const checkInvalidInstsInField = (v: unknown) => {
          if (Array.isArray(v)) {
            v.forEach((u) => checkInvalidInstsInField(u));
          } else if (isLiteralObject(v)) {
            Object.values(v).forEach((u) => checkInvalidInstsInField(u));
          } else if (instUtil.isObjInst(v)) {
            checkInvalidInsts(v);
          }
        };
        checkInvalidInstsInField(node[field.name]);
        if (hasInvalidChild) {
          node[field.name] = cloneContents(node[field.name], bundler, siteUuid);
        }
      } else {
        const rec = (v: unknown) => {
          if (Array.isArray(v)) {
            v.forEach((u) => rec(u));
          } else if (isLiteralObject(v)) {
            Object.values(v).forEach((u) => rec(u));
          } else if (instUtil.isObjInst(v)) {
            dfs(v);
          }
        };
        rec(node[field.name]);
      }
    }
  };
  dfs(mergedSite);
}

/**
 * We apply resolutions (picks) within tryMerge because this leads to a more coherent resulting merged site.
 * Otherwise, you could have interactions between reconciliations and conflicts.
 * For example:
 *
 * - Conflict on an object that got renamed to different names, where picking one side would duplicate (the name got taken by something else)
 * - An array conflict resolution introduces a new object that would duplicate a name
 * - Conflict where one side is linking to a param that got deleted
 * - Conflict was using a project dependency that got fixed-up
 *
 * If instead we have the picks, then we can apply them as we detect the conflicts,
 * and know exactly how to resolve each conflict.
 */
export function tryMerge(
  ancestor: Site,
  a: Site,
  b: Site,
  mergedSite: Site,
  bundler: Bundler,
  picks: DirectConflictPickMap | undefined
): MergeStep {
  assert(
    isEqual(withoutUids(ancestor), withoutUids(mergedSite)),
    "Initial merged site must be identical to ancestor site"
  );
  const mergedSiteUuid = bundler.addrOf(mergedSite).uuid;
  let directConflicts: DirectConflict[] = [];

  mergedSite.components.forEach((component) => {
    trackComponentRoot(component);
    trackComponentSite(component, mergedSite);
  });

  const recorder = new ChangeRecorder(
    mergedSite,
    instUtil,
    [meta.getFieldByName("ProjectDependency", "site")],
    [],
    (obj) =>
      !!maybe(bundler.addrOf(obj), (addr) => addr.uuid !== mergedSiteUuid),
    (obj) => {
      assert(
        [ancestor, a, b].every(
          (branch) =>
            maybe(
              bundler.addrOf(obj),
              (addr) => addr.uuid !== bundler.addrOf(branch).uuid
            ) ?? true
        ),
        `Re-used the same inst from a different branch`
      );
    }
  );

  const { autoReconciliations } = runMergeFnAndApplyFixes(
    ancestor,
    a,
    b,
    mergedSite,
    () => {
      directConflicts = getDirectConflicts(
        createNodeCtx(ancestor),
        createNodeCtx(a),
        createNodeCtx(b),
        createNodeCtx(mergedSite),
        bundler,
        picks
      );
    },
    bundler,
    recorder
  );

  recorder.dispose();

  assertSiteInvariants(mergedSite);

  if (directConflicts.length > 0) {
    // Consolidate the multiple redundant leftRootPath into a single one
    const genericDirectConflicts = directConflicts.filter(
      (c) => c.conflictType === "generic"
    ) as GenericDirectConflict[];
    const specialDirectConflicts = directConflicts.filter(
      (c) => c.conflictType === "special"
    ) as SpecialDirectConflict[];
    const directGrouped = xGroupBy(genericDirectConflicts, (c) =>
      JSON.stringify(c.leftRootPath)
    );
    directConflicts = [
      ...[...directGrouped.entries()].map(([_leftRootPath, conflicts]) => {
        const first = conflicts[0];
        first.conflictDetails = conflicts.flatMap((det) => det.conflictDetails);
        return first;
      }),
      ...specialDirectConflicts,
    ];

    return {
      status: "needs-resolution",
      autoReconciliations: autoReconciliations,
      specialDirectConflicts: directConflicts.filter(
        (c) => c.conflictType === "special"
      ),
      genericDirectConflicts: directConflicts.filter(
        (c) => c.conflictType === "generic"
      ),
      invariantErrors: [],
      mergedSite,
    } as MergeDirectConflict;
  }

  return {
    status: "merged",
    autoReconciliations: autoReconciliations,
    mergedSite,
  };
}

function computeIidsToBeDeletedInMerge(
  ancestor: Site,
  left: Site,
  right: Site,
  bundler: Bundler
) {
  const ancestorIids = walkModelTree(createNodeCtx(ancestor)).map(
    (inst) => bundler.addrOf(inst).iid
  );
  const leftIids = new Set(
    walkModelTree(createNodeCtx(left)).map((inst) => bundler.addrOf(inst).iid)
  );
  const rightIids = new Set(
    walkModelTree(createNodeCtx(right)).map((inst) => bundler.addrOf(inst).iid)
  );
  return new Set(
    ancestorIids.filter((iid) => {
      // If in some of the sides the iid that was in the ancestor is not present, then it was deleted
      // in that side, this is the default behavior of the merge and is going to be shown in the UI
      // to the user, so that the deletion can be confirmed.
      return !leftIids.has(iid) || !rightIids.has(iid);
    })
  );
}
