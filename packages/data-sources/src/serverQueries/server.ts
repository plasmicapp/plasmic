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
