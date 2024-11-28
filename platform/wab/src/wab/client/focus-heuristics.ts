import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import {
  assert,
  coalesce,
  ensure,
  longestCommonPrefix,
  maybe,
  switchType,
  tuple,
} from "@/wab/shared/common";
import { isContextCodeComponent } from "@/wab/shared/core/components";
import {
  SQ,
  Selectable,
  getFocusTrappingAncestor,
  getUnlockedAncestor,
} from "@/wab/shared/core/selection";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  ValComponent,
  ValNode,
  ValSlot,
  slotHasDefaultContent,
} from "@/wab/shared/core/val-nodes";
import { asVal } from "@/wab/shared/core/vals";
import { ValState } from "@/wab/shared/eval/val-state";
import { Site, TplComponent } from "@/wab/shared/model/classes";
import {
  isCodeComponentSlot,
  isPlainTextTplSlot,
} from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import L from "lodash";

export class FocusHeuristics {
  constructor(
    private site: Site,
    private tplMgr: TplMgr,
    private valState: ValState,
    private currentComponentCtx: ComponentCtx | null,
    private showingDefaultSlotContents: boolean
  ) {}

  // Similar to containingComponentWithinCurrentComponentCtx.  This serves as
  // the main logic for deciding what to select when clicking on something.
  // This follows Sketch's selection model and is described more in
  // doc/misc-design.txt.  Basically, walk up the tree starting from the
  // currently active component context and select the nearest next-level-deep
  // component containing the target.
  //
  // A special case arises when you're inside a component context and are
  // clicking on the contents of a slot (that had arguments passed in from
  // outside).  Normally, since the slot is technically "outside" of the
  // component, simply clicking on it will exit the component context, which can
  // be jarring (too easy to exit).  Instead, we treat the slot almost like a
  // nested component - simply clicking will select the slot, and double
  // clicking will switch component contexts (exit current component context).
  //
  // To break down the special case some more:
  //
  // From the perspective of Outer:
  //
  //   tag 1
  //     ComponentA
  //       ComponentB
  //         tag 2
  //
  // From the perspective of A:
  //
  //   tag 3
  //     slot of ComponentA
  //
  // From the perspective of B:
  //
  //   tag 4
  //     slot of ComponentB
  //
  // Fully expanded val tree:
  //
  //   tag 1
  //     ComponentA <-- owner is Outer
  //       tag 3 <-- owner is ComponentA
  //         slot of ComponentA
  //           ComponentB <-- owner is Outer
  //             tag 4 <-- owner is ComponentB
  //               slot of ComponentB
  //                 tag 2 <-- owner is Outer
  //
  // What's selectable if our focused component context is on "Outer"?
  //
  //   tag 1 <-- focused component context 'Outer'
  //     ComponentA <-- selectable
  //       tag 3
  //         slot of ComponentA
  //           ComponentB <-- selectable
  //             tag 4
  //               slot of ComponentB
  //                 tag 2 <-- selectable
  //
  // We must be careful what slots we 'select' when some content under it is
  // clicked - it has to belong to the current component whose context we're in,
  // or else we may end up selecting "slot of ComponentB" below.
  //
  //   tag 1
  //     ComponentA <-- focused component context 'Outer'
  //       tag 3 <-- selectable
  //         slot of ComponentA <-- selectable
  //           ComponentB <-- not selectable from here down
  //             tag 4
  //               slot of ComponentB
  //                 tag 2
  //
  // The exception is valComponent is the top-most component and we are in
  // component editing mode---we actually let the user just directly edit slot
  // contents.
  bestFocusTarget(
    focusObj: Selectable,
    opts: {
      allowLocked?: boolean;
      curFocused?: Selectable | null;
      deepSelect?: boolean;
      exact: boolean;
    }
  ) {
    return switchType(focusObj)
      .when(SlotSelection, (slotSelection: SlotSelection) => {
        const target = this.bestFocusValTarget(
          ensure(
            slotSelection.val,
            () => "Expected ValNode to exist in Slot Selection"
          ),
          opts
        );
        if (target.focusTarget === slotSelection.val) {
          return L.assignIn(target, { focusTarget: slotSelection }, opts);
        } else {
          return target;
        }
      })
      .whenUnsafe(ValNode, (valNode) => {
        return this.bestFocusValTarget(valNode, opts);
      })
      .result();
  }

