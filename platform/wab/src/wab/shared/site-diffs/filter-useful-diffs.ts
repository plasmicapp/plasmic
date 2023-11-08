import { ChangeLogEntry } from ".";
import { isBuiltinCodeComponentName } from "../code-components/builtin-code-components";

export function filterUsefulDiffs(diffs: ChangeLogEntry[]) {
  return diffs.filter((diff) => {
    if (
      diff.newValue?.type === "Component" &&
      diff.newValue.componentType === "frame"
    ) {
      return false;
    }
    if (
      diff.oldValue?.type === "Component" &&
      diff.oldValue.componentType === "frame"
    ) {
      return false;
    }
    if (
      diff.parentComponent &&
      diff.parentComponent !== "global" &&
      diff.parentComponent.componentType === "frame"
    ) {
      return false;
    }
    if (
      diff.newValue?.type === "Component" &&
      isBuiltinCodeComponentName(diff.newValue.name ?? "")
    ) {
      return false;
    }
    if (
      diff.oldValue?.type === "Component" &&
      isBuiltinCodeComponentName(diff.oldValue.name ?? "")
    ) {
      return false;
    }
    return true;
  });
}
