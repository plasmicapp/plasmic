import {
  assert,
  ensure,
  ensureArray,
  ensureArrayOfInstances,
  only,
  switchType,
} from "@/wab/shared/common";
import { ValState } from "@/wab/shared/eval/val-state";
import { isKnownTplSlot, TplNode } from "@/wab/shared/model/classes";
import {
  makeSlotSelectionFullKey,
  makeSlotSelectionKey,
  SlotSelection,
} from "@/wab/shared/core/slots";
import { getTagOrComponentName } from "@/wab/shared/core/tpls";
import {
  getValChildren,
  slotHasDefaultContent,
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
} from "@/wab/shared/core/val-nodes";
import L from "lodash";

export type Selectable = ValNode | SlotSelection;

export function isSelectable(x: any): x is ValNode | SlotSelection {
  return x instanceof ValNode || x instanceof SlotSelection;
}

function getLabel(tpl: TplNode) {
  return isKnownTplSlot(tpl) ? "<slot>" : getTagOrComponentName(tpl);
}

/**
 * jQuery style API for traversing the tree of Selectables.
 *
 * Can be in local mode or full-stack mode.  Full-stack means operations
 * traverse across component stack frames (across owners).  Local stays
 * within the current selection's frame.
 *
 * Local speaks SlotSelections only, whereas full-stack speaks ValSlots.
 * Specifically, when accessing children of a ValComponent, local skips the
 * component's internal contents and yields the SlotSelection corresponding
 * to all the nodes passed in as slot args, whereas full-stack descends into
 * the component's contents and eventually makes its way to a ValSlot, and
 * then to the slot arguments (no SlotSelection in this path).
 *
 * Note that fullstack skipping SlotSelections means it you can't tell, when
 * descending into a fullstack child, whether that's inside the component
 * (if the component is a user component), or a slot content (if the
 * component is a foreign component).  So you have to rely on other methods
 * of determining which frame you're now in.  This is probably not a good
 * permanent state for this design.
 */
export class SelQuery {
  constructor(
    private readonly selection: Selectable[],
    private readonly valState: ValState,
    private readonly isFullstack: boolean
  ) {
    // Ensure that it's a val SlotSelection if it is a SlotSelection.
    assert(
      selection.every((s) => !(s instanceof SlotSelection) || s.val),
      () => `Not expecting a tpl slot selection`
    );
  }

  /**
   * Switch into full stack mode.
   */
  fullstack(isFullstack = true) {
    return SQ(this.selection, this.valState, isFullstack);
  }

  parent() {
    return this.isFullstack ? this.parentFullstack() : this.parentLocal();
  }

  parentFullstack() {
    return this.wrap(
      switchType(this.get())
        .when(SlotSelection, (sel) => sel.val)
        .when(
          ValNode,
          (val) => this.valState.val2slot(val) || this.valState.valParent(val)
        )
        .result()
    );
  }

  parentLocal() {
    return this.wrap(
      switchType(this.get())
        .when(SlotSelection, (sel) => sel.val)
        .when(ValNode, (val) => {
          // If we are some slot arg, then jump straight up to the
          // SlotSelection.
          const argInfo = this.valState.val2slotInfo(val);
          if (argInfo) {
            return new SlotSelection({
              val: argInfo.valComponent,
              slotParam: argInfo.param,
            });
          }

          const parent = this.valState.valParent(val);
          if (parent instanceof ValComponent) {
            // We're at the root and this is the component stack owner
            return undefined;
          } else if (parent && parent.valOwner !== val.valOwner) {
            // It's possible to accidentally cross into a different component.
            // One specific example here is the Plume Select, when you are
            // trying to find the parent of the trigger content node.  In general
            // the val tree is stitched together as best-effort, so better to
            // be careful!
            return undefined;
          }
          return parent;
        })
        .result()
    );
  }

  childrenFullstack() {
    return this.wrap(
      switchType(this.get())
        .when(SlotSelection, (sel) => sel.tryGetContent())
        .when(ValNode, (val) => getValChildren(val))
        .result()
    );
  }
  childrenLocal() {
    return switchType(this.get())
      .when([ValSlot, SlotSelection], (sel) => {
        if (sel instanceof ValSlot) {
          // If the ValSlot has defaultContents, then the defaultContent belongs
          // to this ValComponent, so return them
          if (slotHasDefaultContent(sel)) {
            return this.wrap(getValChildren(sel));
          }
          // Else either the ValSlot corresponds to an empty slot selected at the
          // call site, or to a slot that's been passed in args from outside
          // selected inside the drilled component.  So either no children,
          // or children we should not descend into.
          return this.wrap(undefined);
        }
        // Get the contents of the SlotSelection.
        return this.wrap(sel.tryGetContent());
      })
      .when(ValComponent, (val: /*TWZ*/ ValComponent) => {
        return this.wrap(
          [...val.slotArgs.keys()].map(
            (slotParam) => new SlotSelection({ val, slotParam })
          )
        );
      })
      .elseUnsafe(() => this.childrenFullstack());
  }

