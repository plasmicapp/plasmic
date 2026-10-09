export type Properties = { [key: string]: any };

/** Shallow merge; later properties replace earlier values, including undefined. */
export function mergeProperties(
  ...sources: (Properties | undefined)[]
): Properties | undefined {
  const merged: Properties = Object.assign({}, ...sources);
  return Object.keys(merged).length > 0 ? merged : undefined;
}
