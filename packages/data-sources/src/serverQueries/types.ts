export interface PlasmicQuery<
  F extends (...args: unknown[]) => Promise<unknown> = (
    ...args: unknown[]
  ) => Promise<unknown>
> {
  fn: F;
  execParams: () => Parameters<F>;
  id: string;
}

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
