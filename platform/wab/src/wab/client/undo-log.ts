import { ArenaFrame, Site, TplNode } from "@/wab/classes";
import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import { logChangedNodes } from "@/wab/client/studio-ctx/StudioCtx";
import { assert } from "@/wab/common";
import {
  IChangeRecorder,
  mergeRecordedChanges,
  RecordedChanges,
} from "@/wab/observable-model";
import { Selectable } from "@/wab/selection";
import { AnyArena } from "@/wab/shared/Arenas";
import { ComponentVariantFrame } from "@/wab/shared/component-frame";
import {
  DeletedAssetsSummary,
  undoChangesAndResolveConflicts,
} from "@/wab/shared/server-updates-utils";
import { SlotSelection } from "@/wab/slots";
import { trackComponentRoot, trackComponentSite } from "@/wab/tpls";
import { ValNode } from "@/wab/val-nodes";
import L from "lodash";
import { observable } from "mobx";

export interface ViewStateSnapshot {
  focusedArena?: AnyArena | null;
  focusedFrame?: ArenaFrame;
  focusedOnFrame: boolean;
  focusedSelectable?: Selectable;
  nextFocusedTpl?: TplNode;
  vcComponentStack?: ComponentVariantFrame[];
  currentComponentCtx?: ComponentCtx;
  vcFocusedCloneKey?: string;
}

export interface UndoRecord {
  changes: RecordedChanges;
  view: ViewStateSnapshot;
}

export interface UndoSnapshot {
  site: Site;
  view: ViewStateSnapshot;
  changes: RecordedChanges;
}

export class UndoLog {
  _log = observable.array<UndoRecord>([], { deep: false });
  __nextInsertPos = observable.box(0);
  constructor(
    private site: Site,
    private recorder: IChangeRecorder,
    private summary: DeletedAssetsSummary
  ) {}
  get _nextInsertPos() {
    return this.__nextInsertPos.get();
  }
  set _nextInsertPos(num: number) {
    this.__nextInsertPos.set(num);
  }
  head() {
    return L.last(this._log);
  }
  _restore(pos: number, backward: boolean): UndoSnapshot {
    const record = this._log[pos];
    console.log("UNDO: Restore", { record: { ...record }, pos, backward });

    if (record.changes.changes.length > 0) {
      const newChanges = undoChangesAndResolveConflicts(
        this.site,
        this.recorder,
        this.summary,
        record.changes.changes
      );
      record.changes = newChanges;

      for (const component of this.site.components) {
        trackComponentRoot(component);
        trackComponentSite(component, this.site);
      }
      if (record.changes.changes.length > 0) {
        logChangedNodes(
          "Changed nodes by restore:",
          record.changes.changes,
          false
        );
      }
    }

    return {
      site: this.site,
      view: this._log[pos + (backward ? -1 : 0)].view,
      changes: record.changes,
    };
  }

