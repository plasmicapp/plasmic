interface GlobalWithNextLocalId {
  __PLASMIC_NEXT_LOCAL_ID?: number;
}

/**
 * Returns an ID that is locally unique within a process.
 *
 * This function works even if this function's module is reloaded within the same process.
 * It depends on setting state in the environment's `globalThis` variable.
 */
export function uniqueLocalId(): number {
  const global = globalThis as GlobalWithNextLocalId;
  const localId = global.__PLASMIC_NEXT_LOCAL_ID
    ? global.__PLASMIC_NEXT_LOCAL_ID
    : 1;
  global.__PLASMIC_NEXT_LOCAL_ID = localId + 1;
  return localId;
}
