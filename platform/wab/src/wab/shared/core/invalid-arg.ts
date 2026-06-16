import { Param } from "@/wab/shared/model/classes";

export enum ValidationType {
  Required,
  Custom,
}

export interface InvalidArg {
  validationType: ValidationType;
  /** Display label of the prop/param that is invalid. */
  displayLabel: string;
  message?: string;
}

/**
 * An {@link InvalidArg} for a component prop, tied to the component `Param`
 * it was validated against (e.g. so the canvas can highlight that param).
 */
export interface InvalidArgMeta extends InvalidArg {
  param: Param;
}

export function getInvalidArgErrorMessage(invalidArg: InvalidArg): string {
  return invalidArg.validationType === ValidationType.Required
    ? "Required"
    : invalidArg.message ?? "Invalid Value";
}

/**
 * Key identifying a prop editor row in an `invalidArgs` record: the row's
 * control path (e.g. `["argName", "fieldName"]`) joined with ".".
 */
export function mkInvalidArgKey(path: readonly (string | number)[]): string {
  return path.join(".");
}

/**
 * Keys component-prop validation errors by their row's control path (the
 * param's variable name), for `PropValueEditorContextData.invalidArgs`.
 */
export function mkInvalidArgsRecord(
  invalidArgs: readonly InvalidArgMeta[]
): Record<string, InvalidArg> {
  return Object.fromEntries(
    invalidArgs.map((ia) => [mkInvalidArgKey([ia.param.variable.name]), ia])
  );
}
