import { mergeSane } from "@/wab/shared/common";

/**
 * Generic properties object type that can be used for events
 */
export type Properties = { [key: string]: any };

export function mergeProperties(
  p1?: Properties,
  p2?: Properties,
  p3?: Properties
): Properties | undefined {
  const merged = mergeSane(p1, p2, p3);
  if (merged && Object.keys(merged).length > 0) {
    return merged;
  } else {
    return undefined;
  }
}
