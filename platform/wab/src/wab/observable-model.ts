import { meta } from "@/wab/classes-metas";
import { Dictionary, memoize, once } from "lodash";
import type { IObservableArray, Lambda } from "mobx";
import type { Atom, IDerivation, IObjectDidChange } from "mobx/dist/internal";
import defaultReact from "react";
import { failable, IFailable } from "ts-failable";
import {
  ArenaFrame,
  Component,
  ImageAsset,
  isKnownSite,
  ObjInst,
  RuleSet,
  Site,
  StyleToken,
  Variant,
  VariantedValue,
} from "./classes";
import {
  assert,
  ensure,
  ensureArray,
  hackyCast,
  isLiteralObject,
  isPrimitive,
  switchType,
  withoutNils,
  xSetDefault,
} from "./common";
import { hasTokenRefs, tryParseAllTokenRefs } from "./commons/StyleToken";
import { allComponentVariants } from "./components";
import { dbg } from "./dbg";
import { hasAssetRefs, tryParseImageAssetRef } from "./image-assets";
import {
  Class,
  Field,
  isStrongRefField,
  isWeakRefField,
} from "./model/model-meta";
import {
  componentToAllVariants,
  siteToAllGlobalVariants,
  siteToAllImageAssetsDict,
  siteToAllTokensDict,
} from "./shared/cached-selectors";
import { InstUtil, instUtil } from "./shared/core/InstUtil";
import mobx from "./shared/import-mobx";
import { mutateGlobalObservable } from "./shared/mobx-util";
import { allGlobalVariants, allImageAssets, allStyleTokens } from "./sites";
import { undoChanges } from "./undo-util";

export interface ChangeNode {
  readonly inst: ObjInst;
  readonly field: string;
}

interface BaseChange {}

/**
 * Change representing a List or Set field value having
 * items added or removed.
 */
interface ArraySpliceChange<T = any> extends BaseChange {
  type: "array-splice";
  object: T[];
  index: number;
  added: T[];
  removed: T[];
}

