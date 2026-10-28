/**
 * Change tracking for model instances, built into the model classes.
 *
 * - Every generated field accessor (see model-generator.ts) calls
 *   `meta.reportRead` or `meta.writeField`. `TrackingMetaRuntime` implements
 *   them; a plain `MetaRuntime` just stores values, so the model doesn't
 *   depend on tracking.
 * - `writeField` is a write barrier: for an inst in a `Tracker`, it maintains
 *   parent pointers and weak refs, and reports the change.
 * - `reportRead` creates a mobx atom only when read inside a derivation, so
 *   unobserved fields cost nothing.
 * - Collections are immutable values: a model changes only by assigning a
 *   field. Replacing a collection is reported as a diff, e.g. as splices.
 * - A coarse derivation (`markCurrentDerivationCoarse`) depends on one atom
 *   per scope (see `TrackerOpts.isScopeRoot`) rather than one per field.
 *
 * This file knows nothing about the concrete model schema.
 */
import { assertNever, shallowEq } from "@/wab/shared/common";
import type {
  AnyChange,
  ArraySpliceChange,
  ModelChangeListener,
  ObjAddChange,
  ObjDeleteChange,
  ObjUpdateChange,
} from "@/wab/shared/core/observable-model";
import mobx from "@/wab/shared/import-mobx";
import {
  Field,
  InternalModelInst,
  MetaRuntime,
  ModelInst,
  instFields,
  isModelInst,
} from "@/wab/shared/model/model-meta";

const globalState = mobx._getGlobalState();

interface FieldRef<T extends ModelInst = ModelInst> {
  readonly inst: T;
  readonly field: string;
}

/** Internal representation. Includes `$s` tracking state. */
export interface InternalTrackedModelInst extends InternalModelInst {
  readonly $s: InstState | undefined;
}

interface InstState {
  /** The tracker this inst is tracked by */
  tracker: Tracker | undefined;
  /**
   * The fields that strongly reference this inst while it is tracked. Exactly
   * one in a valid tree, but briefly none or several during a change.
   */
  parents: FieldRef[];
  /** Whether `mobx.isObservable(inst)` holds. Set when first tracked, never cleared. */
  observable: boolean;
  /** Lazily-created atoms by field name, plus the scope atom at `SCOPE_KEY` */
  atoms: Map<string, ChildAtom> | undefined;
}

/** What `inst[mobx.$mobx]` returns, so that `mobx.isObservable(inst)` holds */
const OBSERVABLE_STUB = Object.freeze({ __isTrackedModel: true });
/** Key of the scope atom in `InstState.atoms`; never a field name */
const SCOPE_KEY = "$scope";
/** Flag on a mobx derivation that tracks coarsely */
const COARSE = "$coarse";
/** Flag on a coarse derivation that observes the fields of untracked insts */
const OBSERVE_UNTRACKED = "$observeUntracked";

// Lazy mobx atoms

const ChildAtomBase: new (name: string) => any = Object.getPrototypeOf(
  mobx.createAtom("ChildAtom"),
).constructor;

class ChildAtom extends ChildAtomBase {
  constructor(
    private key: string,
    private parentAtoms: Map<string, ChildAtom>,
  ) {
    super(key);
  }

  /** Called by mobx (internal API) when the atom becomes unobserved */
  onBUO() {
    super.onBUO?.();
    if (this.parentAtoms.get(this.key) === this) {
      this.parentAtoms.delete(this.key);
    }
    if (lastCoarseAtom === this) {
      resetCoarseReadMemo();
    }
  }
}

function getOrCreateAtom(inst: ModelInst, key: string): ChildAtom {
  const state = getInstState(inst);
  const atoms = state.atoms ?? (state.atoms = new Map());
  let childAtom = atoms.get(key);
  if (!childAtom) {
    childAtom = new ChildAtom(key, atoms);
    atoms.set(key, childAtom);
    if (atomBudget !== undefined && key !== SCOPE_KEY) {
      checkAtomBudget(atomBudget);
    }
  }
  return childAtom;
}

function reportAtomObserved(inst: ModelInst, name: string) {
  getOrCreateAtom(inst, name).reportObserved();
}

