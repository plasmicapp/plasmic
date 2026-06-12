/**
 * @internal Make a cache key for a query.
 *
 * Wrapped in `.$.` delimiters to match data op cache keys, so invalidation can match
 * the id via `matchesQueryCacheKey` without colliding with other SWR cache keys.
 */
export function makeQueryCacheKey(id: string, params: any[]) {
  return `$q.$.${id}.$.${safeStableStringify(params)}`;
}

/**
 * Returns whether `cacheKey` is invalidated by `invalidationKey`. Works for both server
 * query cache keys (built by `makeQueryCacheKey`) and data op cache keys.
 */
export function matchesQueryCacheKey(
  cacheKey: string,
  invalidationKey: string
) {
  return cacheKey.includes(`.$.${invalidationKey}.$.`);
}

const shortPlasmicPrefix = "ρ";

function safeStableStringify(unstableValue: any): string {
  // Sort first to ensure object key order doesn't matter.
  const stableValue = sortObjectsDeep(unstableValue, new Map());

  // JSON.stringify with a few changes:
  // 1) special values replaced with something unique
  // 2) references are not duplicated (and cycles don't error)
  const visitedPaths = new Map<object, string>();
  return JSON.stringify(stableValue, function (key, value) {
    switch (typeof value) {
      case "undefined":
        return `${shortPlasmicPrefix}:UNDEFINED`;
      case "function":
        return `${shortPlasmicPrefix}:FUNCTION:${value.name}`;
      case "symbol":
        return `${shortPlasmicPrefix}:SYMBOL:${value.description}`;
      case "bigint":
        return value.toString();
      case "object":
        if (value !== null) {
          const cyclePath = visitedPaths.get(value);
          if (cyclePath) {
            return `${shortPlasmicPrefix}:REF:${cyclePath}`;
          }

          // `this` is bound to the parent object
          const parentPath = visitedPaths.get(this);
          const valuePath =
            parentPath === undefined ? "$" : `${parentPath}.${key}`;
          visitedPaths.set(value, valuePath);
        }
        return value;
      default:
        return value;
    }
  });
}

function sortObjectsDeep(value: any, visitedObjects: Map<object, any>): any {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // don't duplicate work and retain reference structure
  const visitedValue = visitedObjects.get(value);
  if (visitedValue) {
    return visitedValue;
  }

  if (typeof value.toJSON === "function") {
    return sortObjectsDeep(value.toJSON(), visitedObjects);
  }

  if (Array.isArray(value)) {
    // create new value early to avoid infinite recursion
    const newArr = [] as any;
    visitedObjects.set(value, newArr);

    // recurse into array items
    value.forEach((item, key) => {
      newArr[key] = sortObjectsDeep(item, visitedObjects);
    });
    return newArr;
  } else {
    // create new value early to avoid infinite recursion
    const newObj = {} as any;
    visitedObjects.set(value, newObj);

    // sort and recurse into object values
    Object.keys(value)
      .sort()
      .forEach((key) => {
        newObj[key] = sortObjectsDeep(value[key], visitedObjects);
      });
    return newObj;
  }
}
