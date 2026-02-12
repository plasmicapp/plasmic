import { ServerQueryResult } from "../types";
import { mapRecordEntries } from "../utils";
import { resolveParams, StatefulQueryResult } from "./common";
import { makeQueryCacheKey } from "./makeQueryCacheKey";
import { PlasmicQuery, PlasmicQueryResult } from "./types";

/**
 * Executes all queries and returns the query data keyed by cache key.
 *
 * Example codegen:
 *
 * export function create$Queries() {
 *   return createDollarQueries(["result", "dep"]);
 * }
 * type QueryName = keyof ReturnType<typeof create$Queries>;
 * export function createQueries(
 *   $ctx: Record<string, any>,
 *   $queries: Record<QueryName, PlasmicQueryResult>,
 * ) {
 *   return {
 *     result: {
 *       id: "plus",
 *       fn: (a, b) => a + b,
 *       execParams: () => [1, $queries.dep.data],
 *     },
 *     dep: {
 *       id: "times",
 *       fn: (a, b) => a * b,
 *       execParams: () => [2, 3],
 *     },
 *   }
 * }
 *
 * export async function ServerComponent() {
 *   const $ctx = useDataEnv();
 *   const $queries = createDollarQueries();
 *   const queries = createQueries($ctx, $queries);
 *   const prefetchedCache = await executePlasmicQueries($queries, queries);
 *   return (
 *     <PlasmicQueryDataProvider prefetchedCache={prefetchedCache}>
 *       <ClientComponent />
 *     </PlasmicQueryDataProvider>
 *   );
 * }
 */
export async function executePlasmicQueries<QueryName extends string>(
  $queries: Record<QueryName, PlasmicQueryResult>,
  queries: Record<QueryName, PlasmicQuery>
): Promise<{ [cacheKey: string]: unknown }> {
  const doneQueryResults = await Promise.all(
    mapRecordEntries(
      (_queryName, $query, query) => {
        return executePlasmicQuery($query as StatefulQueryResult, query);
      },
      $queries,
      queries
    )
  );

  return Object.fromEntries(
    Object.values(doneQueryResults).map(($query) => [$query.key, $query.data])
  );
}

export async function executePlasmicQuery<T>(
  $query: StatefulQueryResult<T>,
  query: PlasmicQuery<(...args: unknown[]) => Promise<T>>
): Promise<PlasmicQueryResult<T> & { current: { state: "done" } }> {
  if ($query.current.state === "loading" || $query.current.state === "done") {
    return $query.getDoneResult();
  }

  do {
    const paramsResult = resolveParams(query.execParams);
    switch (paramsResult.status) {
      case "blocked": {
        try {
          await paramsResult.promise;
        } catch {
          // The blocked param may error, but for simplicity,
          // we loop and try resolving params again.
        }
        continue;
      }
      case "ready": {
        const cacheKey = makeQueryCacheKey(
          query.id,
          paramsResult.resolvedParams
        );
        $query.loadingPromise(
          cacheKey,
          query.fn(...paramsResult.resolvedParams)
        );
        return $query.getDoneResult();
      }
      case "error": {
        $query.rejectPromise(null, paramsResult.error);
        throw paramsResult.error;
      }
    }
  } while (true);
}

/** @deprecated */
class PlasmicUndefinedServerError extends Error {
  plasmicType: "PlasmicUndefinedServerError";
  constructor(msg?: string) {
    super(msg);
    this.plasmicType = "PlasmicUndefinedServerError";
  }
}

/** @deprecated */
function isPlasmicUndefinedServerError(
  x: any
): x is PlasmicUndefinedServerError {
  return (
    !!x &&
    typeof x === "object" &&
    (x as any).plasmicType === "PlasmicUndefinedServerError"
  );
}

/** @deprecated */
export function mkPlasmicUndefinedServerProxy<T>(): ServerQueryResult<T> {
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
    ) as T,
    isLoading: true,
  };
}

/**
 * Executes a server query, returning either the result of the query or a
 * PlasmicUndefinedServerProxy if the query depends on data that is not yet ready
 * @deprecated
 */
export async function executeServerQuery<F extends (...args: any[]) => any>(
  query: PlasmicQuery<F>
): Promise<ServerQueryResult<ReturnType<F>>> {
  const resolvedParams = resolveServerParams(query.execParams);
  if (isPlasmicUndefinedServerError(resolvedParams)) {
    return mkPlasmicUndefinedServerProxy();
  }
  return { data: await query.fn(...resolvedParams), isLoading: false };
}

/** @deprecated */
function resolveServerParams<F extends (...args: any[]) => any>(
  params: () => Parameters<F>
): Parameters<F> | PlasmicUndefinedServerError {
  try {
    return params();
  } catch (err) {
    if (isPlasmicUndefinedServerError(err)) {
      return err;
    } else {
      throw err;
    }
  }
}
