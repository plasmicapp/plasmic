/** @internal */
export interface PlasmicQuery<
  F extends (...args: any[]) => Promise<unknown> = (
    ...args: any[]
  ) => Promise<unknown>
> {
  fn: F;
  args: ContextFn<Parameters<F>>;
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

/**
 * Context during execution.
 * @internal
 */
export type QueryExecutionContext = {
  $ctx: Record<string, unknown>;
  $props: Record<string, unknown>;
  $state: Record<string, unknown>;
  $q: Record<string, PlasmicQueryResult>;
};

/**
 * A function that takes the execution context and returns a value.
 * Used for all dynamic expressions in the query tree (args, collectionExpr, visibilityExpr, data, propsContext values).
 */
export type ContextFn<R> = (ctx: QueryExecutionContext) => R;

/** @internal */
export interface QueryComponentNode {
  type: "component";
  queries: Record<string, PlasmicQuery>;
  propsContext: Record<string, ContextFn<unknown>>;
  /**
   * Lazily initializes $state proxy for this component.
   */
  stateSpecs: $StateSpec[];
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

export interface ExecutePlasmicQueriesResult {
  /** All queries, including nested, by query cache key hash. Passed to PlasmicRootProvider */
  cache: Record<string, unknown>;
  /** Root component query results keyed by query name. */
  queries: Record<string, PlasmicQueryResult>;
}

// TODO: Move $StateSpec to common package of data-sources and react-web?

export interface $StateSpec<T = any> {
  path: string;
  initFunc?: (
    env: QueryExecutionContext & {
      /** @deprecated This field is here to conform to react-web's $StateSpec. */
      $queries: Record<string, any>;
      /** @deprecated This field is here to conform to react-web's $StateSpec. */
      $refs: Record<string, any>;
    }
  ) => T;
  initVal?: T;
  type: "private" | "readonly" | "writable";
  valueProp?: string;
}
