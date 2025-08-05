import { arrayReversed } from "@/wab/shared/collections";
import { arrayEq, ensure, removeWhere } from "@/wab/shared/common";
import { ModelChange } from "@/wab/shared/core/observable-model";
import { range } from "lodash";

export function undoChanges(changes: ModelChange[]) {
  for (const change of arrayReversed(ensure(changes))) {
    const lastNode = change.changeNode;
    const { inst, field } = lastNode;
    if (change.type === "array-splice") {
      if (
        arrayEq(
          change.object.slice(change.index, change.index + change.added.length),
          change.added
        )
      ) {
        change.object.splice(
          change.index,
          change.added.length,
          ...change.removed
        );
      } else {
        // If the array has changed (e.g. by someone else) it can be tricky
        // to undo the operation. We'll try to remove all elements that have
        // been added previously by the change, and add the removed elements
        // at the provided index.
        removeWhere(
          change.object,
          (v) => change.added.includes(v) || change.removed.includes(v)
        );
        change.object.splice(
          Math.min(change.index, change.object.length),
          0,
          ...change.removed
        );
      }
    } else if (change.type === "array-update") {
      if (change.object[change.index] === change.newValue) {
        change.object[change.index] = change.oldValue;
      } else {
        // Index is stale (probably due to concurrent editing). We need to
        // resolve it somehow. If there's just one index in the array with the
        // updated value, maybe the desired position got shifted; otherwise,
        // maybe the value was replaced by another one, but we still want to
        // update the same index; otherwise, assume the value has been deleted
        // and don't update it.
        // TODO: We might need a better approach.
        const indexes = range(change.object.length).filter(
          (v) => v === change.newValue
        );
        // We might have several indexes, e.g., if it's an array of strings (but
        // hopefully at most one when it's an array of instances).
        if (indexes.length === 1) {
          // Assume the desired element got shifted
          change.object[indexes[0]] = change.oldValue;
        } else if (change.object[change.index] != null) {
          // Since the value is not null (not out of bounds), we might want
          // to asusme that someone else just updated the same position and not
          // deleted it.
          change.object[change.index] = change.oldValue;
        }
      }
    } else if (change.type === "obj-add") {
      delete inst[field][change.key];
    } else if (change.type === "obj-update") {
      inst[field][change.key] = change.oldValue;
    } else if (change.type === "obj-delete") {
      inst[field][change.key] = change.oldValue;
    } else if (change.type === "update") {
      inst[field] = change.oldValue;
    } else {
      throw new Error(`Unknown change type ${(change as any).type}`);
    }
  }
}
