import { arrayReversed } from "@/wab/shared/collections";
import { arrayEq, ensure } from "@/wab/shared/common";
import { ModelChange } from "@/wab/shared/core/observable-model";
import { omit, range } from "lodash";

/**
 * Undoes `changes`, most recent first. A collection change is undone by
 * assigning a new collection made from the field's current one, which may
 * have changed since (e.g. by concurrent edits).
 */
export function undoChanges(changes: ModelChange[]) {
  for (const change of arrayReversed(ensure(changes))) {
    const lastNode = change.changeNode;
    const { inst, field } = lastNode;
    if (change.type === "array-splice") {
      const arr: readonly unknown[] = inst[field];
      if (
        arrayEq(
          arr.slice(change.index, change.index + change.added.length),
          change.added,
        )
      ) {
        inst[field] = [
          ...arr.slice(0, change.index),
          ...change.removed,
          ...arr.slice(change.index + change.added.length),
        ];
      } else {
        // If the array has changed (e.g. by someone else) it can be tricky
        // to undo the operation. We'll try to remove all elements that have
        // been added previously by the change, and add the removed elements
        // at the provided index.
        const kept = arr.filter(
          (v) => !change.added.includes(v) && !change.removed.includes(v),
        );
        const index = Math.min(change.index, kept.length);
        inst[field] = [
          ...kept.slice(0, index),
          ...change.removed,
          ...kept.slice(index),
        ];
      }
    } else if (change.type === "array-update") {
      const arr: readonly unknown[] = inst[field];
      const setAt = (index: number) =>
        (inst[field] = arr.map((v, i) => (i === index ? change.oldValue : v)));
      if (arr[change.index] === change.newValue) {
        setAt(change.index);
      } else {
        // Index is stale (probably due to concurrent editing). We need to
        // resolve it somehow. If there's just one index in the array with the
        // updated value, maybe the desired position got shifted; otherwise,
        // maybe the value was replaced by another one, but we still want to
        // update the same index; otherwise, assume the value has been deleted
        // and don't update it.
        // TODO: We might need a better approach.
        const indexes = range(arr.length).filter(
          (i) => arr[i] === change.newValue,
        );
        // We might have several indexes, e.g., if it's an array of strings (but
        // hopefully at most one when it's an array of instances).
        if (indexes.length === 1) {
          // Assume the desired element got shifted
          setAt(indexes[0]);
        } else if (arr[change.index] != null) {
          // Since the value is not null (not out of bounds), we might want
          // to asusme that someone else just updated the same position and not
          // deleted it.
          setAt(change.index);
        }
      }
    } else if (change.type === "obj-add") {
      inst[field] = omit(inst[field], change.key);
    } else if (change.type === "obj-update" || change.type === "obj-delete") {
      inst[field] = { ...inst[field], [change.key]: change.oldValue };
    } else if (change.type === "update") {
      inst[field] = change.oldValue;
    } else {
      throw new Error(`Unknown change type ${(change as any).type}`);
    }
  }
}
