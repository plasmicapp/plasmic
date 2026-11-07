import { instUtil } from "@/wab/shared/model/InstUtil";
import { isWeakRefField } from "@/wab/shared/model/model-meta";
import { isEqual, mapValues } from "lodash";

/** Compare stored fields, excluding observer metadata and referenced owners. */
export function modelSnapshot(value: unknown, weak = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => modelSnapshot(item, weak));
  }
  if (instUtil.isObjInst(value)) {
    if (weak) {
      return { ref: value.uid };
    }
    return Object.fromEntries(
      instUtil
        .allInstFields(value)
        .map((field) => [
          field.name,
          modelSnapshot(value[field.name], isWeakRefField(field)),
        ]),
    );
  }
  if (value && typeof value === "object") {
    return mapValues(value, (item) => modelSnapshot(item, weak));
  }
  return value;
}

export interface ModelTarget {
  exists: () => boolean;
  /** Without it, only deletion blocks a save. */
  read?: () => unknown;
}

export function captureModelTarget(target: ModelTarget) {
  const read = () => target.read && modelSnapshot(target.read());
  let baseline = read();
  return {
    check: () =>
      !target.exists()
        ? "The original destination was deleted. Cancel to discard this draft."
        : !isEqual(read(), baseline)
          ? "The original value changed outside this editor. Cancel and reopen it to use the new value."
          : undefined,
    accept: () => {
      baseline = read();
    },
  };
}