function reportAtomChanged(state: InstState | undefined, name: string) {
  state?.atoms?.get(name)?.reportChanged();
}

// A derivation that allocates this many field atoms in one run is most likely
// traversing the model, and should track coarsely instead.
let atomBudget: number | undefined =
  process.env.NODE_ENV === "production" ? undefined : 5000;

/** Sets how many field atoms a derivation may allocate before warning */
export function setFieldAtomBudget(budget: number | undefined) {
  atomBudget = budget;
}

function checkAtomBudget(budget: number) {
  const derivation: any = globalState.trackingDerivation;
  if (derivation === null || derivation.$atomsWarned) {
    return;
  }
  if (derivation.$atomsRunId !== derivation.runId_) {
    derivation.$atomsRunId = derivation.runId_;
    derivation.$atomsCount = 0;
  }
  if (++derivation.$atomsCount > budget) {
    derivation.$atomsWarned = true;
    console.warn(
      `Derivation ${derivation.name_} allocated more than ${budget} model field atoms in one run. If it traverses the model, make it a coarse selector (see mobx-util.ts).`,
    );
  }
}

// Coarse tracking

/**
 * Makes the current mobx derivation track coarsely: reading a field of a tracked
 * inst depends on the inst's scope rather than on the field, so no per-field
 * atom is created. A scope changes whenever any inst in it changes. Nested
 * derivations track by their own flag.
 *
 * Untracked insts have no scope. Those once tracked (e.g. deleted insts) are
 * tracked per field. The rest are treated as immutable, like the sites of
 * dependencies, unless `observeUntrackedInsts` is set, e.g. when the derivation
 * is given an inst that is still being built.
 *
 * Call this at the start of every run of the derivation.
 */
export function markCurrentDerivationCoarse(observeUntrackedInsts = false) {
  const derivation: any = globalState.trackingDerivation;
  if (derivation !== null) {
    derivation[COARSE] = true;
    derivation[OBSERVE_UNTRACKED] = observeUntrackedInsts;
  }
}

/** Whether the current mobx derivation is coarse */
export function isCurrentDerivationCoarse(): boolean {
  const derivation = globalState.trackingDerivation;
  return derivation !== null && (derivation as any)[COARSE] === true;
}

export function isInstTracked(x: ModelInst): boolean {
  const tracker = instState(x)?.tracker;
  return tracker !== undefined && !tracker.disposed;
}

// Memo of the last coarse read; consecutive reads usually hit the same inst,
// or a child of it
let lastCoarseInst: ModelInst | undefined = undefined;
let lastCoarseAtom: ChildAtom | undefined = undefined;

function resetCoarseReadMemo() {
  lastCoarseInst = undefined;
  lastCoarseAtom = undefined;
}

function reportCoarseRead(inst: ModelInst, name: string) {
  if (inst === lastCoarseInst) {
    lastCoarseAtom?.reportObserved();
    return;
  }
  const state = instState(inst);
  const tracker = state?.tracker;
  if (state === undefined || tracker === undefined || tracker.disposed) {
    if (
      state?.observable ||
      (globalState.trackingDerivation as any)[OBSERVE_UNTRACKED] === true
    ) {
      reportAtomObserved(inst, name);
    }
    return;
  }
  const atom =
    lastCoarseAtom !== undefined &&
    state.parents[0]?.inst === lastCoarseInst &&
    !tracker.isScopeRoot(inst)
      ? lastCoarseAtom
      : getOrCreateAtom(tracker.getScopeRoot(inst), SCOPE_KEY);
  lastCoarseInst = inst;
  lastCoarseAtom = atom;
  atom.reportObserved();
}

function reportScopeChanged(scopeRoot: ModelInst) {
  instState(scopeRoot)?.atoms?.get(SCOPE_KEY)?.reportChanged();
}

// Field reads and writes

// So that `mobx.isObservable(inst)` holds for insts that were ever tracked
Object.defineProperty(ModelInst.prototype, mobx.$mobx, {
  configurable: true,
  get(this: InternalTrackedModelInst) {
    return this.$s?.observable ? OBSERVABLE_STUB : undefined;
  },
});