  /**
   * Returns true if the two views are "equivalent" -- either exactly the same,
   * or
   * `prev` has nextFocusedTpl set, and `next` has that same tpl as
   * focusedSelectable.
   */
  private isViewEquivalent(prev: ViewStateSnapshot, next: ViewStateSnapshot) {
    function valsEq(v1: ValNode | undefined, v2: ValNode | undefined) {
      if (v1 instanceof ValNode && v2 instanceof ValNode) {
        return v1.key === v2.key;
      } else {
        return v1 === v2;
      }
    }

    function componentFramesEq(
      f1: ComponentVariantFrame | undefined,
      f2: ComponentVariantFrame | undefined
    ) {
      return f1 && f2 ? f1.equals(f2) : f1 === f2;
    }

    function componentCtxEq(
      c1: ComponentCtx | undefined,
      c2: ComponentCtx | undefined
    ) {
      if (c1 && c2) {
        return (
          c1.component() === c2.component() &&
          c1.tplComponent() === c2.tplComponent() &&
          valsEq(c1.valComponent(), c2.valComponent())
        );
      } else {
        return c1 === c2;
      }
    }

    function componentStacksEq(
      s1: ComponentVariantFrame[] | undefined,
      s2: ComponentVariantFrame[] | undefined
    ) {
      return s1 && s2
        ? L.zip(s1, s2).every(([f1, f2]) => componentFramesEq(f1, f2))
        : s1 === s2;
    }

    function variantContextsEq() {
      return (
        componentCtxEq(prev.currentComponentCtx, next.currentComponentCtx) &&
        componentStacksEq(prev.vcComponentStack, next.vcComponentStack)
      );
    }

    function selectablesEq(
      s1: Selectable | undefined,
      s2: Selectable | undefined
    ) {
      if (s1 && s2) {
        // Nothing fancy, the "normal" situation where something is selected in both prev and next
        if (s1 instanceof ValNode && s2 instanceof ValNode) {
          return valsEq(s1, s2);
        } else if (s1 instanceof SlotSelection && s2 instanceof SlotSelection) {
          // Both are SlotSelections
          if (s1.slotParam !== s2.slotParam) {
            return false;
          }

          // First compare by val
          if (s1.val && s2.val && valsEq(s1.val, s2.val)) {
            return true;
          }
          // If ValComponent not filled in for both, then compare by Tpl
          return s1.getTpl() === s2.getTpl();
        } else {
          return false;
        }
      } else {
        return s1 === s2;
      }
    }

    function focusedEq() {
      if (
        prev.focusedArena !== next.focusedArena ||
        prev.focusedFrame !== next.focusedFrame ||
        prev.focusedOnFrame !== next.focusedOnFrame
      ) {
        return false;
      }

      // The focused arena and frame are equal. Is the focused item equal?
      if (next.focusedSelectable === prev.focusedSelectable) {
        // Focusing on the same element, just check for different clones
        return prev.vcFocusedCloneKey === next.vcFocusedCloneKey;
      }
      if (
        prev.nextFocusedTpl &&
        next.focusedSelectable &&
        next.focusedSelectable instanceof ValNode &&
        next.focusedSelectable.tpl === prev.nextFocusedTpl
      ) {
        // This is where the prev.nextFocusedTpl is for the same tpl as next.focusedSelectable;
        // meaning, in prev, we created a new node and set it as nextFocusedTpl, and in next,
        // we've rendered the new node and have it as focusedSelectable.
        return true;
      }
      if (
        next.nextFocusedTpl &&
        prev.focusedSelectable &&
        prev.focusedSelectable instanceof ValNode &&
        prev.focusedSelectable.tpl === next.nextFocusedTpl
      ) {
        // This is when the selected element changes to hidden, because prev.focusedSelectable
        // is only updated and unset when updating Ctx after re-rendering.
        return true;
      }
      const prevSelectable = prev.focusedSelectable;
      const nextSelectable = next.focusedSelectable;
      return selectablesEq(prevSelectable, nextSelectable);
    }

    // There is a moment between when the ArenaFrame is created and when the
    // associated ViewCtx is created, during which focusedFrame() can be set
    // but without focusedViewCtx(). We want to treat these as equivalent
    // and ultimately swap in the snapshot in which the ViewCtx exists, so
    // that:
    //
    // - when we undo to this snapshot, we restore that focusedViewCtx.
    // - once the frame finishes loading, focusedViewCtx() is patched up,
    //   but we don't want to treat that as a new different selection.
    //
    // In this case, we also shortcut variantContextsEq, since the variants will
    // definitely be "different" (since the ViewCtx doesn't exist at all in
    // prev).
    function focusedNewFrame() {
      return (
        prev.focusedOnFrame &&
        next.focusedOnFrame &&
        prev.focusedOnFrame === next.focusedOnFrame &&
        !prev.focusedFrame &&
        next.focusedFrame
      );
    }

    return focusedNewFrame() || (focusedEq() && variantContextsEq());
  }

  appendChangesToLastRecord(record: UndoRecord) {
    const cur = this._log[this._nextInsertPos - 1];
    if (
      record.changes.changes.length === 0 &&
      this.isViewEquivalent(cur.view, record.view)
    ) {
      // No changes to append
      return;
    }
    cur.view = record.view;
    assert(this.canUndo(), "There's no record to append new changes");
    console.log("UNDO: Appending new changes", record);
    this._log[this._nextInsertPos - 1].changes = mergeRecordedChanges(
      this._log[this._nextInsertPos - 1].changes,
      record.changes
    );
    if (record.changes.changes.length > 0) {
      const recordsToDelete = this._log.length - this._nextInsertPos;
      this._log.splice(this._nextInsertPos, recordsToDelete);
    }
  }

  record(record: UndoRecord) {
    const cur = this._log[this._nextInsertPos - 1];
    if (
      cur &&
      record.changes.changes.length === 0 &&
      this.isViewEquivalent(cur.view, record.view)
    ) {
      // The new snapshot has the same view as the current snapshot.  We save the new
      // view and avoid creating a new record.  We save the new view because
      // the current view may be waiting for a tpl to be focused (nextFocusedTpl is set),
      // and the new view may have it focused (focusedSelectable is set).
      cur.view = record.view;
      return;
    }
    console.log("UNDO: New record", record);
    // Normally, when we record(), we "blow away" the undo log past the insertion pos.
    // For example, if we [undo, undo, undo, perform-action], then we
    // can no longer "redo". the things we undid.
    //
    // However, we make an exception here when we are recording view-only records
    // (no site changes).  That's because if we do [undo, undo, undo, select], it's
    // pretty harsh to blow away the redo log.  In that case, we just insert the
    // select record without blowing away the rest of the redo log.
    const recordsToDelete =
      record.changes.changes.length > 0
        ? this._log.length - this._nextInsertPos
        : 0;
    this._log.splice(this._nextInsertPos, recordsToDelete, record);
    this._nextInsertPos += 1;
  }
  undo() {
    assert(this.canUndo(), () => "Can't undo");
    this._nextInsertPos -= 1;
    try {
      return this._restore(this._nextInsertPos, true);
    } catch (err) {
      this._nextInsertPos += 1;
      throw err;
    }
  }
  redo() {
    assert(this.canRedo(), () => "Can't redo");
    this._nextInsertPos += 1;
    try {
      return this._restore(this._nextInsertPos - 1, false);
    } catch (err) {
      this._nextInsertPos -= 1;
      throw err;
    }
  }
  canUndo() {
    return this._nextInsertPos > 1;
  }
  canRedo() {
    return this._nextInsertPos < this._log.length;
  }
}
