import { extractAllReferencedTokenIds } from "@/wab/commons/StyleToken";
import {
  computedProjectFlags,
  siteToAllTokensDict,
} from "@/wab/shared/cached-selectors";
import { makeNodeNamer } from "@/wab/shared/codegen/react-p";
import {
  ensure,
  stableJsonStringify,
  switchType,
  withoutNils,
} from "@/wab/shared/common";
import {
  getParamDisplayName,
  isFrameComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { asCode, ExprCtx } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { SplitStatus } from "@/wab/shared/core/splits";
import { isPrivateState } from "@/wab/shared/core/states";
import {
  flattenTpls,
  isTplComponent,
  isTplNamable,
  isTplSlot,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import {
  CollectionExpr,
  Component,
  CompositeExpr,
  CustomCode,
  CustomFunctionExpr,
  DataSourceOpExpr,
  EventHandler,
  Expr,
  FunctionArg,
  FunctionExpr,
  ImageAsset,
  ImageAssetRef,
  isKnownComponent,
  isKnownExprText,
  isKnownNodeMarker,
  isKnownRawText,
  isKnownStateChangeHandlerParam,
  isKnownStyleMarker,
  isKnownTplSlot,
  isKnownVariant,
  MapExpr,
  Marker,
  Mixin,
  ObjectPath,
  ObjInst,
  PageHref,
  Param,
  ProjectDependency,
  QueryInvalidationExpr,
  RenderExpr,
  RichText,
  RuleSet,
  Site,
  Split,
  StyleExpr,
  StyleToken,
  StyleTokenRef,
  TemplatedString,
  TplComponent,
  TplNode,
  TplRef,
  TplSlot,
  TplTag,
  Variant,
  VariantGroup,
  VariantSetting,
  VariantsRef,
  VarRef,
} from "@/wab/shared/model/classes";
import {
  isStandaloneVariantGroup,
  VariantGroupType,
} from "@/wab/shared/Variants";
import L, { isString, mapValues } from "lodash";

export const INITIAL_VERSION_NUMBER = "0.0.1";

export type SemVerReleaseType = "major" | "minor" | "patch";
export type SemVerAllowedTplTypes = TplTag | TplComponent | TplSlot;
export type AllowedSemVerSiteElement =
  | Component
  | Param
  | VariantGroup
  | Variant
  | Mixin
  | StyleToken
  | ImageAsset
  | Split
  | ProjectDependency
  | SemVerAllowedTplTypes;
interface SemVerSiteComponent {
  type: "Component";
  componentType: "plain" | "page" | "code" | "frame";
  uuid: string;
  name: string;
  path: string | null;
}
interface SemVerSiteVariant {
  type: "Variant";
  name: string;
  isStandalone: boolean;
}
interface SemVerSiteSplit {
  type: "Split Status";
  name: string | null;
  value: string;
  splitType: string;
}
interface SemVerSiteImportedProject {
  type: "Imported Project";
  name: string;
  pkgId: string;
  version: string;
}
interface SemVerSiteDefaultElement {
  type:
    | "Param"
    | "Variant group"
    | "Global variant group"
    | "Mixin"
    | "Style token"
    | "Image"
    | "Icon"
    | "Element"
    | "Split";
  name: string | null;
}
export type SemVerSiteElement =
  | SemVerSiteComponent
  | SemVerSiteVariant
  | SemVerSiteSplit
  | SemVerSiteImportedProject
  | SemVerSiteDefaultElement;

type ParentComponent = Omit<SemVerSiteComponent, "type">;

export interface ChangeLogEntry {
  releaseType: SemVerReleaseType;
  parentComponent: "global" | ParentComponent;
  oldValue: SemVerSiteElement | null;
  newValue: SemVerSiteElement | null;
  description:
    | "removed"
    | "renamed"
    | "added"
    | "named"
    | "updated"
    | "split-status-update";
}

export interface ExternalChangeData {
  importedProjectsChanged: string[];
  pagesChanged: string[];
}

export function mkSemVerSiteElement(
  node: AllowedSemVerSiteElement
): SemVerSiteElement {
  return ensure(
    maybeMkSemVerSiteElement(node),
    "mkSemVerSiteElement: node is not a valid SemVerSiteElement"
  );
}

export function maybeMkSemVerSiteElement(
  node: ObjInst
): SemVerSiteElement | undefined {
  if (isKnownComponent(node)) {
    return {
      type: "Component",
      componentType: node.type as any,
      name: node.name,
      uuid: node.uuid,
      path: isPageComponent(node) ? node.pageMeta?.path : null,
    };
  } else if (isKnownVariant(node)) {
    return {
      type: "Variant",
      name: node.name,
      isStandalone: isStandaloneVariantGroup(node.parent),
    };
  }

  return switchType(node)
    .when(Param, (p) => ({ type: "Param" as const, name: p.variable.name }))
    .when(VariantGroup, (vg) => ({
      type:
        vg.type === VariantGroupType.Component
          ? (`Variant group` as const)
          : (`Global variant group` as const),
      name: vg.param.variable.name,
    }))
    .when(Mixin, (m) => ({ type: "Mixin" as const, name: m.name }))
    .when(StyleToken, (s) => ({ type: "Style token" as const, name: s.name }))
    .when(ImageAsset, (i) => ({
      type:
        i.type === ImageAssetType.Picture
          ? (`Image` as const)
          : (`Icon` as const),
      name: i.name,
    }))
    .when(Split, (s) => ({ type: "Split" as const, name: s.name }))
    .when(TplNode, () => {
      const tpl = node as SemVerAllowedTplTypes;
      return {
        type: "Element" as const,
        name: isKnownTplSlot(tpl) ? tpl.param.variable.name : tpl.name ?? null,
      };
    })
    .when(ProjectDependency, (d) => ({
      type: "Imported Project" as const,
      name: d.name,
      pkgId: d.pkgId,
      version: d.version,
    }))
    .elseUnsafe(() => undefined);
}

/**
 * Given a change log, calculate if this constitutes a
 * major, minor, or patch version bump wrt semantic versioning
 **/
export function calculateSemVer(
  changeLog: ChangeLogEntry[]
): SemVerReleaseType {
  const types = L.map(changeLog, (e) => e.releaseType);

  // major >> minor >> patch
  if (types.includes("major")) {
    return "major";
  } else if (types.includes("minor")) {
    return "minor";
  } else {
    return "patch";
  }
}

function formatParentComponent(c: Component): ParentComponent {
  return {
    name: c.name,
    uuid: c.uuid,
    componentType: c.type as any,
    path: isPageComponent(c) ? c.pageMeta?.path : null,
  };
}

export function extractSplitStatusDiff(
  curr: Site,
  getPrevStatus: (name: string) => SplitStatus
): ChangeLogEntry[] {
  return withoutNils(
    curr.splits.map((split) => {
      const prevStatus = getPrevStatus(split.name);
      if (prevStatus === split.status) {
        return null;
      }
      const change: ChangeLogEntry = {
        releaseType: "patch",
        parentComponent: "global",
        oldValue: {
          type: "Split Status",
          name: split.name,
          value: prevStatus,
          splitType: split.splitType,
        },
        newValue: {
          type: "Split Status",
          name: split.name,
          value: split.status,
          splitType: split.splitType,
        },
        description: "split-status-update",
      };
      return change;
    })
  );
}

function fixParamNames(
  prevComponent: Component,
  currComponent: Component,
  diffs: ChangeLogEntry[]
) {
  return diffs.map((diff) => {
    if (diff.oldValue?.type === "Param") {
      diff.oldValue.name = getParamDisplayName(
        prevComponent,
        ensure(
          prevComponent.params.find(
            (p) => p.variable.name === diff.oldValue?.name
          ),
          "Param should exist in prevComponent"
        )
      );
    }
    if (diff.newValue?.type === "Param") {
      diff.newValue.name = getParamDisplayName(
        currComponent,
        ensure(
          currComponent.params.find(
            (p) => p.variable.name === diff.newValue?.name
          ),
          "Param should exist in currComponent"
        )
      );
    }
    return diff;
  });
}

/**
 * Given an older Site `prev` and newer Site `curr`,
 * this function will generate a change log between the 2.
 *
 * TODO: this only captures API-altering (major/minor)
 * changes (add/rename/remove) at the moment.
 * Patch version changes are NOT included.
 **/
export function compareSites(prev: Site, curr: Site): ChangeLogEntry[] {
  // As we compare components, variants, slots etc
  // we will keep track of what kinds of changes we see here
  const results: ChangeLogEntry[] = [];

  const projectFlags = computedProjectFlags(curr);

  // site.components
  results.push(
    ...genericCheck(
      prev,
      curr,
      prev.components.filter((c) => !isFrameComponent(c)),
      curr.components.filter((c) => !isFrameComponent(c)),
      (c) => c.uuid,
      [
        {
          selector: (c) => c.name,
          ...nameValueDiffSpecs,
        },
        {
          selector: (c) =>
            c.pageMeta ? stableJsonStringify(c.pageMeta, new Set(["uid"])) : "",
          ...patchUpdateDiffSpecs,
        },
      ],
      "global",
      namedEntityDiffSpecs
    )
  );

  // site.components[i]
  const currComponentMap = L.keyBy(curr.components, (o) => o.uuid);
  prev.components.forEach((prevComponent) => {
    if (prevComponent.uuid in currComponentMap === false) {
      return; // Removed, but handled by earlier check
    }
    const currComponent = currComponentMap[prevComponent.uuid];

    const prevVariantGroupParams = new Set<Param>(
      prevComponent.variantGroups.map((vg) => vg.param)
    );
    const currVariantGroupParams = new Set<Param>(
      currComponent.variantGroups.map((vg) => vg.param)
    );
    // site.components[i].params (Slots and States)
    results.push(
      ...fixParamNames(
        prevComponent,
        currComponent,
        genericCheck(
          prev,
          curr,
          prevComponent.params.filter(
            (p) =>
              !prevVariantGroupParams.has(p) &&
              !(isKnownStateChangeHandlerParam(p) && isPrivateState(p.state))
          ),
          currComponent.params.filter(
            (p) =>
              !currVariantGroupParams.has(p) &&
              !(isKnownStateChangeHandlerParam(p) && isPrivateState(p.state))
          ),
          (p) => p.variable.uuid,
          [
            {
              selector: (p) => p.variable.name,
              ...nameValueDiffSpecs,
            },
            {
              selector: (p, site) =>
                `${
                  p.defaultExpr
                    ? hashExpr(site, p.defaultExpr, {
                        projectFlags,
                        component: currComponent,
                        inStudio: true,
                      })
                    : ""
                }:${
                  p.previewExpr
                    ? hashExpr(site, p.previewExpr, {
                        projectFlags,
                        component: currComponent,
                        inStudio: true,
                      })
                    : ""
                }`,
              ...patchUpdateDiffSpecs,
            },
          ],
          formatParentComponent(currComponent),
          namedEntityDiffSpecs
        )
      )
    );

    // site.components[i].variants
    // (interaction variants)
    results.push(
      ...genericCheck(
        prev,
        curr,
        prevComponent.variants,
        currComponent.variants,
        (v) => v.uuid,
        [
          {
            selector: (v) => (v.selectors ?? []).join(":"),
            ...patchUpdateDiffSpecs,
          },
        ],
        formatParentComponent(currComponent),
        namelessEntityDiffSpecs
      )
    );

    // site.components[i].variantGroups
    // site.components[i].variantGroups[j].variants
    results.push(
      ...checkVariantGroups(
        prev,
        curr,
        prevComponent.variantGroups,
        currComponent.variantGroups,
        formatParentComponent(currComponent)
      )
    );

    // site.components[i].tplTree
    results.push(
      ...checkTplNodes(prev, curr, prevComponent, currComponent, {
        projectFlags,
        component: currComponent,
        inStudio: true,
      })
    );
  });

  // site.globalVariantGroups
  // site.globalVariantGroups[i].variants
  if (!isHostLessPackage(prev) && !isHostLessPackage(curr)) {
    results.push(
      ...checkVariantGroups(
        prev,
        curr,
        prev.globalVariantGroups,
        curr.globalVariantGroups,
        "global"
      )
    );
  }

  // site.mixins
  results.push(
    ...genericCheck(
      prev,
      curr,
      prev.mixins,
      curr.mixins,
      (m) => m.uuid,
      [
        {
          selector: (m) => m.name,
          ...nameValueDiffSpecs,
        },
        {
          selector: (m, site) => hashRuleSet(site, m.rs),
          ...patchUpdateDiffSpecs,
        },
      ],
      "global",
      namedEntityDiffSpecs
    )
  );

  // site.styleTokens
  results.push(
    ...genericCheck(
      prev,
      curr,
      prev.styleTokens,
      curr.styleTokens,
      (t) => t.uuid,
      [
        {
          selector: (t) => t.name,
          ...nameValueDiffSpecs,
        },
        {
          selector: (t) => t.value,
          ...patchUpdateDiffSpecs,
        },
      ],
      "global",
      namedEntityDiffSpecs
    )
  );

  // site.imageAssets
  results.push(
    ...genericCheck(
      prev,
      curr,
      prev.imageAssets,
      curr.imageAssets,
      (t) => t.uuid,
      [
        {
          selector: (t) => t.name,
          ...nameValueDiffSpecs,
        },
        {
          selector: (t) => t.dataUri ?? "",
          ...patchUpdateDiffSpecs,
        },
      ],
      "global",
      namedEntityDiffSpecs
    )
  );

  // site.splits
  results.push(
    ...genericCheck(
      prev,
      curr,
      prev.splits,
      curr.splits,
      (t) => t.uuid,
      [
        {
          selector: (t) => t.name,
          ...nameValueDiffSpecs,
        },
      ],
      "global",
      namedEntityDiffSpecs
    )
  );
  // site.splits > status
  results.push(
    ...extractSplitStatusDiff(curr, (name: string) => {
      const prevSplit = prev.splits.find((e) => e.name === name);
      if (!prevSplit) {
        return SplitStatus.New;
      }
      return prevSplit.status as SplitStatus;
    })
  );

  results.push(
    ...genericCheck(
      prev,
      curr,
      prev.projectDependencies,
      curr.projectDependencies,
      (d) => d.projectId,
      [
        {
          selector: (d) => d.version,
          ...patchUpdateDiffSpecs,
        },
      ],
      "global",
      namedEntityDiffSpecs
    )
  );
  // site.arenas - ignore
  // site.themes - ignore
  // site.userManagedFonts - ignore

  // Indirect changes
  const modifiedComponentUuids = new Set(
    withoutNils(
      results.map((v) =>
        v.parentComponent !== "global" ? v.parentComponent.uuid : undefined
      )
    )
  );

  curr.components.forEach((currComponent) => {
    results.push(
      ...checkIndirectTplUsage(currComponent, modifiedComponentUuids)
    );
  });

  return results;
}

interface DiffSpec {
  releaseType: SemVerReleaseType;
  description: ChangeLogEntry["description"];
}

/**
 * `a` is from `prev`.
 * `b` is from `curr`.
 * If values are changed or removed from a=>b, that constitutes a "major" version bump.
 * If values are added from a=>b, that's a "minor" version bump
 * Otherwise, "patch" version bump
 **/
function genericCheck<T extends AllowedSemVerSiteElement>(
  prev: Site,
  curr: Site,
  a: Array<T>,
  b: Array<T>,
  keySelector: (o: T) => string,
  valueSelectors: {
    selector: (o: T, site: Site) => string;
    valueAdded: DiffSpec;
    valueChanged: DiffSpec;
  }[],
  parentComponent: "global" | ParentComponent,
  opts: {
    removed: DiffSpec;
    added: DiffSpec;
  }
) {
  const partialResults: ChangeLogEntry[] = [];
  const visitedKeys: string[] = [];
  const aMap = L.keyBy(a, keySelector);
  const bMap = L.keyBy(b, keySelector);

  for (const key in aMap) {
    visitedKeys.push(key);
    if (key in bMap === false) {
      partialResults.push({
        releaseType: opts.removed.releaseType,
        parentComponent,
        oldValue: mkSemVerSiteElement(aMap[key]),
        newValue: null,
        description: opts.removed.description,
      });
    } else {
      for (const { selector, valueAdded, valueChanged } of valueSelectors) {
        const aVal = selector(aMap[key], prev);
        const bVal = selector(bMap[key], curr);
        if (!aVal && bVal) {
          partialResults.push({
            releaseType: valueAdded.releaseType,
            parentComponent,
            oldValue: mkSemVerSiteElement(aMap[key]),
            newValue: mkSemVerSiteElement(bMap[key]),
            description: valueAdded.description,
          });
        } else if (aVal !== bVal) {
          partialResults.push({
            releaseType: valueChanged.releaseType,
            parentComponent,
            oldValue: mkSemVerSiteElement(aMap[key]),
            newValue: mkSemVerSiteElement(bMap[key]),
            description: valueChanged.description,
          });
        }
      }
    }
  }

  // If `b` has more keys, we must have added something
  for (const key in bMap) {
    // for all new keys in b
    if (!visitedKeys.includes(key)) {
      partialResults.push({
        releaseType: opts.added.releaseType,
        parentComponent,
        oldValue: null,
        newValue: mkSemVerSiteElement(bMap[key]),
        description: opts.added.description,
      });
    }
  }

  return partialResults;
}

/**
 * aComp is old, bComp is new
 */
function checkTplNodes(
  prev: Site,
  curr: Site,
  aComp: Component,
  bComp: Component,
  exprCtx: ExprCtx
): ChangeLogEntry[] {
  const results: ChangeLogEntry[] = [];
  const aNodes = flattenTpls(aComp.tplTree).filter(
    (n): n is SemVerAllowedTplTypes => isTplNamable(n) || isTplSlot(n)
  );
  const bNodes = flattenTpls(bComp.tplTree).filter(
    (n): n is SemVerAllowedTplTypes => isTplNamable(n) || isTplSlot(n)
  );
  const aNodeMap = L.keyBy(aNodes, (n) => n.uuid);
  const bNodeMap = L.keyBy(bNodes, (n) => n.uuid);

  const aNodeNamer = makeNodeNamer(aComp);
  const bNodeNamer = makeNodeNamer(bComp);

  const aNames = new Set(withoutNils(aNodes.map(aNodeNamer)));
  const bNames = new Set(withoutNils(bNodes.map(bNodeNamer)));

  for (const aNode of aNodes) {
    const aName = aNodeNamer(aNode);
    const bNode = bNodeMap[aNode.uuid];
    if (!bNode) {
      // This node has been deleted.  If this node had a name, and now no other node has
      // that name, then this is a major change; else a patch change
      const releaseType = aName && !bNames.has(aName) ? "major" : "patch";
      results.push({
        releaseType,
        parentComponent: formatParentComponent(bComp),
        oldValue: mkSemVerSiteElement(aNode),
        newValue: null,
        description: "removed",
      });
    } else {
      const bName = bNodeNamer(bNode);
      if (aName !== bName) {
        // the node has just been renamed.
        const releaseType =
          // The old name is no longer exposed in the new set of names, so we've
          // lost a name; a major revision
          aName && !bNames.has(aName)
            ? "major"
            : // The new name is not in the old set of names, so we've added
            // a new name; a minor revision
            bName && !aNames.has(bName)
            ? "minor"
            : // Else, the set of names hasn't been altered by this node's renaming,
              // so it's a patch revision
              "patch";
        results.push({
          releaseType,
          parentComponent: formatParentComponent(bComp),
          oldValue: mkSemVerSiteElement(aNode),
          newValue: mkSemVerSiteElement(bNode),
          description: aName ? "renamed" : "named",
        });
      }

      if (
        isTplVariantable(aNode) &&
        isTplVariantable(bNode) &&
        hashVariantSettings(prev, aNode, exprCtx) !==
          hashVariantSettings(curr, bNode, exprCtx)
      ) {
        // Style has been updated
        results.push({
          releaseType: "patch",
          parentComponent: formatParentComponent(bComp),
          oldValue: mkSemVerSiteElement(aNode),
          newValue: mkSemVerSiteElement(bNode),
          description: "updated",
        });
      }
    }
  }

  for (const bNode of bNodes) {
    if (!aNodeMap[bNode.uuid]) {
      // A new node; minor if introduces a new name
      const bName = bNodeNamer(bNode);
      const releaseType = bName && !aNames.has(bName) ? "minor" : "patch";
      results.push({
        releaseType,
        parentComponent: formatParentComponent(bComp),
        oldValue: null,
        newValue: mkSemVerSiteElement(bNode),
        description: "added",
      });
    }
  }

  return results;
}
/**
 * Check if any of the components in the tpl tree
 * have been modified.
 */
function checkIndirectTplUsage(
  comp: Component,
  modifiedComponentUuids: Set<string>
): ChangeLogEntry[] {
  const results: ChangeLogEntry[] = [];

  for (const tpl of flattenTpls(comp.tplTree)) {
    if (!isTplComponent(tpl)) {
      continue;
    }
    if (modifiedComponentUuids.has(tpl.component.uuid)) {
      results.push({
        releaseType: "patch",
        parentComponent: formatParentComponent(comp),
        oldValue: mkSemVerSiteElement(tpl),
        newValue: mkSemVerSiteElement(tpl),
        description: "updated",
      });
    }
  }
  return results;
}

/**
 * Given 2 arrays of variant groups, check both the variantGroup
 * and included variants for version changes.
 **/
function checkVariantGroups(
  prev: Site,
  curr: Site,
  aVgs: Array<VariantGroup>,
  bVgs: Array<VariantGroup>,
  parentComponent: "global" | ParentComponent
): ChangeLogEntry[] {
  const partialResults: ChangeLogEntry[] = [];
  const _aVgMap = L.keyBy(aVgs, (o) => o.uuid);
  const bVgMap = L.keyBy(bVgs, (o) => o.uuid);

  // variantGroups
  partialResults.push(
    ...genericCheck(
      prev,
      curr,
      aVgs,
      bVgs,
      (vg) => vg.uuid,
      [
        {
          selector: (vg) => vg.param.variable.name,
          ...nameValueDiffSpecs,
        },
      ],
      parentComponent,
      namedEntityDiffSpecs
    )
  );

  // variantGroups[i].variants
  aVgs.forEach((aVg) => {
    if (aVg.uuid in bVgMap === false) {
      return; // Removed, but handled by earlier check
    }
    const bVg = bVgMap[aVg.uuid];
    partialResults.push(
      ...genericCheck(
        prev,
        curr,
        aVg.variants,
        bVg.variants,
        (v) => v.uuid,
        [
          {
            selector: (v) => v.name,
            ...nameValueDiffSpecs,
          },
          {
            selector: (v) => v.mediaQuery ?? "",
            ...patchUpdateDiffSpecs,
          },
        ],
        parentComponent,
        namedEntityDiffSpecs
      )
    );
  });
  return partialResults;
}

const nameValueDiffSpecs = {
  valueAdded: { releaseType: "minor", description: "named" },
  valueChanged: { releaseType: "major", description: "renamed" },
} as const;

const namelessEntityDiffSpecs = {
  removed: { releaseType: "patch", description: "updated" },
  added: { releaseType: "patch", description: "updated" },
} as const;

const namedEntityDiffSpecs = {
  removed: { releaseType: "major", description: "removed" },
  added: { releaseType: "minor", description: "added" },
} as const;

const patchUpdateDiffSpecs = {
  valueAdded: { releaseType: "patch", description: "updated" },
  valueChanged: { releaseType: "patch", description: "updated" },
} as const;

function hashVariantSettings(site: Site, tpl: TplNode, exprCtx: ExprCtx) {
  return tpl.vsettings
    .map((vs) => hashVariantSetting(site, vs, exprCtx))
    .join("");
}

function hashVariantSetting(site: Site, vs: VariantSetting, exprCtx: ExprCtx) {
  return `
  ${vs.variants.map((v) => v.uuid).join("")}
  ${vs.args
    .map(
      (arg) => `${arg.param.variable.uuid}=${hashExpr(site, arg.expr, exprCtx)}`
    )
    .join("")}
  ${Object.entries(vs.attrs)
    .map(([key, val]) => `${key}=${hashExpr(site, val, exprCtx)}`)
    .join("")}
  ${vs.dataCond ? hashExpr(site, vs.dataCond, exprCtx) : ""}
  ${vs.text ? hashText(site, vs.text, exprCtx) : ""}
  ${hashRuleSet(site, vs.rs)}
  `;
}

function hashRuleSet(site: Site, rs: RuleSet) {
  const allTokensDict = siteToAllTokensDict(site);
  const rsValues = Object.entries(rs.values)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, val]) => {
      const refTokenIds = extractAllReferencedTokenIds(val);
      if (refTokenIds.length === 0) {
        return [key, val];
      }
      const refTokens = withoutNils(refTokenIds.map((x) => allTokensDict[x]));
      return [key, refTokens.map((t) => t.value).join("")];
    });
  return `
    ${JSON.stringify(rsValues)}
    ${[...rs.mixins]
      .sort((a, b) => a.uuid.localeCompare(b.uuid))
      .map((m) => hashRuleSet(site, m.rs))
      .join("")}
  `;
}