function instVals(inst: ModelInst): Record<string, any> {
  return (inst as InternalModelInst).$v;
}

function instState(inst: ModelInst): InstState | undefined {
  return (inst as InternalTrackedModelInst).$s;
}

function getInstState(inst: ModelInst): InstState {
  let state = instState(inst);
  if (state === undefined) {
    state = {
      tracker: undefined,
      parents: [],
      observable: false,
      atoms: undefined,
    };
    // Keep `$s` non-enumerable, even on insts cloned without it (e.g. by
    // lodash cloneDeep)
    Object.defineProperty(inst, "$s", { value: state, writable: true });
  }
  return state;
}

/** The `MetaRuntime` of model classes whose field reads and writes are tracked */
export class TrackingMetaRuntime extends MetaRuntime {
  /**
   * Defines an empty `$s` up front, so that all insts of a class share one
   * shape. It is not enumerable, so deep cloning and deep equality ignore it.
   */
  override initInst(inst: ModelInst, vals: Record<string, any>) {
    if (freezeCollections) {
      Object.values(vals).forEach(freezeCollection);
    }
    super.initInst(inst, vals);
    Object.defineProperty(inst, "$s", {
      value: undefined,
      enumerable: false,
      writable: true,
    });
  }

  /**
   * Called by every field getter. The getter reads the value itself, so that
   * each field gets its own inline cache.
   */
  override reportRead(inst: ModelInst, name: string) {
    const derivation = globalState.trackingDerivation;
    if (derivation === null) {
      return;
    }
    if ((derivation as any)[COARSE] === true) {
      reportCoarseRead(inst, name);
    } else {
      reportAtomObserved(inst, name);
    }
  }

  /** Called by every field setter; a plain write for untracked insts */
  override writeField(inst: ModelInst, field: Field, next: any) {
    if (freezeCollections) {
      freezeCollection(next);
    }
    const vals = instVals(inst);
    const state = instState(inst);
    const name = field.name;
    if (state === undefined) {
      vals[name] = next;
      return;
    }
    const prev = vals[name];
    if (areValuesEqual(prev, next)) {
      // Keep the old value, so that rebuilding an unchanged collection (e.g. a
      // filter that keeps everything) causes no reactions
      return;
    }
    vals[name] = next;
    reportAtomChanged(state, name);
    if (state.tracker?.tracks(field)) {
      state.tracker.onFieldUpdate(inst, field, prev, next);
    }
  }
}

/**
 * Under tests, stored collections are frozen so that changing one in place
 * throws instead of going unnoticed. Not elsewhere: frozen arrays are slower
 * to read.
 */
const freezeCollections = process.env.NODE_ENV === "test";

function freezeCollection(value: unknown) {
  const kind = kindOf(value);
  if ((kind === "array" || kind === "map") && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(freezeCollection);
  }
}

// Tracker

export interface TrackerOpts<T extends ModelInst> {
  root: T;
  /** Called for every change to a tracked inst, with its path from the root */
  listener(
    change: AnyChange & { path?: FieldRef<T>[]; changeNode: FieldRef<T> },
  ): void;
  excludeFields?: Field[];
  /** Insts owned by another tree; they may be weakly referenced only */
  isExternalRef?(inst: T): boolean;
  visitNodeListener?(inst: T): void;
  /**
   * Whether `inst` roots a scope, for coarse tracking. An inst belongs to its
   * nearest ancestor-or-self scope root, else to the tracker's root.
   *
   * May depend only on the class of `inst` and its first parent (undefined if
   * detached), since other changes aren't reported to the scopes involved.
   */
  isScopeRoot(
    inst: T,
    parent: T | undefined,
    parentField: string | undefined,
  ): boolean;
  /** Resolves insts that a string value refers to (e.g. a token ref) */
  resolveImplicitRefs(
    inst: T,
    fieldName: string,
    value: string,
  ): T[] | undefined;
  getInstName(inst: T): string;
}

/**
 * Tracks changes for a Site and its entire tree of insts.
 *
 * An inst is tracked from when it is first attached until `prune()` finds it
 * unreachable. Tracked insts report their changes, keep their strong parents,
 * and are in the reverse weak-ref index.
 */
