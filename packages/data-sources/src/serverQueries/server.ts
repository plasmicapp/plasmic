import { ServerQuery, ServerQueryResult } from "../types";

class PlasmicUndefinedServerError extends Error {
  plasmicType: "PlasmicUndefinedServerError";
  constructor(msg?: string) {
    super(msg);
    this.plasmicType = "PlasmicUndefinedServerError";
  }
}

function isPlasmicUndefinedServerError(
  x: any
): x is PlasmicUndefinedServerError {
  return (
    !!x &&
    typeof x === "object" &&
    (x as any).plasmicType === "PlasmicUndefinedServerError"
  );
}

export function mkPlasmicUndefinedServerProxy() {
  return {
    data: new Proxy(
      {},
      {
        get: (_, prop) => {
          if (prop === "isUndefinedServerProxy") {
            return true;
          } else if (prop === "then") {
            return undefined;
          }
          throw new PlasmicUndefinedServerError("Data is not available yet");
        },
      }
    ),
    isLoading: true,
  };
}

/**
 * This returns either:
 * * The resolved params, if they are available.
 * * PlasmicUndefinedServerError, if when trying to evaluate the params,
 *   we encounter a PlasmicUndefinedServerError, so this operation cannot be
 *   performed until that dependency is resolved.
 * * Throws an error if the params function throws a normal error.
 */
function resolveParams(params: () => any) {
  try {
    return params();
  } catch (err) {
    if (isPlasmicUndefinedServerError(err)) {
      return err;
    }
    throw err;
  }
}

/**
 * Executes a server query, returning either the result of the query or a
 * PlasmicUndefinedServerProxy if the query depends on data that is not yet ready
 */
export async function executeServerQuery<F extends (...args: any[]) => any>(
  serverQuery: ServerQuery<F>
): Promise<ServerQueryResult<ReturnType<F>> | ServerQueryResult<{}>> {
  const resolvedParams = resolveParams(serverQuery.execParams);
  if (isPlasmicUndefinedServerError(resolvedParams)) {
    return mkPlasmicUndefinedServerProxy();
  }
  return { data: await serverQuery.fn(...resolvedParams), isLoading: false };
}