export function hashExpr(site: Site, _expr: Expr, exprCtx: ExprCtx) {
  return switchType(_expr)
    .when(
      CustomCode,
      (expr) =>
        expr.code +
        (expr.fallback ? hashExpr(site, expr.fallback, exprCtx) : "")
    )
    .when(RenderExpr, (expr) => expr.tpl.map((x) => x.uuid).join(""))
    .when(VarRef, (expr) => expr.variable.uuid)
    .when(StyleTokenRef, (expr) => expr.token.value)
    .when(ImageAssetRef, (expr) => expr.asset.dataUri)
    .when(PageHref, (expr) => expr.page.uuid)
    .when(VariantsRef, (expr) => expr.variants.map((v) => v.uuid).join(""))
    .when(
      ObjectPath,
      (expr) =>
        expr.path.join(".") +
        (expr.fallback ? hashExpr(site, expr.fallback, exprCtx) : "")
    )
    .when(DataSourceOpExpr, (expr) => asCode(expr, exprCtx).code)
    .when(EventHandler, (expr) => expr.interactions.map((i) => i.uuid).join(""))
    .when(CollectionExpr, (collectionExpr) =>
      collectionExpr.exprs
        .map((expr) => (expr ? hashExpr(site, expr, exprCtx) : "undefined"))
        .join("#")
    )
    .when(MapExpr, (mapExpr) =>
      Object.entries(mapExpr.mapExpr).map(
        ([name, expr]) => `{${name}}:{${hashExpr(site, expr, exprCtx)}}#`
      )
    )
    .when(FunctionArg, (functionArg) => functionArg.uuid)
    .when(FunctionExpr, (functionExpr) => asCode(functionExpr, exprCtx).code)
    .when(
      StyleExpr,
      (expr) =>
        `${expr.uuid}-${expr.styles.map(
          (s) => `${s.selector}-${hashRuleSet(site, s.rs)}`
        )}`
    )
    .when(TemplatedString, (templatedString) =>
      templatedString.text
        .map((t) => (isString(t) ? t : `{{ ${hashExpr(site, t, exprCtx)} }} `))
        .join("")
    )
    .when(TplRef, (ref) => `ref=${ref.tpl.uuid}`)
    .when(
      QueryInvalidationExpr,
      (queryInvalidation) => asCode(queryInvalidation, exprCtx).code
    )
    .when(CompositeExpr, (expr) =>
      JSON.stringify({
        hostLiteral: expr.hostLiteral,
        substitutions: mapValues(expr.substitutions, (subexpr) =>
          hashExpr(site, subexpr, exprCtx)
        ),
      })
    )
    .when(CustomFunctionExpr, (expr) => asCode(expr, exprCtx).code)
    .result();
}