export const mkArrayBeforeSplice = <T = any>(
  curValue: Array<T>,
  change: ArraySpliceChange<T>
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
interface ObjAddChange<T = any> extends BaseChange {
  type: "obj-add";
  object: any;
  key: string | number | symbol;
  newValue: T;
}

/**
 * Change representing a Map field value having an existing
 * entry changed.
 */
interface ObjUpdateChange<T = any> extends BaseChange {
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
interface ObjDeleteChange<T = any> extends BaseChange {
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

type AnyChange =
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

type VisitFlags = {
  incrementalObserve?: boolean;
};

type ObservableState = {
  dispose: Lambda;
  prune: Lambda;
  getToBeDeletedInsts: () => Set<ObjInst>;
  getDeletedInstsWithDanglingRefs: () => Set<ObjInst>;
  getPathToChild: (node: ObjInst) => ChangeNode[] | undefined;
  getAnyPathToChild: (node: ObjInst) => ChangeNode[] | undefined;
  getRefsToInst: (node: ObjInst, all: boolean) => ObjInst[];
  getNewInsts: () => Set<ObjInst>;
  observeInstField: (node: ObjInst, field: Field) => void;
};

/**
 * Starts observing changes to the argument `inst`.  Specifically,
 *
 * * `inst`, its properties, and all other `ObjInsts` referenced by it
 *   will become mobx-observable.
 * * All updates to `inst`, its properties, and its dependencies will be
 *   recorded and passed to the `opts.listener`.
 *
 * Basically, we track changes to the whole tree of model objects
 * rooted at `inst`.  To handle circular dependencies and multiple paths to the
 * same node, we must use @WeakRef annotations in the model; in that case, the
 * `opts.listener` may be called multiple times for the same change,
 * once from each referencing node's perspective.  If you would rather
 * avoid this, you can break certain dependencies by passing in
 * `opts.excludeFields`.
 *
 * @param rootInst the `ObjInst` to track
 * @param opts.rt the `BaseRuntime` used to create `inst` and other models
 * @param opts.listener a listener that is called whenever a change
 *   is detected.  The listener may be invoked multiple times for the same
 *   change; that's because there may be different objects in the tree
 *   that reference the changed object, so they each see a change.
 * @param opts.excludeFields exclude Fields that you do not want to track
 *   changes for.
 * @param opts.skipInitialObserveFields skip Fields that you will manually observe later.
 *
 *
 * @returns a disposal function that, when called, will unsubscribe to
 * all changes to mobx observables.  `inst` will remain mobx-observable
 * however, not a plain `ObjInst`; we've simply unsubscribed to changes.
 */
export function observeModel(
  rootInst: ObjInst,
  opts: {
    instUtil: InstUtil;
    listener: ModelChangeListener;
    instDisposeListener?: (v: ObjInst) => void;
    excludeFields?: Field[];
    skipInitialObserveFields?: Field[];
    excludeClasses?: Class[];
    visitNodeListener?: (inst: ObjInst) => void;
    isExternalRef?: (obj: ObjInst) => boolean;
    React?: typeof defaultReact;
    localObject?: typeof Object;
    quiet?: boolean;
    incremental?: boolean;
  }
): ObservableState {
  const {
    instUtil: _instUtil,
    listener,
    instDisposeListener,
    visitNodeListener,
  } = opts;
  const React = opts.React || defaultReact;
  const localObject = opts.localObject || Object;
  const excludeFields = new Set(opts.excludeFields || []);
  const start = new Date().getTime();

  // We keep track of the instances that we've seen, and how to dispose of
  // the instance when it's completely detached from the tree.
  const instStates = new Map<ObjInst, InstState>();

  // We also map child ObjInst to parent ObjInst and the set of field names
  // of that parent ObjInst that references the child.  This is how we
  // can figure out whether an ObjInst has been completely detached
  // from the tree -- when there are no more parents referencing it.
  // It's also how we can reconstruct the path to the child when we fire
  // changes.
  // We support several parents even though the model is a tree, because
  // we accept the model becoming temporarily invalid while making changes
  // (but we don't compute the path to a changed node if it there are no paths
  // or multiple paths to it at moment the change happened).
  // This is to avoid imposing restrictions on the order that changes might
  // happen. The changes are only considered done when .prune() is called,
  // which is when we assert that the model remains a tree. For example, it
  // allows us to do the following if we want to move an instance from parent
  // `A` to parent `B`:
  // studioCtx.change(() => {
  //  B.field = A.field;
  //  A.field = null;
  // });
  // The above would fail if we didn't support multiple parents because, after
  // the first assignment, the field would have two parents.
  const instParents = new Map<ObjInst, Map<ObjInst, Map<string, number>>>();

  // Same as instParents, but for WeakRef fields; it's only used to
  // assert invariants
  const inst2Weakrefs = new Map<ObjInst, Map<ObjInst, Map<string, number>>>();

  // Returns true if there's only one parent referencing the node through one
  // single field.
  const hasOneParent = (inst: ObjInst) => {
    const parents = instParents.get(inst);
    return (
      parents?.size === 1 &&
      [...parents.values()][0].size === 1 &&
      [...[...parents.values()][0].values()][0] === 1
    );
  };

  const mobxHack = hackyMobxUtils();

  // Returns true if there should be no strong references to a given instance.
  // This is the case for the root and for most external references.
  const shouldNotHaveParents = (inst: ObjInst) => {
    if (inst === rootInst) {
      // The root has no parents
      return true;
    }
    if (opts.isExternalRef && opts.isExternalRef(inst)) {
      // External references shouldn't have strong references pointing to it.
      return true;
    }
    if (opts.incremental && !mobxHack.isObservable(inst)) {
      return true;
    }
    return false;
  };

  // Returns false or a string explaining why the instance is in invalid state
  const isInInvalidState = (inst: ObjInst): (() => string) | false => {
    const getRefs = (
      parents: Map<ObjInst, Map<ObjInst, Map<string, number>>>
    ) => {
      return [
        ...ensure(
          parents.get(inst),
          "Couldn't find parent for inst " + inst.uid
        ).entries(),
      ]
        .map(([p, fields]) =>
          [...fields.keys()].map(
            (f) => `${_instUtil.getInstClassName(p)}[${p.uid}].${f}`
          )
        )
        .join(", ");
    };
    if (opts.incremental && !mobxHack.isObservable(inst)) {
      return false;
    }

    if (shouldNotHaveParents(inst)) {
      // The only assertion for nodes that shouldn't have strong parents is
      // that it's not referenced by any strong reference.
      if (instParents.has(inst)) {
        return () =>
          `Instance ${inst.uid} (${_instUtil.getInstClassName(
            inst
          )}) has unexpected parent refs:\n` + getRefs(instParents);
      } else {
        return false;
      }
    }
    if (!instParents.has(inst) && inst2Weakrefs.has(inst)) {
      // Inst is invalid because became unreachable but still has WeakRefs
      return () =>
        `Unreachable instance ${inst.uid} (${_instUtil.getInstClassName(
          inst
        )}) has unexpected refs:\n` + getRefs(inst2Weakrefs);
    }
    if (instParents.has(inst) && !hasOneParent(inst)) {
      // Invalid because it has more than one parent
      return () =>
        `Instance ${inst.uid} (${_instUtil.getInstClassName(
          inst
        )}) has more than one parent:\n` + getRefs(instParents);
    }
    return false;
  };

  // Insts that became unreachable at some point
  const possiblyUnreachableInsts = new Map<ObjInst, Lambda>();

  // Instances that we started observing
  const possiblyNewlyAddedInsts = new Set<ObjInst>();

  // Insts that got into an invalid state at some point
  const instsToCheck = new Set<ObjInst>();
  let isPruning = false;

  // We check that disposed instances are not referenced by weak refs,
  // but we should also check if it doesn't happen when instrumenting the tree
  // for the first time.
  let firstRun = true;
  // So, when first instrumenting, we keep track of all weakly referenced insts
  const weaklyReferencedNodes = new Set<ObjInst>();

  const getClassFields = memoize((clazz: Class) => {
    return _instUtil.meta
      .allFields(clazz)
      .filter((field) => !excludeFields.has(field));
  });

  const makeDecoratorObj = memoize((clazz: Class) => {
    const allFields = getClassFields(clazz);
    return localObject.assign(
      new localObject(),
      Object.fromEntries(
        allFields.map((f) => [f.name, mobx.observable])
        // eslint-disable-next-line @typescript-eslint/ban-types
      ) as Object
    );
  });

  /**
   * Attach observers to `inst` and its field values.
   *
   * Returns disposal function, or `undefined` if the `path` contains
   * a cycle.
   */
  const observeInst = (
    inst: ObjInst,
    flags: VisitFlags
  ): Lambda | undefined => {
    if (instStates.has(inst)) {
      // We've seen this `inst` before...  So exit early
      return makeDisposeInst(inst);
    }

    // We've never seen this `inst` before, so initialize `InstState`.
    // We keep track of the disposal functions used to observe this inst
    if (!flags.incrementalObserve) {
      possiblyNewlyAddedInsts.add(inst);
    }
    const fieldValueDisposes = new Map<string, Lambda>(); // tracks updates to field values

    const state: InstState = {
      inst,
      instDispose: undefined,
      fieldValueDisposes,
    };
    instStates.set(inst, state);

    const instClass = _instUtil.getInstClass(inst);
    const allFields = getClassFields(instClass);

    if (!mobxHack.isObservable(inst)) {
      mobxHack.makeInstObservable(inst, instClass, allFields);
    }

    state.instDispose = mobx.observe(inst, (event) => {
      // We observe changes when setting an inst field, like `inst[field.name] = ...`
      assert(event.type === "update", `ObjInst only fires update events`);
      const fieldName = event.name as string;
      const field = allFields.find((f) => f.name === fieldName);

      // Field may be undefined, if we're setting some untracked field.
      if (field) {
        // We should first fire the field change so the change is recorded
        // and can be reverted if any assertion fails
        fireFieldChange(inst, fieldName, {
          type: "update",
          oldValue: event.oldValue,
          newValue: event.newValue,
        });

        // Whenever the field value changes, we dispose the old one and
        // observe the new one, and notify the listener.
        disposeInstChild(fieldValueDisposes, fieldName);
        addInstChildDispose(
          fieldValueDisposes,
          fieldName,
          visitFieldValue(inst, field, event.newValue, {
            ...flags,
            incrementalObserve: false,
          })
        );
      }
    });

    for (const field of allFields.filter(
      (f) => !opts.skipInitialObserveFields?.includes(f)
    )) {
      // Furthermore, we also want to observe the current field value itself
      // -- the field value may be another `ObjInst` to be tracked, or an array
      // of them, etc.
      addInstChildDispose(
        fieldValueDisposes,
        field.name,
        visitFieldValue(inst, field, inst[field.name], flags)
      );
    }

    return makeDisposeInst(inst);
  };

  /**
   * Attach observers for the argument field value.  `value` is the value
   * of `inst[field]`;
   */
  const visitFieldValue = (
    inst: ObjInst,
    field: Field,
    value: any,
    flags: VisitFlags
  ): Lambda | undefined => {
    if (value == null) {
      return undefined;
    }

    if (_instUtil.isObjInst(value)) {
      return observeInstFieldValue(inst, field, value, flags);
    } else if (Array.isArray(value)) {
      return observeArrayFieldValue(inst, field, value, flags);
    } else if (React.isValidElement(value)) {
      return undefined;
    } else if (isLiteralObject(value, opts.localObject)) {
      return observePlainObjFieldValue(inst, field, value, flags);
    } else if (isPrimitive(value) || typeof value === "function") {
      // Primitive values don't need subscription. However, they might weakly
      // reference another instance (e.g., by its uuid), so we should also
      // keep track of such references.
      if (typeof value === "string") {
        return maybeObserveImplicitWeakRefField(inst, field.name, value);
      }
      return undefined;
    } else {
      // Just to be safe...
      throw new Error(`Unknown fieldVal ${value}`);
    }
  };

  /**
   * Attaches observers to the argument field value, that happens to be
   * an ObjInst.
   */
  const observeInstFieldValue = (
    inst: ObjInst,
    field: Field,
    value: ObjInst,
    flags: VisitFlags
  ): Lambda | undefined => {
    visitNodeListener?.(inst);

    if (
      opts.excludeClasses &&
      opts.excludeClasses.includes(_instUtil.getInstClass(value))
    ) {
      // We don't want to track this class, so skip
      return undefined;
    }

    if (isStrongRefField(field)) {
      const instDispose = observeInst(value, flags);
      if (instDispose) {
        // Add this value as a child of the owning inst
        updateInstParent(inst, field.name, value, true);
        return namedDispose(makeInstFieldKey(inst, field.name), () => {
          // On dispose, remove this value as a child of the owning inst
          updateInstParent(inst, field.name, value, false);
          instDispose();
        });
      } else {
        return undefined;
      }
    } else {
      // Each inst should be referenced either by a StrongRef or a WeakRef!
      assert(
        isWeakRefField(field),
        `Expected WeakRef field ${field.name} to be WeakRef`
      );

      if (firstRun) {
        weaklyReferencedNodes.add(value);
      }

      // This field is referenced by a WeakRef, so we should return
      // without observing to avoid cycles. It must be reachable through
      // a path that only includes StrongRefs.
      // We should just update the weak references.
      updateInstParent(inst, field.name, value, true, true);
      return namedDispose(makeInstFieldKey(inst, field.name), () => {
        updateInstParent(inst, field.name, value, false, true);
      });
    }
  };

  /**
   * Attach observers to the argument field value, that happens to be
   * an array.
   */
  const observeArrayFieldValue = (
    inst: ObjInst,
    field: Field,
    array: any[],

    flags: VisitFlags
  ): Lambda => {
    const childDisposes = new Map<any, Lambda[]>();
    // Support repeated children in the array
    const childCount = new Map<any, number>();

    const handleNewChild = (child: any, onUpdate: boolean) => {
      if (!childCount.has(child)) {
        const newFlags = { ...flags };
        if (onUpdate) {
          newFlags.incrementalObserve = false;
        }
        addCollectionChildDispose(
          childDisposes,
          child,
          visitFieldValue(inst, field, child, newFlags)
        );
      }
      childCount.set(child, (childCount.get(child) ?? 0) + 1);
    };

    const handleDeleteChild = (child: any) => {
      const count = childCount.get(child);
      if (!count || count === 1) {
        disposeCollectionChild(childDisposes, child);
        childCount.delete(child);
      } else {
        childCount.set(child, count - 1);
      }
    };

    // First, we observe all current values in the array; we want to
    // know if any of them has changed.  Note that we're not tracking
    // things array index location.
    array.forEach((childVal) => {
      handleNewChild(childVal, false);
    });

    // Now, we want to observe the array itself, to monitor when new
    // items are added, removed, or set at an index.
    const arrayDispose = mobx.observe(array as IObservableArray, (event) => {
      if (event.type === "splice") {
        fireFieldChange(inst, field.name, {
          type: "array-splice",
          object: event.object,
          index: event.index,
          added: event.added,
          removed: event.removed,
        });
        // new nodes have been added / removed!  Start observing all
        // the new ones, and dispose of the removed ones.
        for (const child of event.removed) {
          handleDeleteChild(child);
        }
        for (const child of event.added) {
          handleNewChild(child, true);
        }
      } else if (event.type === "update") {
        fireFieldChange(inst, field.name, {
          type: "array-update",
          object: event.object,
          index: event.index,
          oldValue: event.oldValue,
          newValue: event.newValue,
        });
        // An index location has been set to a new value!  Dispose the
        // old value, and observe the new value.
        handleDeleteChild(event.oldValue);
        handleNewChild(event.newValue, true);
      } else {
        throw new Error(`Unknown event of type ${(event as any).type}`);
      }
    });

    return namedDispose(makeInstFieldKey(inst, field.name), () => {
      // On dispose, we inform all children that the parent inst is
      // no longer referencing them via this field
      childDisposes.forEach((disposes) =>
        disposes.forEach((dispose) => dispose())
      );
      arrayDispose();
    });
  };

  /**
   * Attach observers to the argument field value, that happens to be
   * a plain object (the Map field type).
   */
  const observePlainObjFieldValue = (
    inst: ObjInst,
    field: Field,
    obj: Record<string, any>,
    flags: VisitFlags
  ): Lambda => {
    // Disposes for children value stores mapping from child value to
    // a list of dispose functions.  It's a list because the same
    // child value may be referenced multiple times from an object;
    // for an example, an array that references the same State twice,
    // or a RuleSet.values object that references the same color token
    // from different rules
    const childDisposes = new Map<any, Lambda[]>();

    // First, we observe all current values in the object.  Note that
    // all entries are at the same `path`; the key
    // in this object is not part of the path.
    for (const val of Object.values(obj)) {
      addCollectionChildDispose(
        childDisposes,
        val,
        visitFieldValue(inst, field, val, flags)
      );
    }

    // We also track the object keys, because they might include UUID refs
    for (const val of Object.keys(obj)) {
      addCollectionChildDispose(
        childDisposes,
        val,
        visitFieldValue(inst, field, val, flags)
      );
    }

    assert(
      localObject.getPrototypeOf(obj) === localObject.prototype,
      "local object prototype didn't match"
    );

    // Now, observe the object itself, so we get notified when new entries
    // are added, removed, or changed.
    // eslint-disable-next-line @typescript-eslint/ban-types
    const objDispose = mobx.observe(obj as Object, (event) => {
      const newFlags: VisitFlags = { ...flags, incrementalObserve: false };
      if (event.type === "add") {
        fireFieldChange(inst, field.name, {
          type: "obj-add",
          key: event.name,
          object: event.object,
          newValue: event.newValue,
        });
        addCollectionChildDispose(
          childDisposes,
          event.newValue,
          visitFieldValue(inst, field, event.newValue, newFlags)
        );
        addCollectionChildDispose(
          childDisposes,
          event.name,
          visitFieldValue(inst, field, event.name, newFlags)
        );
      } else if (event.type === "update") {
        fireFieldChange(inst, field.name, {
          type: "obj-update",
          key: event.name,
          object: event.object,
          newValue: event.newValue,
          oldValue: event.oldValue,
        });
        disposeCollectionChild(childDisposes, event.oldValue);
        addCollectionChildDispose(
          childDisposes,
          event.newValue,
          visitFieldValue(inst, field, event.newValue, newFlags)
        );
      } else if (event.type === "remove") {
        fireFieldChange(inst, field.name, {
          type: "obj-delete",
          key: event.name,
          object: event.object,
          oldValue: event.oldValue,
        });
        disposeCollectionChild(childDisposes, event.oldValue);
        disposeCollectionChild(childDisposes, event.name);
      } else {
        throw new Error(`Unknown event of type ${(event as any).type}`);
      }
    });

    return namedDispose(makeInstFieldKey(inst, field.name), () => {
      // On dispose, we tell each child that parent inst is no
      // longer referencing them via this field
      childDisposes.forEach((disposes) =>
        disposes.forEach((dispose) => dispose())
      );
      objDispose();
    });
  };

  /**
   * Creates a DisposeFunc for the argument `inst`
   */
  const makeDisposeInst = (inst: ObjInst) => {
    return namedDispose(makeInstKey(inst), () => {
      if (inst === rootInst && !instStates.has(inst)) {
        // The model supports the root dispose being called multiple times.
        // in that case, calling dispose more is no-op.
        return;
      }
      // Internal insts however should be disposed only once
      assert(
        instStates.has(inst),
        `Tried to dispose inst ${inst.uid} without instState`
      );

      if (!instParents.get(inst)) {
        const doDispose = () => {
          const state = ensure(
            instStates.get(inst),
            `Expected inst ${inst.uid} to have instState`
          );
          // Inform each child that this inst is being disposed
          state.fieldValueDisposes.forEach((dispose) => dispose());

          // Clean up
          state.instDispose?.();
          state.instDispose = undefined;
          state.fieldValueDisposes.clear();
          instStates.delete(inst);
          instDisposeListener && instDisposeListener(inst);
        };
        if (isPruning) {
          doDispose();
        } else {
          possiblyUnreachableInsts.set(inst, doDispose);
        }
      }
    });
  };

  /**
   * Informs the listener of the argument change for the path to
   * `state.inst`.
   */
  const fireFieldChange = (inst: ObjInst, field: string, change: AnyChange) => {
    const fieldNode = { inst, field };
    const path = getPathToChild(inst, rootInst, instParents);
    listener({
      ...change,
      path: path && [...path, fieldNode],
      changeNode: fieldNode,
    });
  };

  const updateInstParent = (
    parent: ObjInst,
    field: string,
    child: ObjInst,
    add: boolean,
    weakRef = false
  ) => {
    const mapOfParents = weakRef ? inst2Weakrefs : instParents;
    let parent2Fields = mapOfParents.get(child);
    if (!parent2Fields) {
      parent2Fields = new Map();
      mapOfParents.set(child, parent2Fields);
    }
    let fields = parent2Fields.get(parent);
    if (!fields) {
      fields = new Map();
      parent2Fields.set(parent, fields);
    }

    if (add) {
      const count = (fields.get(field) ?? 0) + 1;
      fields.set(field, count);
    } else {
      assert(
        fields.has(field),
        () =>
          `updateInstParent tried to delete non-existing child ${child.uid} of parent ${parent.uid} via field ${field}`
      );
      const count =
        ensure(fields.get(field), "Expected at least one field") - 1;
      if (count === 0) {
        fields.delete(field);
        if (fields.size === 0) {
          parent2Fields.delete(parent);
          if (parent2Fields.size === 0) {
            mapOfParents.delete(child);
          }
        }
      } else {
        fields.set(field, count);
      }
    }
    if (isInInvalidState(child) !== false) {
      instsToCheck.add(child);
    }
  };

  // When we run for the first time, we can't use computed functions because
  // some instances might not be observables yet (so we wouldn't recompute them
  // after they change), so we're storing some values here to avoid recomputing.
  // (The values are never updated and get cleared after observing the model
  // for the first time).
  const firstRunData = {
    allStyleTokens: undefined as StyleToken[] | undefined,
    allImageAssets: undefined as ImageAsset[] | undefined,
    allGlobalVariants: undefined as Variant[] | undefined,
    allComponentVariants: undefined as Map<Component, Variant[]> | undefined,
  };

  const tokensCache = new Map<string, StyleToken>();
  const imageAssetsCache = new Map<string, ImageAsset>();
  const globalVariantsCache = new Map<string, Variant>();
  const componentVariantsCache = new Map<Component, Map<string, Variant>>();

  const updateAndGetAllCachedInsts = <T extends ObjInst & { uuid: string }>(
    insts: T[] | Dictionary<T>,
    instCache: Map<string, T>
  ): T[] => {
    (Array.isArray(insts) ? insts : Object.values(insts)).forEach((inst) =>
      instCache.set(inst.uuid, inst)
    );
    return [...instCache.values()];
  };

  const instCacheGetters = (site: Site) => {
    const getAllStyleTokens = () => {
      if (firstRun) {
        if (!firstRunData.allStyleTokens) {
          firstRunData.allStyleTokens = allStyleTokens(site, {
            includeDeps: "all",
          });
        }
        return updateAndGetAllCachedInsts(
          firstRunData.allStyleTokens,
          tokensCache
        );
      } else {
        return updateAndGetAllCachedInsts(
          siteToAllTokensDict(site),
          tokensCache
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
          imageAssetsCache
        );
      } else {
        return updateAndGetAllCachedInsts(
          siteToAllImageAssetsDict(site),
          imageAssetsCache
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
          globalVariantsCache
        );
      } else {
        return updateAndGetAllCachedInsts(
          siteToAllGlobalVariants(site),
          globalVariantsCache
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
            })
          ),
          xSetDefault(componentVariantsCache, component, () => new Map())
        );
      } else {
        return updateAndGetAllCachedInsts(
          componentToAllVariants(component),
          xSetDefault(componentVariantsCache, component, () => new Map())
        );
      }
    };

    return {
      getAllStyleTokens,
      getAllImageAssets,
      getAllGlobalVariants,
      getAllComponentVariants,
    };
  };

  if (isKnownSite(rootInst)) {
    const {
      getAllStyleTokens,
      getAllImageAssets,
      getAllGlobalVariants,
      getAllComponentVariants,
    } = instCacheGetters(rootInst);

    // Make sure to fill the cache in the first run
    getAllStyleTokens();
    getAllImageAssets();
    getAllGlobalVariants();
    rootInst.components.forEach((c) => getAllComponentVariants(c));
  }

  // Some string fields might refer to another instance (e.g., style token CSS
  // var ref). We should track those references as weak references.
  const maybeObserveImplicitWeakRefField = (
    inst: ObjInst,
    fieldName: string,
    value: string
  ) => {
    // Unfortunately we need to handle those case-by-case :/
    const classesToTest = [ArenaFrame, StyleToken, RuleSet, VariantedValue];
    if (
      !isKnownSite(rootInst) ||
      !classesToTest.some((cls) => inst instanceof cls)
    ) {
      return undefined;
    }

    const {
      getAllStyleTokens,
      getAllImageAssets,
      getAllGlobalVariants,
      getAllComponentVariants,
    } = instCacheGetters(rootInst);

    const child: ObjInst | ObjInst[] | undefined = switchType(inst)
      .when(ArenaFrame, (frame) => {
        if (fieldName === "pinnedVariants") {
          return getAllComponentVariants(frame.container.component).find(
            (v) => v.uuid === value
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

    if (!child || (Array.isArray(child) && child.length === 0)) {
      return undefined;
    }

    // The same rule value string can reference several tokens
    const childArray = ensureArray(child);
    childArray.forEach((c) => updateInstParent(inst, fieldName, c, true, true));
    return namedDispose(makeInstFieldKey(inst, fieldName), () => {
      childArray.forEach((c) =>
        updateInstParent(inst, fieldName, c, false, true)
      );
    });
  };

  // Finally, we begin by observing the root instance!
  const rootDispose = ensure(
    observeInst(rootInst, {}),
    "Expected root dispose"
  );

  firstRun = false;
  firstRunData.allGlobalVariants =
    firstRunData.allImageAssets =
    firstRunData.allStyleTokens =
    firstRunData.allComponentVariants =
      undefined;
  [...weaklyReferencedNodes.keys()].forEach((inst) => {
    // Assert that every referenced node has a parent
    assert(
      instParents.has(inst) || shouldNotHaveParents(inst),
      `Child ${inst.uid} (${_instUtil.getInstClassName(
        inst
      )}) has no parent node`
    );
  });

  if (!opts.quiet) {
    console.log(
      `Finished instrumenting model in ${new Date().getTime() - start}ms; saw ${
        instStates.size
      } instances`
    );
  }

  const prune = () => {
    isPruning = true;
    [...possiblyUnreachableInsts.entries()]
      .filter(([inst]) => !instParents.get(inst))
      .forEach(([_inst, dispose]) => dispose());
    possiblyUnreachableInsts.clear();
    possiblyNewlyAddedInsts.clear();
    const modelErrors: string[] = withoutNils(
      [...instsToCheck].map((inst) => {
        const valid = isInInvalidState(inst);
        if (valid) {
          return valid();
        }
        return null;
      })
    );
    if (modelErrors.length > 0) {
      console.log(modelErrors.join("\n"));
    }
    assert(modelErrors.length === 0, "Invariant failed");

    instsToCheck.clear();
    isPruning = false;
  };

  // Prune the first time to iterate over `instsToCheck`
  prune();

  return {
    dispose: () => {
      // We forcibly dispose of everything, instead of going through
      // disposeInst().
      rootDispose();
      prune();
      assert(instStates.size === 0, "Expected to clear instStates");
      assert(instParents.size === 0, "Expected to clear instParents");
      assert(inst2Weakrefs.size === 0, "Expected to clear inst2WeakRefs");
    },
    getPathToChild: (child: ObjInst) =>
      getPathToChild(child, rootInst, instParents),
    getAnyPathToChild: (child: ObjInst) =>
      getPathToChild(child, rootInst, instParents, {
        allowMultiplePaths: true,
      }),
    prune,
    getDeletedInstsWithDanglingRefs: () => {
      const deletedInsts = new Set<ObjInst>();
      [...instsToCheck.keys()].forEach((inst) => {
        if (!shouldNotHaveParents(inst)) {
          const state = instStates.get(inst);
          const parents = instParents.get(inst);
          const weakParents = inst2Weakrefs.get(inst);
          if (!state && !parents?.size && !!weakParents?.size) {
            deletedInsts.add(inst);
          }
        }
      });
      return deletedInsts;
    },
    getToBeDeletedInsts: () => {
      const toBeDeleted = new Set<ObjInst>();

      const visit = (val: any) => {
        if (_instUtil.isObjInst(val)) {
          const parents = instParents.get(val);
          const state = instStates.get(val);
          if (
            toBeDeleted.has(val) ||
            !state ||
            (parents && ![...parents.keys()].every((p) => toBeDeleted.has(p)))
          ) {
            return;
          }
          toBeDeleted.add(val);
          [...state.fieldValueDisposes.keys()].forEach((field) =>
            visit(val[field])
          );
        } else if (Array.isArray(val)) {
          val.forEach((v) => visit(v));
        } else if (val && isLiteralObject(val, opts.localObject)) {
          Object.values(val).forEach((v) => visit(v));
        }
      };

      [...possiblyUnreachableInsts.keys()].forEach((inst) => visit(inst));
      return toBeDeleted;
    },
    getNewInsts: () => {
      return possiblyNewlyAddedInsts;
    },
    getRefsToInst: (inst: ObjInst, all: boolean) => {
      return [
        ...(instParents.get(inst)?.keys() ?? []),
        ...(all ? inst2Weakrefs.get(inst)?.keys() ?? [] : []),
      ];
    },
    observeInstField: (inst: ObjInst, field: Field) => {
      const state = ensure(
        instStates.get(inst),
        "The parent instance should exist"
      );

      const instClass = _instUtil.getInstClass(inst);
      const allFields = getClassFields(instClass);

      const fieldToUpdate = ensure(
        allFields.find((f) => f === field),
        "Should observe an existing field"
      );

      addInstChildDispose(
        state.fieldValueDisposes,
        fieldToUpdate.name,
        visitFieldValue(inst, fieldToUpdate, inst[fieldToUpdate.name], {
          incrementalObserve: true,
        })
      );
    },
  };
}

function addCollectionChildDispose<T>(
  childDisposes: Map<T, Lambda[]>,
  child: T,
  dispose: Lambda | undefined
) {
  if (dispose) {
    if (childDisposes.has(child)) {
      childDisposes.get(child)!.push(dispose);
    } else {
      childDisposes.set(child, [dispose]);
    }
  }
}

function disposeCollectionChild(childDisposes: Map<any, Lambda[]>, child: any) {
  const disposes = childDisposes.get(child);
  if (disposes) {
    disposes[0]?.();
    disposes.splice(0, 1);
    if (disposes.length === 0) {
      childDisposes.delete(child);
    }
  }
}

function addInstChildDispose(
  childDisposes: Map<string, Lambda>,
  field: string,
  dispose: Lambda | undefined
) {
  if (dispose) {
    assert(!childDisposes.has(field), `Field already has dispose function`);
    childDisposes.set(field, dispose);
  }
}

function disposeInstChild(childDisposes: Map<any, Lambda>, field: string) {
  const dispose = childDisposes.get(field);
  if (dispose) {
    dispose();
    childDisposes.delete(field);
  }
}

/**
 * Returns the path from the root to the child.
 * If there are multiple paths, a cycle or no paths (due to the model being
 * temporarily in an invalid state while making changes), it returns undefined.
 */
function getPathToChild(
  child: ObjInst,
  rootNode: ObjInst,
  instParents: Map<ObjInst, Map<ObjInst, Map<string, number>>>,
  opts?: { allowMultiplePaths?: boolean }
): ChangeNode[] | undefined {
  const seenNodes = new Set<ObjInst>();

  const gatherPath = (node: ObjInst): ChangeNode[] | undefined => {
    if (node === rootNode) {
      return [];
    }

    const parents = instParents.get(node);

    if (!parents) {
      // Unreachable!
      return undefined;
    }

    if (seenNodes.has(node)) {
      // Cycle!
      return undefined;
    }

    const [parent, fields] = [...parents.entries()][0];

    if (parents.size > 1 || fields.size > 1 || [...fields.values()][0] !== 1) {
      // Multiple paths!
      if (!opts?.allowMultiplePaths) {
        return undefined;
      }
    }

    seenNodes.add(node);

    if (opts?.allowMultiplePaths) {
      for (const [nextParent, nextFields] of [...parents.entries()]) {
        const path = gatherPath(nextParent);
        if (path) {
          return [
            ...path,
            { inst: nextParent, field: [...nextFields.keys()][0] },
          ];
        }
      }
      return undefined;
    } else {
      const path = gatherPath(parent);
      return path
        ? [...path, { inst: parent, field: [...fields.keys()][0] }]
        : undefined;
    }
  };

  return gatherPath(child);
}

interface InstState {
  inst: ObjInst;
  instDispose: Lambda | undefined;
  fieldValueDisposes: Map<string, Lambda>;
}

function makeInstKey(inst: ObjInst) {
  return `${inst.constructor.name}`;
}

function makeInstFieldKey(inst: ObjInst, field: string) {
  return `${makeInstKey(inst)}.${field}`;
}

function namedDispose(name: string, dispose: Lambda) {
  (dispose as any).disposeName = name;
  return dispose;
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
  newChanges: RecordedChanges
): RecordedChanges {
  const newlyAdded = new Set(newChanges.newInsts);
  const newlyRemoved = new Set(newChanges.removedInsts);
  return {
    changes: [...existingChanges.changes, ...newChanges.changes],
    newInsts: Array.from(
      new Set([
        ...existingChanges.newInsts.filter((inst) => !newlyRemoved.has(inst)),
        ...newChanges.newInsts,
      ]).keys()
    ),
    removedInsts: Array.from(
      new Set([
        ...existingChanges.removedInsts.filter((inst) => !newlyAdded.has(inst)),
        ...newChanges.removedInsts,
      ]).keys()
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
  withRecording<E>(f: () => IFailable<void, E>): IFailable<RecordedChanges, E>;
  dispose(): void;
  setExtraListener(newListener: (change: ModelChange) => void): void;
  maybeObserveComponentTrees(components: Component[]): boolean;
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
  private observableState: ObservableState;
  private _isRecording = false;

  constructor(
    inst: ObjInst,
    _instUtil: InstUtil,
    excludeFields?: Field[],
    excludeClasses?: Class[],
    isExternalRef?: (obj: ObjInst) => boolean,
    visitNodeListener?: (inst: ObjInst) => void,
    skipInitialObserveFields?: Field[],
    incremental?: boolean
  ) {
    this.observableState = observeModel(inst, {
      instUtil: _instUtil,
      listener: (change) => {
        this.onChange(change);
        this.listener && this.listener(change);
      },
      excludeFields,
      excludeClasses,
      isExternalRef,
      visitNodeListener,
      skipInitialObserveFields: skipInitialObserveFields,
      incremental,
    });
  }

  /**
   * This function will observe the tplTree of any component that is still not being observed.
   * @param components the list of components to try to observe the tplTree of.
   * @returns true if any of the components in the list started being observed now, false otherwise.
   */
  maybeObserveComponentTrees(components: Component[]) {
    const observedResult = components.reduce((observedNewComp, component) => {
      if (!mobx.isObservable(component.tplTree)) {
        this.observableState.observeInstField(
          component,
          meta.getFieldByName("Component", "tplTree")
        );
        return true;
      }
      return observedNewComp;
    }, false);
    console.log("Tried to observe", components, observedResult);
    if (observedResult) {
      mutateGlobalObservable();
      console.log("Mutated global state");
    }

    return observedResult;
  }

  prune() {
    this.observableState.prune();
  }

  getToBeDeletedInsts() {
    return this.observableState.getToBeDeletedInsts();
  }

  getDeletedInstsWithDanglingRefs() {
    return this.observableState.getDeletedInstsWithDanglingRefs();
  }

  getPathToChild(inst: ObjInst) {
    return this.observableState.getPathToChild(inst);
  }

  getAnyPathToChild(inst: ObjInst) {
    return this.observableState.getAnyPathToChild(inst);
  }

  // If `all` is set, also includes WeakRefs
  getRefsToInst(inst: ObjInst, all = true) {
    return this.observableState.getRefsToInst(inst, all);
  }

  // Get model changes since we started recording, so we can patch before
  // commiting to resolve model issues
  getChangesSoFar() {
    return [...this.changes];
  }

  private startRecording() {
    this.changes = [];
  }

  private endRecording(): RecordedChanges {
    const deletedInsts = this.getToBeDeletedInsts();
    return {
      changes: this.changes,
      newInsts: Array.from(this.observableState.getNewInsts().keys()).filter(
        (inst) => !deletedInsts.has(inst)
      ),
      removedInsts: Array.from(deletedInsts.keys()),
    };
  }

  withRecording(f: () => void): RecordedChanges;
  withRecording<E>(f: () => IFailable<void, E>): IFailable<RecordedChanges, E>;
  withRecording<E>(f: () => void | IFailable<void, E>) {
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
      if (maybeResult && maybeResult.result) {
        return failable<RecordedChanges, E>(({ success, failure }) => {
          if (maybeResult.result.isError) {
            const err = maybeResult.result.error;
            onError();
            return failure(err);
          } else {
            try {
              // succeeded() (which does prune()) may itself fail
              return success(succeeded());
            } catch (err2) {
              onError();
              return failure(err2);
            }
          }
        });
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
    this.observableState.dispose();
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
  withRecording<E>(f: () => IFailable<void, E>): IFailable<RecordedChanges, E>;
  withRecording<E>(f: () => void | IFailable<void, E>) {
    const maybeResult = f();
    if (maybeResult && maybeResult.result) {
      return failable<RecordedChanges, E>(({ success, failure }) => {
        if (maybeResult.result.isError) {
          const err = maybeResult.result.error;
          return failure(err);
        } else {
          return success(emptyRecordedChanges());
        }
      });
    } else {
      return emptyRecordedChanges();
    }
  }
  maybeObserveComponentTrees(components: Component[]) {
    return false;
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

function hackyMobxUtils() {
  const globalState = mobx._getGlobalState();

  // Instead of the typical mobx observable object admin, which
  // uses more memory, with an observable box for each field,
  // we use our custom implementation of admin specific to ObjInst.
  // There are kind of two mostly orthogonal parts of mobx machinery:
  // 1. The "observable" reactivity system, where you have observers
  //    observing observable things, and are invalidated when observable
  //    things change. This is how mobx-react components know to re-render,
  //    or how mobx.computed() knows to re-compute.
  // 2. The "change event tracking" system, which is an explicit system
  //    of subscribing to changes and notifying listeners when changed.
  //    This is implemented by the observable.* data structures provided
  //    by mobx, and we mimic what we do there with our own observable
  //    ObjInst.

  /**
   * Returns the ObservableInstAdmin for this ObjInst; assumes
   * it already exists
   */
  function getInstAdmin(inst: ObjInst) {
    return inst[mobx.$mobx] as ObservableInstAdmin;
  }

  /**
   * Returns whether this value is either mobx-observable,
   * or instrumented with our ObservableInstAdmin
   */
  function isObservable(v: any) {
    return (
      mobx.isObservable(v) ||
      (typeof v === "object" &&
        !!v &&
        ((v[mobx.$mobx]?.__isObservableInst ?? false) as boolean))
    );
  }

  /**
   * Returns an observable version of the argument value. We deeply
   * make array and object field values observable as well
   */
  function prepareNewValue(v: any) {
    if (isObservable(v)) {
      return v;
    } else if (Array.isArray(v)) {
      return mobx.observable.array(v);
    } else if (isLiteralObject(v)) {
      return mobx.observable.object(v);
    } else {
      // Note that if v is an ObjInst, it would fall in this case!
      // We do not turn it observable here; instead, the observeModel()
      // call above will do the work of turning this inst into observable
      return v;
    }
  }

  /**
   * Custom descriptors we install onto our ObjInst, one for each field
   */
  const getHandlers = memoize((clazz: Class, allFields: Field[]) => {
    return Object.fromEntries(
      allFields.map((f) => [
        f.name,
        {
          get(this: ObjInst) {
            // We report that the value is observed each time it is
            // access, so that any observer can be tracked by mobx.
            // And then we return the observable version
            // of the value.
            const admin = getInstAdmin(this);
            admin.__atoms[f.name].reportObserved();
            return admin.__values[f.name];
          },
          set(this: ObjInst, v: any) {
            const admin = getInstAdmin(this);
            const prev = admin.__values[f.name];
            // Turn the new value into an observable value
            const next = prepareNewValue(v);
            if (prev !== next) {
              // Upon mutation, we report that the atom has been
              // updated, so that any observers knows to be
              // invalidated.
              admin.__values[f.name] = next;

              // This notifies the reactivity system
              admin.__atoms[f.name].reportChanged();

              // This notifies the change event system
              notifyListeners(this, {
                type: "update",
                observableKind: "object",
                name: f.name,
                object: this,
                oldValue: prev,
                newValue: next,
              });
            }
          },
        },
      ])
    );
  });

  /**
   * Mutates `inst` into an observable inst, by installing
   * the ObservableInstAdmin
   */
  function makeInstObservable(
    inst: ObjInst,
    instClass: Class,
    allFields: Field[]
  ) {
    // The observable version of field values
    const values: Record<string, any> = {};
    // We create one Atom for each field value. An Atom is a mobx
    // primitive to represent an observable; it can report that it
    // has been observed, and that it has been changed. We track
    // observation and mutation for each field.
    const atoms: Record<string, Atom> = {};
    for (const field of allFields) {
      values[field.name] = prepareNewValue(inst[field.name]);
      atoms[field.name] = mobx.createAtom(field.name);
    }

    // Install the custom descriptors for tracked fields
    Object.defineProperties(inst, getHandlers(instClass, allFields));
    inst[mobx.$mobx] = {
      isMobXObservableObjectAdministration: true,
      __isObservableInst: true,
      __values: values,
      __atoms: atoms,
      observe_(listener: (changes: IObjectDidChange) => void) {
        return registerListener(inst, listener);
      },
    };
  }

  // mobx's change event system isn't very extensible, so we
  // copy some source code from mobx here.
  function notifyListeners<T>(inst: ObjInst, change: T) {
    const prevU = untrackedStart();
    let listeners = getInstAdmin(inst)?.__changeListeners;
    if (!listeners) {
      return;
    }
    listeners = listeners.slice();
    for (let i = 0, l = listeners.length; i < l; i++) {
      listeners[i](change);
    }
    untrackedEnd(prevU);
  }
  function registerListener(inst: ObjInst, handler: Function): Lambda {
    const admin = getInstAdmin(inst);
    const listeners = admin.__changeListeners || (admin.__changeListeners = []);
    listeners.push(handler);
    return once(() => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    });
  }
  function untrackedStart(): IDerivation | null {
    const prev = globalState.trackingDerivation;
    globalState.trackingDerivation = null;
    return prev;
  }
  function untrackedEnd(prev: IDerivation | null) {
    globalState.trackingDerivation = prev;
  }

  return {
    isObservable,
    makeInstObservable,
  };
}

export interface ObservableInstAdmin {
  __isObservableInst: boolean;
  __values: Record<string, any>;
  __atoms: Record<string, Atom>;
  __changeListeners: Function[] | undefined;
}
