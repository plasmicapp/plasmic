import { hasTokenRefs, tryParseAllTokenRefs } from "@/wab/commons/StyleToken";
import {
  componentToAllVariants,
  siteToAllGlobalVariants,
  siteToAllImageAssetsDict,
} from "@/wab/shared/cached-selectors";
import {
  ensureArray,
  hackyCast,
  switchType,
  xSetDefault,
} from "@/wab/shared/common";
import { allComponentVariants } from "@/wab/shared/core/components";
import {
  hasAssetRefs,
  tryParseImageAssetRef,
} from "@/wab/shared/core/image-assets";
import {
  siteStyleTokensAllDeps,
  siteStyleTokensAllDepsDict,
} from "@/wab/shared/core/site-style-tokens";
import { allGlobalVariants, allImageAssets } from "@/wab/shared/core/sites";
import { undoChanges } from "@/wab/shared/core/undo-util";
import { dbg } from "@/wab/shared/dbg";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  ArenaFrame,
  Component,
  ImageAsset,
  ObjInst,
  ProjectDependency,
  RuleSet,
  Site,
  StyleToken,
  Variant,
  VariantedValue,
  isKnownArena,
  isKnownComponent,
  isKnownComponentArena,
  isKnownPageArena,
} from "@/wab/shared/model/classes";
import { Tracker } from "@/wab/shared/model/tracking";
import { Dictionary } from "lodash";
import { Err, Ok, Result, err, ok } from "neverthrow";

export interface ChangeNode {
  readonly inst: ObjInst;
  readonly field: string;
}

interface BaseChange {}

/**
 * Change representing a List or Set field value having
 * items added or removed.
 */
export interface ArraySpliceChange<T = any> extends BaseChange {
  type: "array-splice";
  object: T[];
  index: number;
  added: T[];
  removed: T[];
}

export const mkArrayBeforeSplice = <T = any>(
  curValue: ReadonlyArray<T>,
  change: ArraySpliceChange<T>,
) => {
  const v = curValue.slice(0);
  v.splice(change.index, change.added.length, ...change.removed);
  return v;
};

/**
 * Change representing a List or Set field value having
 * a member replaced.
 */
interface ArrayUpdateChange<T = any> extends BaseChange {
  type: "array-update";
  object: T[];
  index: number;
  oldValue: T;
  newValue: T;
}

/**
 * Change representing a Map field value having a new
 * member added.
 */
export interface ObjAddChange<T = any> extends BaseChange {
  type: "obj-add";
  object: any;
  key: string | number | symbol;
  newValue: T;
}

/**
 * Change representing a Map field value having an existing
 * entry changed.
 */
export interface ObjUpdateChange<T = any> extends BaseChange {
  type: "obj-update";
  key: string | number | symbol;
  object: any;
  oldValue: T;
  newValue: T;
}

/**
 * Change representing a Map field value having an existing
 * entry deleted.
 */
export interface ObjDeleteChange<T = any> extends BaseChange {
  type: "obj-delete";
  key: string | number | symbol;
  object: any;
  oldValue: T;
}

/**
 * Change representing a `ObjInst`'s field being set to a
 * new value.
 */
interface FieldUpdateChange<T = any> extends BaseChange {
  type: "update";
  oldValue: T;
  newValue: T;
}

export type AnyChange =
  | ArraySpliceChange
  | ArrayUpdateChange
  | ObjAddChange
  | ObjDeleteChange
  | ObjUpdateChange
  | FieldUpdateChange;

export type ModelChange = AnyChange & {
  // The path to the node whose field value has changed,
  // from the root to the node that changed.
  // Note that each `ChangeNode` in the path represents an
  // `ObjInst` and its field! That means array indexes from
  // List or Set field types, or object keys from Map field
  // types, are not part of the path.  You therefore may not
  // know _exactly_ how to find the changed node, but you
  // in any case have a handle to it in path[-1].
  // The path can be `undefined` if the instance was unreachable
  // when the change happened.
  path?: ChangeNode[];

  // The actual node that changed and it's field.
  // That's a shortcut to path[-1], and also handles the case
  // when the node was unreachable when it changed.
  changeNode: ChangeNode;
};

