import { coalesce, ensure, ensureInstance } from "@/wab/shared/common";
import { Param } from "@/wab/shared/model/classes";
import { ValComponent, ValNode, ValSlot, ValTag } from "@/wab/shared/core/val-nodes";

export class SlotInfo {
  constructor(
    readonly param: Param,
    // `undefined` for code components as they don't have ValSlots
    readonly valSlot: ValSlot | undefined,
    readonly valComponent: ValComponent
  ) {}
}

/**
 * This is a helper class for looking up information about a ValTree.
 * Created by the Evaluator in the process of evaluating.
 */
export class ValState {
  constructor(
    private opts: {
      sysRoot: ValComponent | undefined;
      globalRoot: ValComponent | undefined;
    }
  ) {}

  // Includes given val node.  Goes from top-most to given val.  Limited to user
  // vals.
  valAncestors(
    val: ValNode,
    { includeVal = true }: { includeVal?: boolean } = {}
  ) {
    let vals: ValNode[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      vals.push(val);
      const nextVal = this.valParent(val);
      if (!nextVal) {
        break;
      }
      val = nextVal;
    }
    if (!includeVal) {
      vals = vals.slice(1);
    }
    return vals.reverse();
  }
  valParent(val: ValNode) {
    if (val === this.maybeValUserRoot()) {
      // We cut this off at user root, as we don't want to return
      // the sys root as a val parent.  We use maybeValUserRoot()
      // because it may be that we have not finished rendering yet
      return undefined;
    } else {
      if (val.parent instanceof ValSlot && val.slotInfo) {
        return val.slotInfo.valComponent;
      }
      return val.parent;
    }
  }
  // Goes bottom-up.  Never includes given val even if it's a ValComponent.
  // Limited to user vals. Does not include root owner.
  valOwners(val: ValNode) {
    const vals: ValComponent[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const valOwner = val.valOwner;
      if (valOwner == null || this.isSysVal(valOwner)) {
        break;
      }
      vals.push(valOwner);
      val = valOwner;
    }
    return vals;
  }
  isSysVal(val: ValNode) {
    return val === this.maybeValSysRoot();
  }
  isUserVal(val: ValNode) {
    return this.valAncestors(val).includes(this.valUserRoot());
  }
  // valUserRoot is the root that the user is able to see/interact with.
  maybeValUserRoot() {
    const sysRoot = this.maybeValSysRoot();
    if (!sysRoot || !sysRoot.contents || sysRoot.contents.length === 0) {
      return undefined;
    }
    return ensureInstance(sysRoot.contents[0], ValTag, ValComponent);
  }

  valUserRoot() {
    return ensure(this.maybeValUserRoot(), () => "Couldn't get ValUserRoot");
  }
  // valSysRoot is the root that the system evaluated - ValRoot for pages
  // (corresponding to a materialized TplRoot in the Page object) or
  // ValComponent for components (synthetically generated TplComponent on the
  // fly).
  //
  // Synonymous with realValRoot on CanvasCtx (historical - this is a better
  // name).
  //
  // This is helpful because e.g. if we want to generate and carry a state map
  // over to a new eval, then we would want to walk the entire thing, so that we
  // pick up on slot args on the synthetic TplComponent.
  valSysRoot() {
    return ensure(this.maybeValSysRoot(), () => "Couldn't get ValSysRoot");
  }

  maybeValSysRoot() {
    return this.opts.sysRoot;
  }

  /**
   * valGlobalRoot is the root that is truly at the root of the val tree --
   * including any global context TplComponents. Sometimes, valGlobalRoot
   * exists but valSysRoot does not -- that's because the global context
   * components may be preventing its children from rendering while it is,
   * for example, loading some data (for example, antd5-config-provider will
   * not render anything when it encounters a thrown data-not-ready promise).
   *
   * valGlobalRoot is almost always set, except when the ViewCtx has never
   * been evaluated before.
   *
   * If no global contexts are involved, then globalRoot is the same as sysRoot
   */
  maybeValGlobalRoot() {
    return this.opts.globalRoot;
  }

  // Returns the slot that a component argument val was directly substituted
  // into.  Doesn't include vals that were a slot's defaultContents (returns
  // undefined).
  val2slot(val: ValNode) {
    return val.slotInfo?.valSlot;
  }

  /**
   * Returns the ArgInfo that a node was created in.  This is the
   * "call site argument" of a component slot.  Useful for determining the
   * slot that the ValNode was defined in/passed into.
   */
  val2slotInfo(val: ValNode): SlotInfo | undefined {
    return val.slotInfo;
  }
  // Bottom-up, including val
  *ancestorsFullStackIncludingSlots(val: ValNode) {
    const self = this;
    return yield* (function* () {
      while (true) {
        yield val;
        const next = coalesce(self.val2slot(val), () => self.valParent(val));
        if (!next) {
          break;
        }
        val = next;
      }
    })();
  }
  /**
   * Given a valComponent that is the "context" we're operating in and a
   * target val node, return the ValSlot belonging to this component that
   * either is or contains the target (if the target is a ValNode that was
   * passed into the slot as an arg), or null if the target is not in any of
   * this valComponent's slots.
   */
  getValSlotContainingSubstitutedArgVal(
    val: ValNode,
    valComponent: ValComponent
  ) {
    for (const node of this.ancestorsFullStackIncludingSlots(val)) {
      if (node instanceof ValSlot && node.valOwner === valComponent) {
        return node;
      } else if (node === valComponent) {
        // Don't bother searching further.
        return null;
      }
    }
    // We went all the way past root.
    return null;
  }
}