export class Tracker<T extends ModelInst = ModelInst> {
  disposed = false;
  readonly root: T;
  private readonly excludeFields: Set<Field>;

  /** Reverse index of weak refs: target -> referrer -> count */
  private weakRefs = new Map<T, Map<T, number>>();
  /** Insts that became tracked since the last prune */
  private newInsts = new Set<T>();
  /** Insts to check at the next prune, e.g. those that lost a parent */
  private toCheck = new Set<T>();

  constructor(private opts: TrackerOpts<T>) {
    this.root = opts.root;
    this.excludeFields = new Set(opts.excludeFields ?? []);
    const state = getInstState(this.root);
    if (state.tracker !== undefined && !state.tracker.disposed) {
      throw new Error(
        `Instance ${this.root.uid} is already tracked by another tracker`,
      );
    }
    state.tracker = this;
    state.observable = true;
    state.parents = [];
    this.track([this.root]);
  }

  tracks(field: Field) {
    return !this.disposed && !this.excludeFields.has(field);
  }

  // Write barrier callbacks

  onFieldUpdate(inst: T, field: Field, prev: any, next: any) {
    const pending: T[] = [];
    for (const change of this.relink(inst, field, prev, next, pending)) {
      this.fire(inst, field.name, change);
    }
    this.track(pending);
  }

  private fire(inst: T, field: string, change: AnyChange) {
    const changeNode = { inst, field };
    const path = this.getPathToChild(inst, true);
    this.opts.listener({
      ...change,
      path: path && [...path, changeNode],
      changeNode,
    });
  }

  // Linking

  /**
   * Moves the links that `owner[field]` makes (parent pointers of the insts it
   * owns, and weak refs) from `prev` to `next`, and returns the changes. When
   * a collection replaces one of the same kind, the changes are a diff, so
   * only the items that differ are relinked.
   */
  private relink(
    owner: T,
    field: Field,
    prev: any,
    next: any,
    pending: T[],
  ): AnyChange[] {
    const changes = diffValues(prev, next);
    const unlinkAll = (values: unknown[]) =>
      values.forEach((value) => this.unlink(owner, field, value));
    const linkAll = (values: unknown[]) =>
      values.forEach((value) => this.link(owner, field, value, pending));
    for (const change of changes) {
      switch (change.type) {
        case "array-splice":
          unlinkAll(change.removed);
          linkAll(change.added);
          break;
        case "obj-add":
          linkAll([change.newValue, change.key]);
          break;
        case "obj-delete":
          unlinkAll([change.oldValue, change.key]);
          break;
        case "array-update":
        case "obj-update":
        case "update":
          unlinkAll([change.oldValue]);
          linkAll([change.newValue]);
          break;
        default:
          assertNever(change);
      }
    }
    return changes;
  }

  /**
   * Adds the links that `owner[field]` makes to `value` and its items. Newly
   * attached insts are pushed to `pending`, to track.
   */
  private link(owner: T, field: Field, value: unknown, pending: T[]) {
    const kind = kindOf(value);
    switch (kind) {
      case "nil":
        break;
      case "primitive":
        if (typeof value === "string") {
          this.opts
            .resolveImplicitRefs(owner, field.name, value)
            ?.forEach((target) => this.addWeakRef(owner, target));
        }
        break;
      case "inst":
        if (field.annotations.includes("WeakRef")) {
          this.addWeakRef(owner, value as T);
        } else {
          this.attach(owner, field, value as T, pending);
        }
        break;
      case "array":
      case "map":
        collectionValues(value as object).forEach((item) =>
          this.link(owner, field, item, pending),
        );
        break;
      default:
        assertNever(kind);
    }
  }