export type ModelChangeListener = (event: ModelChange) => void;

/**
 * Starts tracking changes to `site`: it and every inst it owns become tracked by
 * a `Tracker` (see tracking.ts), and every change to them is passed to
 * `opts.listener`.
 *
 * The model must be a tree of strong references; other references must be
 * annotated @WeakRef.
 *
 * Dependency sites are not tracked: `ProjectDependency.site` is static, and
 * ProjectDependencyManager handles adding a dep, so its tpls are not new insts
 * of this site. Parent pointers are tracked, although redundant, because
 * incremental saves apply changes to them.
 *
 * @returns the `Tracker`; call its `dispose()` to stop reporting changes.
 */
export function observeModel(
  site: Site,
  opts: {
    listener: ModelChangeListener;
    visitNodeListener?: (inst: ObjInst) => void;
    isExternalRef?: (obj: ObjInst) => boolean;
    quiet?: boolean;
  },
): Tracker<ObjInst> {
  const start = new Date().getTime();

  const implicitRefs = makeImplicitRefResolver(site);

  const tracker = new Tracker<ObjInst>({
    root: site,
    listener: opts.listener,
    excludeFields: [ProjectDependency.$field_site],
    isExternalRef: opts.isExternalRef,
    visitNodeListener: opts.visitNodeListener,
    isScopeRoot: isSelectorScopeRoot,
    resolveImplicitRefs: implicitRefs.resolve,
    getInstName: (inst) => instUtil.tryGetInstClass(inst)?.name ?? "?",
  });
  implicitRefs.finishFirstRun();

  if (!opts.quiet) {
    console.log(
      `Finished instrumenting model in ${new Date().getTime() - start}ms; saw ${
        tracker.getNewInsts().size
      } instances`,
    );
  }

  // Prune the first time to check the invariants of the initial tree
  tracker.prune();

  return tracker;
}

/**
 * The scopes that coarse selectors (see `coarseSelector`) depend on:
 *
 * - Each Component's tpl tree, the grain at which selectors traverse the site.
 * - The rest of each Component (params, variants, states...), which is what
 *   other Components read, so that edits to its tree don't invalidate them.
 * - Each arena, so that frequent frame changes don't invalidate selectors
 *   that read the rest of the Site.
 * - The rest of the Site.
 */
function isSelectorScopeRoot(
  inst: ObjInst,
  parent: ObjInst | undefined,
  parentField: string | undefined,
) {
  return (
    isKnownComponent(inst) ||
    (parentField === "tplTree" && isKnownComponent(parent)) ||
    isKnownArena(inst) ||
    isKnownPageArena(inst) ||
    isKnownComponentArena(inst)
  );
}

/**
 * Resolves the insts that a string field refers to (e.g. a style token's CSS
 * var ref), which are tracked as weak references.
 */