function hashText(site: Site, text: RichText, exprCtx: ExprCtx) {
  function hashMarker(marker: Marker) {
    if (isKnownStyleMarker(marker)) {
      return `${marker.position}${marker.length}${hashRuleSet(
        site,
        marker.rs
      )}`;
    } else if (isKnownNodeMarker(marker)) {
      return `${marker.tpl.uuid}${marker.position}${marker.length}`;
    } else {
      throw new Error(`Unexpected marker ${marker}`);
    }
  }

  if (isKnownRawText(text)) {
    return `${text.text}${text.markers.map(hashMarker).join("")}`;
  } else if (isKnownExprText(text)) {
    return hashExpr(site, text.expr, exprCtx);
  } else {
    throw new Error(`Unexpected text ${text}`);
  }
}

// https://stackoverflow.com/a/65687141/1339783
export function compareVersionNumbers(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function getExternalChangeData(
  changeLog: ChangeLogEntry[]
): ExternalChangeData {
  const isPageComponentChange = (
    value: SemVerSiteElement | null
  ): value is SemVerSiteComponent => {
    return value?.type === "Component" && value?.componentType === "page";
  };

  return {
    importedProjectsChanged: [
      ...new Set(
        withoutNils(
          changeLog.flatMap((entry) => {
            const result: string[] = [];
            if (entry.newValue?.type === "Imported Project") {
              result.push(entry.newValue.name);
            }
            if (entry.oldValue?.type === "Imported Project") {
              result.push(entry.oldValue.name);
            }
            return result;
          })
        )
      ),
    ],
    pagesChanged: [
      ...new Set(
        withoutNils(
          changeLog.flatMap((entry) => {
            const result: string[] = [];
            if (isPageComponentChange(entry.newValue)) {
              result.push(entry.newValue.path!);
            }
            if (isPageComponentChange(entry.oldValue)) {
              result.push(entry.oldValue.path!);
            }
            if (
              entry.parentComponent !== "global" &&
              entry.parentComponent.path
            ) {
              result.push(entry.parentComponent.path);
            }
            return result;
          })
        )
      ),
    ],
  };
}