  /** Removes the links that `link` added for `value` */
  private unlink(owner: T, field: Field, value: unknown) {
    const kind = kindOf(value);
    switch (kind) {
      case "nil":
        break;
      case "primitive":
        if (typeof value === "string") {
          this.opts
            .resolveImplicitRefs(owner, field.name, value)
            ?.forEach((target) => this.removeWeakRef(owner, target));
        }
        break;
      case "inst":
        if (field.annotations.includes("WeakRef")) {
          this.removeWeakRef(owner, value as T);
        } else {
          this.detach(owner, field, value as T);
        }
        break;
      case "array":
      case "map":
        collectionValues(value as object).forEach((item) =>
          this.unlink(owner, field, item),
        );
        break;
      default:
        assertNever(kind);
    }
  }

  private isTracked(inst: T) {
    return instState(inst)?.tracker === this;
  }

  /** Whether `inst` is tracked but has lost its last parent */
  private isOrphan(inst: T) {
    return (
      this.isTracked(inst) &&
      inst !== this.root &&
      getInstState(inst).parents.length === 0
    );
  }

  private attach(owner: T, field: Field, child: T, pending: T[]) {
    const state = getInstState(child);
    const parent = { inst: owner, field: field.name };
    if (state.tracker === this) {
      if (state.parents.length === 0 && child !== this.root) {
        // While it was detached, the child was in the root's scope
        resetCoarseReadMemo();
        reportScopeChanged(this.root);
        // Whether it is a scope root may depend on where it is attached
        reportScopeChanged(child);
      }
      state.parents.push(parent);
      this.toCheck.add(child);
      return;
    }
    if (state.tracker !== undefined && !state.tracker.disposed) {
      throw new Error(
        `Instance ${child.uid} is already tracked by another tracker`,
      );
    }
    state.tracker = this;
    state.observable = true;
    state.parents = [parent];
    if (this.opts.isExternalRef?.(child)) {
      this.toCheck.add(child);
    }
    pending.push(child);
  }

  private detach(owner: T, field: Field, child: T) {
    const state = instState(child);
    if (state?.tracker !== this) {
      return;
    }
    const index = state.parents.findIndex(
      (parent) => parent.inst === owner && parent.field === field.name,
    );
    if (index === 0) {
      // Whether it is a scope root may depend on where it is attached
      resetCoarseReadMemo();
      reportScopeChanged(child);
    }
    if (index >= 0) {
      state.parents.splice(index, 1);
    }
    if (state.parents.length === 0) {
      // Moves it to the end, so that a prune() that already checked it while
      // it had parents checks it again
      this.toCheck.delete(child);
    }
    this.toCheck.add(child);
  }

  private addWeakRef(referrer: T, target: T) {
    let referrers = this.weakRefs.get(target);
    if (!referrers) {
      referrers = new Map();
      this.weakRefs.set(target, referrers);
    }
    referrers.set(referrer, (referrers.get(referrer) ?? 0) + 1);
    if (!this.isTracked(target)) {
      this.toCheck.add(target);
    }
  }

  private removeWeakRef(referrer: T, target: T) {
    const referrers = this.weakRefs.get(target);
    const count = referrers?.get(referrer);
    if (!referrers || !count) {
      return;
    }
    if (count === 1) {
      referrers.delete(referrer);
      if (referrers.size === 0) {
        this.weakRefs.delete(target);
      }
    } else {
      referrers.set(referrer, count - 1);
    }
  }

  // Tracking and untracking

  /** Tracks the insts in `pending`, and the subtrees they own */
  private track(pending: T[]) {
    while (pending.length > 0) {
      const inst = pending.pop() as T;
      const vals = instVals(inst);
      this.newInsts.add(inst);
      this.opts.visitNodeListener?.(inst);
      for (const field of instFields(inst)) {
        if (!this.tracks(field)) {
          continue;
        }
        this.link(inst, field, vals[field.name], pending);
      }
    }
  }

  /**
   * Untracks an orphan. Its children lose a parent, so the same prune checks
   * them, and untracks them if orphaned.
   */
  private untrack(inst: T) {
    getInstState(inst).tracker = undefined;
    const vals = instVals(inst);
    for (const field of instFields(inst)) {
      if (this.tracks(field)) {
        this.unlink(inst, field, vals[field.name]);
      }
    }
  }

  // Queries

  private parentsOf(inst: T): FieldRef<T>[] {
    const state = instState(inst);
    return state?.tracker === this ? (state.parents as FieldRef<T>[]) : [];
  }