function makeImplicitRefResolver(site: Site) {
  // Until the tracker is created, the site's insts aren't tracked, so the
  // selectors don't cache. Compute these once for that first run instead.
  let firstRun = true;
  const firstRunData = {
    allStyleTokens: undefined as ReadonlyArray<StyleToken> | undefined,
    allImageAssets: undefined as ImageAsset[] | undefined,
    allGlobalVariants: undefined as Variant[] | undefined,
    allComponentVariants: undefined as Map<Component, Variant[]> | undefined,
  };

  // These only grow, so that a ref to a deleted inst still resolves when the
  // ref is removed.
  const tokensCache = new Map<string, StyleToken>();
  const imageAssetsCache = new Map<string, ImageAsset>();
  const globalVariantsCache = new Map<string, Variant>();
  const componentVariantsCache = new Map<Component, Map<string, Variant>>();

  const updateAndGetAllCachedInsts = <T extends ObjInst & { uuid: string }>(
    insts: ReadonlyArray<T> | Dictionary<T>,
    instCache: Map<string, T>,
  ): T[] => {
    (Array.isArray(insts) ? insts : Object.values(insts)).forEach((inst) =>
      instCache.set(inst.uuid, inst),
    );
    return [...instCache.values()];
  };

  const getAllStyleTokens = () => {
    if (firstRun) {
      if (!firstRunData.allStyleTokens) {
        firstRunData.allStyleTokens = siteStyleTokensAllDeps(site);
      }
      return updateAndGetAllCachedInsts(
        firstRunData.allStyleTokens,
        tokensCache,
      );
    } else {
      return updateAndGetAllCachedInsts(
        siteStyleTokensAllDepsDict(site),
        tokensCache,
      );
    }
  };

  const getAllImageAssets = () => {
    if (firstRun) {
      if (!firstRunData.allImageAssets) {
        firstRunData.allImageAssets = allImageAssets(site, {
          includeDeps: "all",
        });
      }
      return updateAndGetAllCachedInsts(
        firstRunData.allImageAssets,
        imageAssetsCache,
      );
    } else {
      return updateAndGetAllCachedInsts(
        siteToAllImageAssetsDict(site),
        imageAssetsCache,
      );
    }
  };

  const getAllGlobalVariants = () => {
    if (firstRun) {
      if (!firstRunData.allGlobalVariants) {
        firstRunData.allGlobalVariants = allGlobalVariants(site, {
          includeDeps: "direct",
        });
      }
      return updateAndGetAllCachedInsts(
        firstRunData.allGlobalVariants,
        globalVariantsCache,
      );
    } else {
      return updateAndGetAllCachedInsts(
        siteToAllGlobalVariants(site),
        globalVariantsCache,
      );
    }
  };

  const getAllComponentVariants = (component: Component) => {
    if (firstRun) {
      if (!firstRunData.allComponentVariants) {
        firstRunData.allComponentVariants = new Map<Component, Variant[]>();
      }
      return updateAndGetAllCachedInsts(
        xSetDefault(firstRunData.allComponentVariants, component, () =>
          allComponentVariants(component, {
            includeSuperVariants: true,
          }),
        ),
        xSetDefault(componentVariantsCache, component, () => new Map()),
      );
    } else {
      return updateAndGetAllCachedInsts(
        componentToAllVariants(component),
        xSetDefault(componentVariantsCache, component, () => new Map()),
      );
    }
  };

  // Make sure to fill the cache in the first run
  getAllStyleTokens();
  getAllImageAssets();
  getAllGlobalVariants();
  site.components.forEach((c) => getAllComponentVariants(c));

  // Unfortunately we need to handle those case-by-case :/
  const classesToTest = [ArenaFrame, StyleToken, RuleSet, VariantedValue];

  const resolve = (
    inst: ObjInst,
    fieldName: string,
    value: string,
  ): ObjInst[] | undefined => {
    if (!classesToTest.some((cls) => inst instanceof cls)) {
      return undefined;
    }

    const child: ObjInst | ObjInst[] | undefined = switchType(inst)
      .when(ArenaFrame, (frame) => {
        if (fieldName === "pinnedVariants") {
          return getAllComponentVariants(frame.container.component).find(
            (v) => v.uuid === value,
          );
        } else if (fieldName === "pinnedGlobalVariants") {
          return getAllGlobalVariants().find((v) => v.uuid === value);
        }
        return undefined;
      })
      .when([StyleToken, VariantedValue], () => {
        if (fieldName === "value" && hasTokenRefs(value)) {
          return tryParseAllTokenRefs(value, getAllStyleTokens());
        }
        return undefined;
      })
      .when(RuleSet, () => {
        if (fieldName === "values") {
          if (hasAssetRefs(value)) {
            return tryParseImageAssetRef(value, getAllImageAssets());
          } else if (hasTokenRefs(value)) {
            return tryParseAllTokenRefs(value, getAllStyleTokens());
          }
        }
        return undefined;
      })
      .elseUnsafe(() => undefined);

    // The same rule value string can reference several tokens
    return child ? ensureArray(child) : undefined;
  };

  return {
    resolve,
    finishFirstRun: () => {
      firstRun = false;
      firstRunData.allGlobalVariants =
        firstRunData.allImageAssets =
        firstRunData.allStyleTokens =
        firstRunData.allComponentVariants =
          undefined;
    },
  };
}

