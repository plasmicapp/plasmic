/** @internal */
export interface PlasmicQuery<
  F extends (...args: unknown[]) => Promise<unknown> = (
    ...args: unknown[]
  ) => Promise<unknown>
> {
  fn: F;
  execParams: () => Parameters<F>;
  id: string;
}

/** @internal */
export interface PlasmicQueryResult<T = unknown> {
  /**
   * Returns the key if params have resolved.
   */
  key: string | null;
  /**
   * Returns the data if the query resolved.
   * Throws the error if the query rejected.
   * Throws PlasmicUndefinedDataErrorPromise if the query params are not ready.
   */
  data: T;
  isLoading: boolean;
}

export interface QueryExecutionContext {
  $props: Record<string, unknown>;
  $ctx: Record<string, unknown>;
  $state: Record<string, unknown>;
  $q: Record<string, PlasmicQueryResult>;
  $scopedItemVars: Record<string, unknown>;
}

/**
 * A function that takes the execution context and returns a value.
 * Used for all dynamic expressions in the query tree (args, collectionExpr, visibilityExpr, data, propsContext values).
 */
export type ContextFn<R> = (ctx: QueryExecutionContext) => R;

export interface SerializedServerQuery {
  // cache key identifier
  id: string;
  // direct function reference (closed over from module scope)
  fn: (...args: unknown[]) => Promise<unknown>;
  // function returning ordered args evaluated against runtime context
  args: ContextFn<unknown[]>;
}

/** @internal */
export interface QueryComponentNode {
  type: "component";
  queries: Record<string, SerializedServerQuery>;
  propsContext: Record<string, ContextFn<unknown>>;
  children: QueryNode[];
}

export type SerializedServerRenderingConfig = boolean;

/** @internal */
export interface QueryCodeComponentNode {
  type: "codeComponent";
  propsContext: Record<string, ContextFn<unknown>>;
  serverRenderingConfig?: SerializedServerRenderingConfig;
  children: QueryNode[];
}

/** @internal */
export interface QueryDataProviderNode {
  type: "dataProvider";
  name: string;
  data: ContextFn<unknown>;
  children: QueryNode[];
}

/** @internal */
export interface QueryVisibilityNode {
  type: "visibility";
  visibilityExpr: ContextFn<unknown>;
  children: QueryNode[];
}

/** @internal */
export interface QueryRepeatedNode {
  type: "repeated";
  collectionExpr: ContextFn<unknown>;
  itemName: string;
  indexName: string;
  children: QueryNode[];
}

/** @internal */
export type QueryNode =
  | QueryComponentNode
  | QueryCodeComponentNode
  | QueryRepeatedNode
  | QueryDataProviderNode
  | QueryVisibilityNode;

/** @internal */
export type QueryExecutionInitialContext = Pick<
  QueryExecutionContext,
  "$props" | "$ctx"
>;

export interface ExecutePlasmicQueriesResult {
  /** All queries, including nested, by query cache key hash. Passed to PlasmicRootProvider */
  cache: Record<string, unknown>;
  /** Root component query results keyed by query name. */
  queries: Record<string, PlasmicQueryResult>;
}
