export { usePlasmicQueries as unstable_usePlasmicQueries } from "./serverQueries/client";
export {
  StatefulQueryResult as _StatefulQueryResult,
  createDollarQueries as unstable_createDollarQueries,
  wrapDollarQueriesForMetadata as unstable_wrapDollarQueriesForMetadata,
  type StateListener as _StateListener,
  type StatefulQueryState as _StatefulQueryState,
} from "./serverQueries/common";
export { makeQueryCacheKey } from "./serverQueries/makeQueryCacheKey";
export { executePlasmicQueries as unstable_executePlasmicQueries } from "./serverQueries/server";
export type { PlasmicQuery, PlasmicQueryResult } from "./serverQueries/types";

// exports below are deprecated and will be removed in major version bump

export { usePlasmicDataConfig } from "@plasmicapp/query";
export { Fetcher, FetcherMeta } from "./components/Fetcher";
export type { FetcherProps } from "./components/Fetcher";
export { executePlasmicDataOp } from "./executor";
export {
  deriveFieldConfigs,
  normalizeData,
  useNormalizedData,
} from "./helpers";
export type { BaseFieldConfig, NormalizedData, QueryResult } from "./helpers";
export { useDependencyAwareQuery } from "./hooks/useDependencyAwareQuery";
export {
  makeCacheKey,
  usePlasmicDataMutationOp,
  usePlasmicDataOp,
  usePlasmicInvalidate,
} from "./hooks/usePlasmicDataOp";
export type {
  ClientQueryResult,
  DataOp,
  DataSourceSchema,
  ManyRowsResult,
  Pagination,
  SingleRowResult,
  TableFieldSchema,
  TableFieldType,
  TableSchema,
} from "./types";