  children(): SelQuery {
    return this.isFullstack ? this.childrenFullstack() : this.childrenLocal();
  }

  layoutChildren() {
    return this.children().layoutContent();
  }

  layoutContent(): SelQuery {
    const nodes: Selectable[] = L.flatten(
      this.selection.map((n) =>
        switchType(n)
          .when([ValSlot, SlotSelection], (sel) =>
            this.wrap(sel).children().layoutContent().toArray()
          )
          .elseUnsafe(() => this.toArrayOfValNodes())
      )
    );
    return this.wrap(nodes);
  }

  layoutParent(): SelQuery {
    for (const parent of this.parents().toArrayOfValNodes()) {
      if (parent instanceof ValTag) {
        return this.wrap(parent);
      }
    }
    return this.wrap(undefined);
  }

  private descendantsGenericDfs(
    childrenFn: (sq: SelQuery) => SelQuery
  ): SelQuery {
    const self = this;
    function* rec(sel: Selectable): IterableIterator<Selectable> {
      yield sel;
      for (const child of childrenFn(self.wrap(sel)).toArray()) {
        yield* rec(child);
      }
    }
    return this.wrap([...rec(this.selection[0])]);
  }
  descendantsDfs() {
    return this.isFullstack
      ? this.descendantsDfsFullstack()
      : this.descendantsDfsLocal();
  }
  descendantsDfsLocal(): SelQuery {
    return this.descendantsGenericDfs((sq) => sq.childrenLocal());
  }
  descendantsDfsFullstack(): SelQuery {
    return this.descendantsGenericDfs((sq: /*TWZ*/ SelQuery) =>
      sq.childrenFullstack()
    );
  }
  firstChild() {
    return this.children().first();
  }
  first() {
    return this.wrap(this.selection[0]);
  }
  last() {
    return this.wrap(L.last(this.selection));
  }
  next() {
    return this.prevNext(1);
  }
  prev() {
    return this.prevNext(-1);
  }
  private prevNext(offset: number) {
    const parent = this.parent();
    if (parent.isEmpty()) {
      return parent;
    }
    const siblings = parent.children().toArray();
    const cur = this.get();
    const myPos =
      cur instanceof SlotSelection
        ? siblings.findIndex((x) => cur.equals(x))
        : siblings.indexOf(cur);
    return this.wrap(siblings[myPos + offset]);
  }
  at(index: number) {
    return this.wrap(this.selection[index]);
  }
  isEmpty() {
    return this.selection.length === 0;
  }
  get() {
    return only(this.selection);
  }
  tryGet(): Selectable | undefined {
    return this.selection[0];
  }
  wrap(selection: undefined | Selectable | Selectable[]) {
    return SQ(selection, this.valState, this.isFullstack);
  }
  toArray() {
    return this.selection.slice();
  }
  toArrayOfValNodes() {
    return this.toArray().filter((x): x is ValNode => x instanceof ValNode);
  }
  /**
   * Returns ancestors, including and starting from self, and going up
   */
  ancestors() {
    const self: SelQuery = this;
    function* gen() {
      let current = self;
      while (true) {
        if (current.isEmpty()) {
          break;
        }
        yield current.get();
        current = current.parent();
      }
    }
    return this.wrap([...gen()]);
  }
  parents() {
    return this.wrap(this.ancestors().toArray().slice(1));
  }
  is(other: Selectable) {
    return switchType(this.get())
      .when(ValNode, (sel) => sel === other)
      .when(
        SlotSelection,
        (sel) => other instanceof SlotSelection && sel.equals(other)
      )
      .result();
  }
  selectByLabels(spec: string) {
    const parts = spec.split(" ").map((part) => {
      const [label, num = "0"] = part.split(":");
      return { label, num: +num };
    });
    let current: SelQuery = this;
    for (const part of parts) {
      current = this.wrap(
        current
          .children()
          .toArray()
          .filter((child) =>
            switchType(child)
              .when(ValNode, (val) => getLabel(val.tpl) === part.label)
              .when(SlotSelection, () => part.label === "(slot)")
              .result()
          )[part.num]
      );
    }
    return current;
  }
  selectByIndexes(indexes: number[]) {
    let current: SelQuery = this;
    for (const index of indexes) {
      current = current.children().at(index);
    }
    return current;
  }
  indexPath() {
    return this.ancestors()
      .toArray()
      .reverse()
      .slice(1)
      .map((sel) => {
        const selQuery = this.wrap(sel);
        return selQuery
          .parent()
          .children()
          .toArray()
          .findIndex((child) => selQuery.is(child));
      });
  }
  labelsPath() {
    return this.ancestors()
      .toArray()
      .reverse()
      .slice(1)
      .map((sel) => {
        const selQuery = this.wrap(sel);
        const num = selQuery
          .parent()
          .children()
          .toArray()
          .filter((child) =>
            switchType(sel)
              .when(
                ValNode,
                (val) => child instanceof ValNode && val.tpl === child.tpl
              )
              .when(
                SlotSelection,
                (slotSel) =>
                  child instanceof SlotSelection && slotSel.tpl === child.tpl
              )
              .result()
          )
          .findIndex((child) => selQuery.is(child));
        const label = switchType(sel)
          .when(ValNode, (val) => getLabel(val.tpl))
          .when(SlotSelection, () => "(slot)")
          .result();
        return `${label}:${num}`;
      })
      .join(" ");
  }