export interface RecordedChanges {
  changes: ModelChange[];
  newInsts: ObjInst[];
  removedInsts: ObjInst[];
}

export function emptyRecordedChanges(): RecordedChanges {
  return {
    changes: [],
    newInsts: [],
    removedInsts: [],
  };
}

/**
 * Merges several groups of changes recorded by `recorder.withRecording`.
 * Notice the order matters! It expects to be called in the other the changes
 * happened (i.e., `mergeRecordedChanges(existingChanges, newChanges)`).
 * @param changes
 * @returns
 */
export function mergeRecordedChanges(...changes: RecordedChanges[]) {
  if (changes.length === 0) {
    return emptyRecordedChanges();
  } else if (changes.length === 1) {
    return changes[0];
  } else {
    let merged = changes[0];
    changes.slice(1).forEach((newChanges) => {
      merged = doMergeRecordedChanges(merged, newChanges);
    });
    return merged;
  }
}

function doMergeRecordedChanges(
  existingChanges: RecordedChanges,
  newChanges: RecordedChanges,
): RecordedChanges {
  const newlyAdded = new Set(newChanges.newInsts);
  const newlyRemoved = new Set(newChanges.removedInsts);
  return {
    changes: [...existingChanges.changes, ...newChanges.changes],
    newInsts: Array.from(
      new Set([
        ...existingChanges.newInsts.filter((inst) => !newlyRemoved.has(inst)),
        ...newChanges.newInsts,
      ]).keys(),
    ),
    removedInsts: Array.from(
      new Set([
        ...existingChanges.removedInsts.filter((inst) => !newlyAdded.has(inst)),
        ...newChanges.removedInsts,
      ]).keys(),
    ),
  };
}

export interface IChangeRecorder {
  prune(): void;
  getToBeDeletedInsts(): Set<ObjInst>;
  getDeletedInstsWithDanglingRefs(): Set<ObjInst>;
  getPathToChild(inst: ObjInst): ChangeNode[] | undefined;
  getAnyPathToChild(inst: ObjInst): ChangeNode[] | undefined;
  getRefsToInst(inst: ObjInst, all?: boolean): ObjInst[];
  getChangesSoFar(): ModelChange[];
  withRecording(f: () => void): RecordedChanges;
  withRecording<E>(f: () => Result<void, E>): Result<RecordedChanges, E>;
  dispose(): void;
  setExtraListener(newListener: (change: ModelChange) => void): void;
  isRecording: boolean;
}

/**
 * A convenience class that records changes to an `ObjInst` during
 * the execution of a function.  It is helpful for collecting
 * changes made to the instance tree by an opaque function.
 */
export class ChangeRecorder implements IChangeRecorder {
  private changes: ModelChange[] = [];
  private listener: (change: ModelChange) => void | undefined;
  private tracker: Tracker<ObjInst>;
  private _isRecording = false;

  constructor({
    site,
    isExternalRef,
    visitNodeListener,
  }: {
    site: Site;
    isExternalRef?: (obj: ObjInst) => boolean;
    visitNodeListener?: (inst: ObjInst) => void;
  }) {
    this.tracker = observeModel(site, {
      listener: (change) => {
        this.onChange(change);
        this.listener && this.listener(change);
      },
      isExternalRef,
      visitNodeListener,
    });
  }

  prune() {
    this.tracker.prune();
  }

  getToBeDeletedInsts() {
    return this.tracker.getToBeDeletedInsts();
  }

  getDeletedInstsWithDanglingRefs() {
    return this.tracker.getDeletedInstsWithDanglingRefs();
  }

  getPathToChild(inst: ObjInst) {
    return this.tracker.getPathToChild(inst);
  }

  getAnyPathToChild(inst: ObjInst) {
    return this.tracker.getAnyPathToChild(inst);
  }