  /**
   * The path from the root to `inst`, or undefined if there is none or more
   * than one (the model can be briefly invalid during a change). If
   * `changed`, also reports a change to the scope of `inst` in the same walk.
   */
  getPathToChild(inst: T, changed = false): FieldRef<T>[] | undefined {
    if (changed) {
      resetCoarseReadMemo();
    }
    const reversed: FieldRef<T>[] = [];
    let cur = inst;
    let needsScope = changed;
    while (cur !== this.root) {
      if (needsScope && this.isScopeRoot(cur)) {
        reportScopeChanged(cur);
        needsScope = false;
      }
      const parents = this.parentsOf(cur);
      // The length check guards against a cycle among detached insts
      if (parents.length !== 1 || reversed.length > 100000) {
        if (changed) {
          this.reportAllScopesChanged(inst);
        }
        return undefined;
      }
      reversed.push(parents[0]);
      cur = parents[0].inst;
    }
    if (needsScope) {
      reportScopeChanged(this.root);
    }
    return reversed.reverse();
  }

  isScopeRoot(inst: T): boolean {
    if (inst === this.root) {
      return true;
    }
    const parent = this.parentsOf(inst)[0];
    return this.opts.isScopeRoot(inst, parent?.inst, parent?.field);
  }

  getScopeRoot(inst: T): T {
    let cur = inst;
    for (let hops = 0; hops < 100000 && !this.isScopeRoot(cur); hops++) {
      const parent = this.parentsOf(cur)[0];
      if (parent === undefined) {
        break;
      }
      cur = parent.inst;
    }
    // A detached inst is in the root's scope until it is attached or pruned
    return this.isScopeRoot(cur) ? cur : this.root;
  }

  /**
   * Conservatively reports a change to an inst that is detached or has
   * several parents, to the root's scope and every scope above the inst
   */
  private reportAllScopesChanged(inst: T) {
    reportScopeChanged(this.root);
    const seen = new Set<T>();
    const visit = (node: T) => {
      if (node === this.root || seen.has(node)) {
        return;
      }
      seen.add(node);
      if (this.isScopeRoot(node)) {
        reportScopeChanged(node);
      }
      this.parentsOf(node).forEach((parent) => visit(parent.inst));
    };
    visit(inst);
  }

  getAnyPathToChild(inst: T): FieldRef<T>[] | undefined {
    const seen = new Set<T>();
    const gather = (node: T): FieldRef<T>[] | undefined => {
      if (node === this.root) {
        return [];
      }
      if (seen.has(node)) {
        return undefined;
      }
      seen.add(node);
      for (const parent of this.parentsOf(node)) {
        const path = gather(parent.inst);
        if (path) {
          return [...path, parent];
        }
      }
      return undefined;
    };
    return gather(inst);
  }

  getRefsToInst(inst: T, all: boolean): T[] {
    return [
      ...new Set(this.parentsOf(inst).map((parent) => parent.inst)),
      ...(all ? (this.weakRefs.get(inst)?.keys() ?? []) : []),
    ];
  }

  getNewInsts() {
    return this.newInsts;
  }