  /**
   * Returns owners bottom-up.  Never includes current val even if it's a
   * ValComponent.  Limited to user vals (never includes root owner).
   */
  owners() {
    return this.wrap(
      switchType(this.get())
        .when(ValNode, (val) => this.valState.valOwners(val))
        .when(SlotSelection, (sel) =>
          this.valState.valOwners(
            ensure(sel.val, () => `Not expecting a tpl slot selection`)
          )
        )
        .result()
    );
  }

  /**
   * Returns owners bottom-up as a raw array.
   */
  ownersArrayUp() {
    return ensureArrayOfInstances(this.owners().toArray(), ValComponent);
  }

  frameNum() {
    return this.owners().toArray().length;
  }

  /**
   * Return the "ValNode children" - the contents of slots.
   *
   * This only makes sense for local traversal.
   */
  valChildren() {
    const children = this.children().toArray();
    if (children.length === 0) {
      return this.wrap(undefined);
    }
    // Only need to inspect first element, since if one is SlotSelection,
    // then all should be SlotSelection.
    return this.wrap(
      switchType(children[0])
        .when(SlotSelection, () =>
          L.flatMap(children, (child) => this.wrap(child).children().toArray())
        )
        .when(ValNode, () => children)
        .result()
    );
  }
}

export function SQ(
  selection: undefined | Selectable | Selectable[],
  valState: ValState,
  isFullstack = false
) {
  return new SelQuery(
    selection ? ensureArray(selection) : [],
    valState,
    isFullstack
  );
}

export function getUnlockedAncestor(sel: Selectable, valState: ValState) {
  const ancestors = SQ(sel, valState).ancestors().toArray();
  for (const ancestor of ancestors) {
    if (!isSelectableLocked(ancestor, valState)) {
      return ancestor;
    }
  }
  return undefined;
}

/**
 * Returns the highest focus-trapping ancestor under `cur`
 */
export function getFocusTrappingAncestor(
  sel: Selectable,
  valState: ValState,
  curFocused: Selectable | undefined | null
) {
  let candidate = sel;

  // We only try to use curAncestors if curFocused is specified, and it is
  // either a ValNode or a val-SlotSelection. curFocused could be a
  // tpl-SlotSelection because ViewCtx.focusedSelectable() could be a
  // tpl-SlotSelection
  const curAncestors =
    curFocused && (curFocused instanceof ValNode || curFocused.val)
      ? SQ(curFocused, valState).ancestors().toArray()
      : undefined;
  const ancestors = SQ(sel, valState).ancestors().toArray();
  for (const ancestor of ancestors) {
    if (curAncestors && curAncestors.includes(ancestor)) {
      // We've crossed path with curFocused! That means either curFocused is an
      // ancestor of `sel` or it is a sibling of some ancestor of `sel`.  In that
      // case, we will just use the latest candidate, which should either be the
      // highest focus-trapping ancestor (under `curFocused` or in a sibling tree),
      // or the original `sel` itself
      return candidate;
    }

    if (
      ancestor instanceof SlotSelection &&
      ancestor.slotParam.mergeWithParent &&
      ancestor.val !== valState.valSysRoot()
    ) {
      if (curAncestors && curAncestors.includes(ancestor.val!)) {
        return candidate;
      }
      // If `sel` is a descendant of a mergeWithParent slot, then select the
      // ancestor ValComponent instead
      candidate = ensure(
        ancestor.val,
        "Must be a Val SlotSelection from ValState"
      );
    } else if (
      ancestor instanceof ValComponent &&
      ancestor.tpl.component.trapsFocus &&
      ancestor !== valState.valSysRoot()
    ) {
      // Otherwise, we update candidate if we've come across a focus-trapping
      // ValComponent that is not the system root
      candidate = ancestor;
    }
  }

  // We've run out of options, so use the latest candidate
  return candidate;
}

export function isSelectableLocked(sel: Selectable, valState: ValState) {
  const ancestors = SQ(sel, valState).ancestors().toArray();
  for (const ancestor of ancestors) {
    if (ancestor instanceof ValNode) {
      if (ancestor.tpl.locked === true) {
        return true;
      } else if (ancestor.tpl.locked === false) {
        return false;
      }
    }
  }
  return false;
}

export function makeSelectableFullKey(sel: Selectable | undefined | null) {
  if (sel instanceof ValNode) {
    return sel.fullKey;
  } else if (sel instanceof SlotSelection && sel.val) {
    return makeSlotSelectionFullKey(sel);
  } else {
    return undefined;
  }
}
export function makeSelectableKey(sel: Selectable | undefined | null) {
  if (sel instanceof ValNode) {
    return sel.key;
  } else if (sel instanceof SlotSelection && sel.val) {
    return makeSlotSelectionKey(sel);
  } else {
    return undefined;
  }
}
