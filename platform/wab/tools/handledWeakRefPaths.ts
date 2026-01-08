import { TypeStamped } from "../src/wab/shared/common";
import type * as classes from "../src/wab/shared/model/classes";

type Classes = FilteredValues<
  typeof classes,
  // Filter Class objects
  TypeStamped<any> & (abstract new (...args: any) => any)
>;

export type ClassNames = keyof Classes;
type ClassFields<Cls extends ClassNames> = KeysFiltered<
  InstanceType<Classes[Cls]>,
  "uid" | "typeTag"
>;

// Because "prop" exprs are used in many fields and there are several of them
// containing WeakRefs, we group them here. Whenever editing this list make sure
// it's fixed everywhere it's used in `handledWeakRefPaths`!
const handledPropExprsWithWeakRefs: Path[] = [
  [["VarRef", "variable"], "Var"],
  [["ImageAssetRef", "asset"], "ImageAsset"],
  [["TplRef", "tpl"], "TplNode"],
  [["StyleTokenRef", "token"], "StyleToken"],
  [["PageHref", "page"], "Component"],
  [["FunctionArg", "argType"], "ArgType"],
  [["StrongFunctionArg", "argType"], "ArgType"],
];

// Pair [Class, Field]
export type PathEdge<Cls extends ClassNames> = [Cls, ClassFields<Cls>];

export type PartialPath = DistributedPathEdge<ClassNames>[];

// List of edges, ending at the referenced instance
export type Path = [...PartialPath, ClassNames];

/**
 * This is a list of path suffixes to weak refs that are handled by:
 * - `cloneSite` in `sites.ts`
 * - `upgradeProjectDeps` in `project-deps.ts`
 * - `fixDanglingReferenceConflicts` in `server-updates-utils.ts`
 *
 * Remember:
 * - In `cloneSite`, if the referenced instance is local and has been cloned,
 *   all references to it must be updated - but not if the referenced instance
 *   is from an imported project!
 * - In `upgradeProjectDeps`, if the site references an instance from the
 *   imported dependency, you might need to update it to reference the same
 *   instance in the upgraded project (or clone / delete it if the instance no
 *   longer exists, etc)
 * - In `fixDanglingReferenceConflicts`, you need to handle situations when the
 *   referenced instance has been deleted, but not the reference to it (it can
 *   happen even if the delete function looks for all weak refs, due to
 *   multiplayer and branching)
 */
