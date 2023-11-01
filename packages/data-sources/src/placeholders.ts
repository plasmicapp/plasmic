const PLASMIC_UNDEFINED = "__PLASMIC_UNDEFINED";

function addPlaceholders(val: any) {
  return val === undefined ? PLASMIC_UNDEFINED : val;
}

export function addPlaceholdersToUserArgs(
  userArgs: Record<string, any> | undefined
) {
  if (!userArgs) {
    return userArgs;
  }
  Object.entries(userArgs).forEach(([key, val]) => {
    userArgs[key] = Array.isArray(val)
      ? val.map((v) => addPlaceholders(v))
      : addPlaceholders(val);
  });
  return userArgs;
}