  /** Insts that the next prune would find unreachable */
  getToBeDeletedInsts(): Set<T> {
    const toBeDeleted = new Set<T>();
    const visit = (value: unknown) => {
      if (value === null || typeof value !== "object") {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (!isModelInst(value)) {
        Object.values(value).forEach(visit);
      } else {
        const inst = value as T;
        if (
          toBeDeleted.has(inst) ||
          !this.isTracked(inst) ||
          inst === this.root ||
          !this.parentsOf(inst).every((parent) => toBeDeleted.has(parent.inst))
        ) {
          return;
        }
        toBeDeleted.add(inst);
        const vals = instVals(inst);
        for (const field of instFields(inst)) {
          if (this.tracks(field) && !field.annotations.includes("WeakRef")) {
            visit(vals[field.name]);
          }
        }
      }
    };
    for (const inst of this.toCheck) {
      if (this.isOrphan(inst)) {
        visit(inst);
      }
    }
    return toBeDeleted;
  }

  getDeletedInstsWithDanglingRefs(): Set<T> {
    const deleted = new Set<T>();
    for (const inst of this.toCheck) {
      if (
        !this.shouldNotHaveParents(inst) &&
        !this.isTracked(inst) &&
        this.weakRefs.get(inst)?.size
      ) {
        deleted.add(inst);
      }
    }
    return deleted;
  }

  // Invariants

  private shouldNotHaveParents(inst: T) {
    return inst === this.root || !!this.opts.isExternalRef?.(inst);
  }

  private describe(inst: T) {
    return `${inst.uid} (${this.opts.getInstName(inst)})`;
  }

  private describeRefs(refs: Iterable<FieldRef<T> | T>) {
    return [...refs]
      .map((ref) =>
        isModelInst(ref)
          ? `${this.opts.getInstName(ref)}[${ref.uid}]`
          : `${this.opts.getInstName(ref.inst)}[${ref.inst.uid}].${ref.field}`,
      )
      .join(", ");
  }

  /**
   * Stops tracking the insts that became unreachable, and asserts that the
   * model is a tree: every inst has exactly one strong parent, the root and
   * external insts have none, and nothing refers to an unreachable inst.
   */
  prune() {
    // Untracking an orphan adds its children to `toCheck`, and a Set iteration
    // visits entries added during it, so this also untracks orphans' orphans
    let untracked = false;
    for (const inst of this.toCheck) {
      if (this.isOrphan(inst)) {
        this.untrack(inst);
        untracked = true;
      }
    }
    this.newInsts.clear();
    if (untracked) {
      // The untracked insts were in the root's scope while detached, and their
      // later changes aren't reported
      resetCoarseReadMemo();
      reportScopeChanged(this.root);
    }

    const errors: string[] = [];
    for (const inst of this.toCheck) {
      if (this.shouldNotHaveParents(inst)) {
        const parents = this.parentsOf(inst);
        if (parents.length > 0) {
          errors.push(
            `Instance ${this.describe(inst)} has unexpected parent refs:\n` +
              this.describeRefs(parents),
          );
        }
      } else if (!this.isTracked(inst)) {
        const referrers = this.weakRefs.get(inst);
        if (referrers?.size) {
          errors.push(
            `Unreachable instance ${this.describe(
              inst,
            )} has unexpected refs:\n` + this.describeRefs(referrers.keys()),
          );
        }
      } else if (this.parentsOf(inst).length > 1) {
        errors.push(
          `Instance ${this.describe(inst)} has more than one parent:\n` +
            this.describeRefs(this.parentsOf(inst)),
        );
      }
    }
    if (errors.length > 0) {
      throw new Error(`Invariant failed: ${errors.join("\n")}`);
    }
    this.toCheck.clear();
  }

  dispose() {
    this.disposed = true;
    resetCoarseReadMemo();
    this.weakRefs.clear();
    this.newInsts.clear();
    this.toCheck.clear();
  }
}

// Value equality / diffing

/**
 * What a field value is, to the tracker. Only insts, strings (see
 * `resolveImplicitRefs`) and collections of them link anything.
 */
function kindOf(value: unknown) {
  if (value === null || value === undefined) {
    return "nil";
  }
  if (typeof value !== "object") {
    return "primitive";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return isModelInst(value) ? "inst" : "map";
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  const kind = kindOf(a);
  if (kind !== kindOf(b)) {
    return false;
  }
  switch (kind) {
    case "nil":
      return true;
    case "primitive":
    case "inst":
      return a === b;
    case "array":
    case "map":
      return shallowEq(a, b);
    default:
      return assertNever(kind);
  }
}

/**
 * The changes made by assigning `next` over `prev`: a diff if both are
 * collections of the same kind, else a field update
 */
function diffValues(prev: any, next: any): AnyChange[] {
  if (prev === next) {
    return [];
  }
  const prevKind = kindOf(prev);
  const nextKind = kindOf(next);
  if (prevKind === nextKind) {
    if (prevKind === "array") {
      return diffArrays(prev, next);
    } else if (prevKind === "map") {
      return diffObject(prev, next);
    }
  }
  return [{ type: "update", oldValue: prev, newValue: next }];
}

/** The items of an array, or the keys and values of a map */
function collectionValues(value: object): unknown[] {
  return Array.isArray(value) ? value : Object.entries(value).flat();
}

/**
 * Diffs arrays by trimming their common prefix and suffix. If the rest only
 * removes or only inserts items, each contiguous run is a splice, applied in
 * order. Otherwise (e.g. a move), the range that differs is one splice.
 */
export function diffArrays<T>(
  prev: readonly T[],
  next: T[],
): ArraySpliceChange<T>[] {
  const max = Math.min(prev.length, next.length);
  let start = 0;
  while (start < max && prev[start] === next[start]) {
    start++;
  }
  let end = 0;
  while (
    end < max - start &&
    prev[prev.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }
  const prevEnd = prev.length - end;
  const nextEnd = next.length - end;
  if (start === prevEnd && start === nextEnd) {
    return [];
  }
  if (start === prevEnd || start === nextEnd) {
    return [
      splice(
        next,
        start,
        prev.slice(start, prevEnd),
        next.slice(start, nextEnd),
      ),
    ];
  }
  return (
    spliceRuns(next, prev, start, prevEnd, next, start, nextEnd, "removed") ??
    spliceRuns(next, next, start, nextEnd, prev, start, prevEnd, "added") ?? [
      splice(
        next,
        start,
        prev.slice(start, prevEnd),
        next.slice(start, nextEnd),
      ),
    ]
  );
}

function splice<T>(
  object: T[],
  index: number,
  removed: T[],
  added: T[],
): ArraySpliceChange<T> {
  return { type: "array-splice", object, index, added, removed };
}

/**
 * If `sub[subStart, subEnd)` is a subsequence of `full[fullStart, fullEnd)`,
 * returns a splice per run of the extra items in `full`, as `removed` (for
 * removals from `full`) or `added` (for insertions into `sub`). Indexes are
 * those of the array as it is after the previous splices. `object` is the
 * new array, the object of each splice.
 */
function spliceRuns<T>(
  object: T[],
  full: readonly T[],
  fullStart: number,
  fullEnd: number,
  sub: readonly T[],
  subStart: number,
  subEnd: number,
  as: "removed" | "added",
): ArraySpliceChange<T>[] | undefined {
  if (fullEnd - fullStart <= subEnd - subStart) {
    return undefined;
  }
  const changes: ArraySpliceChange<T>[] = [];
  let j = subStart;
  // The number of items the splices so far removed before the current item
  let shift = 0;
  let i = fullStart;
  while (i < fullEnd) {
    if (j < subEnd && full[i] === sub[j]) {
      i++;
      j++;
      continue;
    }
    const runStart = i;
    while (i < fullEnd && !(j < subEnd && full[i] === sub[j])) {
      i++;
    }
    const run = full.slice(runStart, i);
    changes.push(
      as === "removed"
        ? splice(object, runStart - shift, run, [])
        : splice(object, runStart, [], run),
    );
    if (as === "removed") {
      shift += run.length;
    }
  }
  return j === subEnd ? changes : undefined;
}

/** Diffs maps by key */
export function diffObject(
  prev: object,
  next: object,
): (ObjAddChange | ObjUpdateChange | ObjDeleteChange)[] {
  const hasOwn = Object.prototype.hasOwnProperty;
  const changes: (ObjAddChange | ObjUpdateChange | ObjDeleteChange)[] = [];
  for (const key of Object.keys(prev)) {
    if (!hasOwn.call(next, key)) {
      changes.push({
        type: "obj-delete",
        object: next,
        key,
        oldValue: prev[key],
      });
    } else if (prev[key] !== next[key]) {
      changes.push({
        type: "obj-update",
        object: next,
        key,
        oldValue: prev[key],
        newValue: next[key],
      });
    }
  }
  for (const key of Object.keys(next)) {
    if (!hasOwn.call(prev, key)) {
      changes.push({
        type: "obj-add",
        object: next,
        key,
        newValue: next[key],
      });
    }
  }
  return changes;
}