  parentComponents(valNode: ValNode): ValComponent[] {
    return this.valState.valOwners(valNode);
  }

  bestFocusValTarget(
    valNode: ValNode,
    opts: {
      allowLocked?: boolean;
      deepSelect?: boolean;
      curFocused?: Selectable | null;
      exact: boolean;
    }
  ) {
    if (
      !this.valState.maybeValUserRoot() ||
      !valNode.valOwner ||
      valNode.key.startsWith(".")
    ) {
      // If we haven't rendered, or if valNode has no valOwner -- meaning it
      // is a detached val node, rendered by canvas component that is used
      // outside of the usual canvas-rendering -- for example, by handing a
      // component class to a code component, who renders it without attaching
      // any of the canvas internal props. In that case, we can't reason
      // about it at all, as it is not part of the current val stack.
      // When the val key starts with '.' it means that this node is a child
      // of a detached val node, meaning we won't be able to focus on it either.
      return { componentCtx: null, focusTarget: null };
    }

    const currentComponent = this.currentValComponent();

    const slot = this.valState.getValSlotContainingSubstitutedArgVal(
      valNode,
      currentComponent
    );

    // Normally in component edit mode, if we select slot content, we only want to
    // select the slot instead, because the slot content is not part of the component.
    // The exception here is that if we are actually showing the default slot contents
    // for the currentComponent, because the default slot contents _are_ part of the component.
    let limitFocusToSlot = slot != null;
    if (
      slot &&
      currentComponent &&
      this.showingDefaultSlotContentsFor(currentComponent.tpl)
    ) {
      limitFocusToSlot = false;
    }
    if (limitFocusToSlot) {
      // Stay in the same context, and limit the selection to just the slot.
      return {
        componentCtx: this.currentComponentCtx,
        focusTarget: slot,
      };
    } else {
      const currentStack =
        currentComponent != null
          ? tuple(
              ...this.parentComponents(currentComponent).reverse(),
              currentComponent
            )
          : [];
      const newStack = this.parentComponents(valNode).reverse();
      const commonStack = longestCommonPrefix(newStack, currentStack);
      //
      // The results
      //
      const componentCtx =
        commonStack.length > 0
          ? new ComponentCtx({
              valComponent: ensure(
                L.last(commonStack),
                () => "Failed to get last element of commonStack"
              ),
            })
          : null;
      // This will either be the desired selection or the next-deeper component
      // from the new context that gets us closer to the desired selection.
      let focusTarget: Selectable | null =
        tuple(...newStack, valNode)[commonStack.length] ?? null;
      // Special case is ValSlot - clicking on it from outside should result in a
      // SlotSelection.  We can determine if this happened by checking:
      if (
        valNode instanceof ValSlot &&
        focusTarget instanceof ValComponent &&
        L.last(newStack) === focusTarget
      ) {
        focusTarget = new SlotSelection({
          val: focusTarget,
          slotParam: valNode.tpl.param,
        });
      }

      // At this point, focusTarget is a valid thing to select in the componentCtx.
      // If opts.exact, then this is the thing to focus
      if (opts.exact) {
        return { componentCtx, focusTarget };
      }

      // Otherwise, here comes some heuristics to pick the "nicest" thing to
      // select
      if (
        focusTarget instanceof ValNode &&
        focusTarget.tpl.parent &&
        isPlainTextTplSlot(focusTarget.tpl.parent) &&
        !isCodeComponentSlot(focusTarget.tpl.parent)
      ) {
        // Trying to focus on single text node of a TplSlot! Focus on parent instead
        const maybefocusTarget = SQ(focusTarget, this.valState)
          .parent()
          .tryGet();
        focusTarget = maybefocusTarget ?? focusTarget;
      }

      if (!opts.allowLocked) {
        focusTarget = getUnlockedAncestor(focusTarget, this.valState) ?? null;
      }

      if (!opts.deepSelect && focusTarget) {
        focusTarget = getFocusTrappingAncestor(
          focusTarget,
          this.valState,
          opts.curFocused
        );
      }

      if (
        focusTarget instanceof ValComponent &&
        isContextCodeComponent(focusTarget.tpl.component)
      ) {
        focusTarget = null;
      }

      return { componentCtx, focusTarget };
    }
  }