  // If `all` is set, also includes WeakRefs
  getRefsToInst(inst: ObjInst, all = true) {
    return this.tracker.getRefsToInst(inst, all);
  }

  // Get model changes since we started recording, so we can patch before
  // commiting to resolve model issues
  getChangesSoFar() {
    return [...this.changes];
  }

  // Returns the changes array instance, do not mutate it!
  getChangesSoFarImmutable() {
    return this.changes as readonly ModelChange[];
  }

  private startRecording() {
    this.changes = [];
  }

  private endRecording(): RecordedChanges {
    const deletedInsts = this.getToBeDeletedInsts();
    return {
      changes: this.changes,
      newInsts: Array.from(this.tracker.getNewInsts().keys()).filter(
        (inst) => !deletedInsts.has(inst),
      ),
      removedInsts: Array.from(deletedInsts.keys()),
    };
  }

  withRecording(f: () => void): RecordedChanges;
  withRecording<E>(f: () => Result<void, E>): Result<RecordedChanges, E>;
  withRecording<E>(
    f: () => void | Result<void, E>,
  ): RecordedChanges | Result<RecordedChanges, E> {
    this._isRecording = true;
    const onError = () => {
      // If an error happens, undo the model changes to avoid invalid states.
      undoChanges(this.endRecording().changes);
      this.prune();
    };
    try {
      this.startRecording();
      const maybeResult = f();
      const succeeded = () => {
        const res = this.endRecording();
        this.prune();
        return res;
      };
      if (maybeResult instanceof Ok || maybeResult instanceof Err) {
        if (maybeResult.isErr()) {
          const error = maybeResult.error;
          onError();
          return err(error);
        } else {
          try {
            // succeeded() (which does prune()) may itself fail
            return ok(succeeded());
          } catch (err2) {
            onError();
            return err(err2);
          }
        }
      } else {
        return succeeded();
      }
    } catch (e) {
      onError();
      throw e;
    } finally {
      this._isRecording = false;
    }
  }

  get isRecording() {
    return this._isRecording;
  }

  dispose() {
    this.tracker.dispose();
  }

  setExtraListener(newListener: (change: ModelChange) => void) {
    this.listener = newListener;
  }

  private onChange(change: ModelChange) {
    if (dbg.captureStacksInChangeRecorder) {
      hackyCast(change).stack = new Error().stack;
    }
    this.changes.push(change);
  }
}

export class FakeChangeRecorder implements IChangeRecorder {
  prune() {}
  getToBeDeletedInsts() {
    return new Set<ObjInst>();
  }
  getDeletedInstsWithDanglingRefs() {
    return new Set<ObjInst>();
  }
  getPathToChild(_inst: ObjInst) {
    return undefined;
  }
  getAnyPathToChild(_inst: ObjInst) {
    return undefined;
  }
  getRefsToInst(_inst: ObjInst, _all = true) {
    return [];
  }
  getChangesSoFar() {
    return [] as ModelChange[];
  }
  withRecording(f: () => void): RecordedChanges;
  withRecording<E>(f: () => Result<void, E>): Result<RecordedChanges, E>;
  withRecording<E>(
    f: () => void | Result<void, E>,
  ): RecordedChanges | Result<RecordedChanges, E> {
    const maybeResult = f();
    if (maybeResult instanceof Ok || maybeResult instanceof Err) {
      if (maybeResult.isErr()) {
        return err(maybeResult.error);
      } else {
        return ok(emptyRecordedChanges());
      }
    } else {
      return emptyRecordedChanges();
    }
  }
  dispose() {}
  setExtraListener(_newListener: (change: ModelChange) => void) {}
  get isRecording() {
    return false;
  }
}

export function filterPersistentChanges(allChanges: ModelChange[]) {
  return allChanges.filter((change) => {
    if (!change.path) {
      return true;
    }
    for (const part of change.path) {
      const field = instUtil
        .allInstFields(part.inst)
        .find((f) => f.name === part.field);
      if (field?.annotations.includes("Transient")) {
        return false;
      }
    }
    return true;
  });
}
