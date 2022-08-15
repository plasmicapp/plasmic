import get from "dlv";
import { dset as set } from "dset";
import { $State } from ".";

export function generateStateOnChangeProp(
  $state: $State,
  stateName: string,
  dataReps: number[]
): (val: any, path: (string | number)[]) => void {
  return (val, path) => set($state, [stateName, ...dataReps, ...path], val);
}

/**
 * This function generate the state value prop for repeated states
 * Example:
 *   - parent[][].counter[].count
 * We need to pass `parent[index1][index2].counter to the child component
 */
export function generateStateValueProp(
  $state: $State,
  path: (string | number)[] // ["parent", 0, 1, "counter"]
) {
  return get($state, path);
}