  // Returns either the best ValComponent that is within the current component
  // context (if any) that contains the given valNode (indirectly, just anywhere
  // below it, possibly within a sub-component), or null if the valNode is not
  // in any component.  This is mainly useful for when you want to click on some
  // rendered element, but it's actually part of some (sub-)component, so we
  // should be selecting the nearest containing component (nearest to the
  // current component context).
  //
  // A special case arises when valNode is under a slot of the current context
  // component - we'll want to pop out of the current context and jump directly
  // to the owner of the valNode.  Since the container we're returning could be
  // the top-most container, which is null, we don't want to simply return null,
  // since then we wouldn't be able to distinguish between this case and the
  // case where valNode is not nested in any component or slot.  So we return
  // null only in the latter case, and otherwise a {container} object, where
  // container can be null or a ValComponent.
  //
  // I.e.:
  //
  // - Return container: non-null means switch to that component context
  // - Return container: null means switch to top level context
  // - Return null means stay put
  //
  // Besides jumping directly to the owner of the valNode, there's one
  // alternative.  Consider: what should double click do in the following
  // situation?
  //
  //   ComponentA
  //     ...
  //       ComponentB <-- focused component context
  //         ...
  //           slot of ComponentB <-- selectable; contents are not selectable
  //             slot of ComponentA
  //               args passed into ComponentA slot <-- if double clicked, ...?
  //
  // Two options:
  //
  // - switch to Component A context and select slot of ComponentA (policy is
  //   pop up one level at a time)
  // - switch to Outer context and directly select the elements (policy is pop
  //   all the way out to the owner of the double clicked content)
  //
  // We just go with the first option.  The second option is left as a comment.
  containingComponentWithinCurrentComponentCtxForVal(valNode: /*TWZ*/ ValNode) {
    // Intentionally ignoring isolated component editing mode @rootValComponent().
    // Slots are always click-through.
    const current = maybe(this.currentComponentCtx, (x) => x.valComponent());
    if (current !== undefined) {
      const slot = this.valState.getValSlotContainingSubstitutedArgVal(
        valNode,
        current
      );
      if (slot != null && !slotHasDefaultContent(slot)) {
        // parent may be top-level, in which case return null
        return {
          container: coalesce(this.parentComponents(current)[0], () => null),
        };
      }
    }

    //
    // Below implementation is for the first option described in comment
    // doc.  If we want the second option, we just need to do this:
    //
    // return {container: this.val2owner(valNode)}
    //

    // From bottom-most first to top-most first.
    const parents = this.parentComponents(valNode).reverse();
    assert(
      current == null || [...parents].includes(current),
      () => "Expected current ValComponent to exist in component stack"
    );
    const parentsUntilCurrent =
      current != null
        ? L.dropWhile(
            parents,
            (x: /*TWZ*/ ValComponent) => x !== current
          ).slice(1)
        : parents;
    if (parentsUntilCurrent.length === 0) {
      // the valNode is directly inside the current component context
      return null;
    } else {
      // the top-most component containing valNode that is directly inside the
      // current component context.  We only use ValComponents that correspond
      // to Components owned by this site, as you cannot enter / edit an
      // imported component.
      const container = parentsUntilCurrent.find((v) =>
        this.tplMgr.isOwnedBySite(v.tpl.component)
      );
      return { container };
    }
  }

  containingComponentWithinCurrentComponentCtx(focusObj: Selectable) {
    return this.containingComponentWithinCurrentComponentCtxForVal(
      ensure(
        asVal(focusObj),
        () => "Expected ValNode to exist in Slot Selection"
      )
    );
  }

  private showingDefaultSlotContentsFor(tpl: TplComponent) {
    if (tpl === this.valState.valSysRoot().tpl) {
      // always showing default slot contents for the root TplComponent
      return true;
    } else if (
      this.showingDefaultSlotContents &&
      this.currentValComponent().tpl === tpl
    ) {
      // else if we are showing default slot contents of the current
      // ComponentCtx
      return true;
    } else {
      return false;
    }
  }

  private currentValComponent() {
    if (this.currentComponentCtx) {
      return this.currentComponentCtx.valComponent();
    } else {
      return this.valState.valSysRoot();
    }
  }
}