export const handledWeakRefPaths: Path[] = [
  [["TplComponent", "component"], "Component"],
  [["ComponentArena", "component"], "Component"],
  [["PageArena", "component"], "Component"],
  [["Site", "defaultComponents"], "Component"],
  [["Site", "pageWrapper"], "Component"],
  [["Component", "superComp"], "Component"],
  [["Component", "subComps"], "Component"],
  [["ComponentVariantSplitContent", "component"], "Component"],
  [["ComponentSwapSplitContent", "fromComponent"], "Component"],
  [["ComponentSwapSplitContent", "toComponent"], "Component"],
  [["RuleSet", "values"], "ImageAsset"],
  [["RuleSet", "values"], "StyleToken"],
  [["RuleSet", "mixins"], "Mixin"],
  [["TplSlot", "param"], "Param"],
  [
    ["Component", "params"],
    ["SlotParam", "type"],
    ["RenderableType", "params"],
    ["ComponentInstance", "component"],
    "Component",
  ],
  [
    ["Component", "params"],
    ["SlotParam", "type"],
    ["RenderFuncType", "allowed"],
    ["ComponentInstance", "component"],
    "Component",
  ],
  [["Component", "params"], ["SlotParam", "tplSlot"], "TplSlot"],
  [["Component", "params"], ["StateParam", "state"], "State"],
  [["Component", "params"], ["StateChangeHandlerParam", "state"], "State"],
  [
    ["Component", "states"],
    ["VariantGroupState", "variantGroup"],
    "ComponentVariantGroup",
  ],
  [
    ["Component", "variantGroups"],
    ["ComponentVariantGroup", "linkedState"],
    "VariantGroupState",
  ],
  [["VariantSetting", "args"], ["Arg", "param"], "Param"],
  [["ComponentVariantGroup", "param"], "Param"],
  [["Component", "states"], ["State", "param"], "Param"],
  [["Component", "states"], ["State", "onChangeParam"], "Param"],
  [["StyleToken", "value"], "StyleToken"],
  [["VariantedValue", "value"], "StyleToken"],
  [["ArenaFrameGrid", "rows"], ["ArenaFrameRow", "rowKey"], "VariantGroup"],
  [["Variant", "parent"], "VariantGroup"],
  [["Site", "activeScreenVariantGroup"], "VariantGroup"],
  [["GlobalVariantSplitContent", "group"], "VariantGroup"],
  [["ComponentVariantSplitContent", "group"], "VariantGroup"],
  [["ArenaFrameGrid", "rows"], ["ArenaFrameRow", "rowKey"], "Variant"],
  [["ArenaFrameRow", "cols"], ["ArenaFrameCell", "cellKey"], "Variant"],
  [["ArenaFrame", "targetVariants"], "Variant"],
  [["ArenaFrame", "pinnedVariants"], "Variant"],
  [["ArenaFrame", "targetGlobalVariants"], "Variant"],
  [["ArenaFrame", "pinnedGlobalVariants"], "Variant"],
  [["ColumnsSetting", "screenBreakpoint"], "Variant"],
  [["VariantSetting", "variants"], "Variant"],
  [["VariantsRef", "variants"], "Variant"],
  [
    ["StyleToken", "variantedValues"],
    ["VariantedValue", "variants"],
    "Variant",
  ],
  [["Mixin", "variantedRs"], ["VariantedRuleSet", "variants"], "Variant"],
  [["GlobalVariantSplitContent", "variant"], "Variant"],
  [["ComponentVariantSplitContent", "variant"], "Variant"],
  [["Component", "states"], "State"],
  [["State", "implicitState"], "State"],
  [["Variant", "forTpl"], "TplNode"],
  [["State", "tplNode"], "TplNode"],
  [["TplNode", "parent"], "TplNode"],
  [["DataSourceOpExpr", "parent"], ["QueryRef", "ref"], "ComponentDataQuery"],
  [["DataSourceOpExpr", "parent"], ["QueryRef", "ref"], "TplNode"],
  [
    ["QueryInvalidationExpr", "invalidationQueries"],
    ["QueryRef", "ref"],
    "ComponentDataQuery",
  ],
  [["Site", "projectDependencies"], "ProjectDependency"],
  [["RawText", "markers"], ["NodeMarker", "tpl"], "TplNode"],
  [
    ["QueryInvalidationExpr", "invalidationQueries"],
    ["QueryRef", "ref"],
    "TplNode",
  ],
  [["DataSourceOpExpr", "parent"], ["QueryRef", "ref"], "TplNode"],
  [["Site", "activeTheme"], "Theme"],
  [["EventHandler", "interactions"], ["Interaction", "parent"], "EventHandler"],
  ...handledPropExprsWithWeakRefs.flatMap((exprWithWeakRef): Path[] => [
    [["VariantSetting", "args"], ["Arg", "expr"], ...exprWithWeakRef],
    [["VariantSetting", "attrs"], ...exprWithWeakRef],
    [["Param", "defaultExpr"], ...exprWithWeakRef],
    [["Param", "previewExpr"], ...exprWithWeakRef],
    [["CustomCode", "fallback"], ...exprWithWeakRef],
    [["ObjectPath", "fallback"], ...exprWithWeakRef],
    [["PageHref", "params"], ...exprWithWeakRef],
    [["PageHref", "query"], ...exprWithWeakRef],
    [["PageHref", "fragment"], ...exprWithWeakRef],
    [["FunctionArg", "expr"], ...exprWithWeakRef],
    [["CollectionExpr", "exprs"], ...exprWithWeakRef],
    [["MapExpr", "mapExpr"], ...exprWithWeakRef],
    [["FunctionExpr", "bodyExpr"], ...exprWithWeakRef],
    [["CompositeExpr", "substitutions"], ...exprWithWeakRef],
    [["Interaction", "args"], ["NameArg", "expr"], ...exprWithWeakRef],
  ]),
];

// Helper types:

// https://stackoverflow.com/questions/63401066/distribute-a-generic-type-over-a-union
type DistributedPathEdge<Cls extends ClassNames> = Cls extends infer C
  ? C extends ClassNames
    ? PathEdge<C>
    : never
  : never;

type FilteredKeys<T, Extended> = {
  [K in keyof T]: T[K] extends Extended ? K : never;
}[keyof T];

type FilteredValues<T, Extended> = {
  [K in FilteredKeys<T, Extended>]: T[K];
};

type MaybeWithPrefix<T extends string | null> = T extends null
  ? never
  : `${T}${string}`;

type MaybeWithSuffix<T extends string | null> = T extends null
  ? never
  : `${string}${T}`;

/**
 * Returns all keys from the object excluding the ones with a given prefix or
 * suffix.
 */
type KeysFiltered<
  T,
  Prefix extends string | null = null,
  Suffix extends string | null = null
> = {
  [K in keyof T]-?: K extends MaybeWithPrefix<Prefix>
    ? never
    : K extends MaybeWithSuffix<Suffix>
    ? never
    : K;
}[keyof T];
