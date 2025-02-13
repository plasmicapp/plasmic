/**
 * This returns either:
 * * The resolved params, if they are available.
 * * PlasmicUndefinedServerError, if when trying to evaluate the params,
 *   we encounter a PlasmicUndefinedServerError, so this operation cannot be
 *   performed until that dependency is resolved.
 * * Throws an error if the params function throws a normal error.
 */
export function resolveParams<F extends (...args: any[]) => any, E>(
  params: () => Parameters<F>,
  errorFn: (err: unknown) => E
): Parameters<F> | E {
  try {
    return params();
  } catch (err) {
    return errorFn(err);
  }
}
